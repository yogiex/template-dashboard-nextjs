import "server-only";

import {
  applyCardinalityLimits,
  buildSeriesKey,
  CARDINALITY_LIMITS,
} from "@/features/observability/lib/cardinality";
import type { MetricEvent, MetricKind } from "@/features/observability/types";

/**
 * Store metrik in-memory untuk demo. Ditempel di `globalThis` supaya tidak ikut
 * ter-reset setiap kali Next.js mengevaluasi ulang modul (HMR di dev, atau
 * segment baru saat build).
 *
 * Batas keras: 5000 event + 2000 sample per histogram. Saat backend siap,
 * ganti dengan exporter OpenTelemetry/Prometheus dan hapus file ini.
 *
 * Dua lapis hardness tambahan:
 *
 * 1. Cardinality: setiap event melewati `applyCardinalityLimits()` sehingga
 *    nilai tag yang berlebih tidak akan membuat series baru tanpa batas.
 *    Event tetap tersimpan utuh, hanya tag-nya yang dilipat.
 * 2. Retensi: event yang lebih tua dari `retentionMs` (default 7 hari) dibuang
 *    secara periodik. Pruning berjalan berdasarkan penghitung push, bukan
 *    filter penuh di setiap `pushEvent()`, supaya biaya amortisasi tetap O(1).
 */

const MAX_EVENTS = 5_000;
const MAX_HISTOGRAM_SAMPLES = 2_000;

/** Default usia maksimum event yang disimpan di store. */
export const DEFAULT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

/** Pruning dijalankan setiap N kali push, bukan setiap push. */
const PRUNE_EVERY_PUSHES = 256;

type MetricStore = {
  events: MetricEvent[];
  counters: Map<string, number>;
  histograms: Map<string, number[]>;
  /** Series key unik per metrik; sumber kebenaran untuk batas cardinality. */
  seriesByMetric: Map<string, Set<string>>;
  pushCount: number;
  retentionMs: number;
};

const STORE_KEY = Symbol.for("template.metrics.store");

type GlobalWithStore = typeof globalThis & { [STORE_KEY]?: MetricStore };

/**
 * Isi field yang belum ada pada store yang dibuat versi modul sebelumnya.
 * HMR mempertahankan objek di `globalThis`, jadi bentuk store bisa tertinggal
 * satu versi.
 */
function hydrate(store: MetricStore): MetricStore {
  if (!store.seriesByMetric) {
    store.seriesByMetric = new Map();
  }

  if (!store.retentionMs) {
    store.retentionMs = DEFAULT_RETENTION_MS;
  }

  if (typeof store.pushCount !== "number") {
    store.pushCount = 0;
  }

  return store;
}

function getStore(): MetricStore {
  const globalStore = globalThis as GlobalWithStore;
  const existing = globalStore[STORE_KEY];

  if (existing) {
    return hydrate(existing);
  }

  const created: MetricStore = {
    events: [],
    counters: new Map(),
    histograms: new Map(),
    seriesByMetric: new Map(),
    pushCount: 0,
    retentionMs: DEFAULT_RETENTION_MS,
  };

  globalStore[STORE_KEY] = created;

  return created;
}

function getSeriesSet(store: MetricStore, metricName: string): Set<string> {
  const existing = store.seriesByMetric.get(metricName);

  if (existing) {
    return existing;
  }

  const created = new Set<string>();

  store.seriesByMetric.set(metricName, created);

  return created;
}

export type PushEventOptions = {
  /** Mengganti batas retensi store untuk pemanggilan ini dan seterusnya. */
  retentionMs?: number;
};

export function pushEvent(
  event: MetricEvent,
  options: PushEventOptions = {},
): void {
  const store = getStore();

  store.retentionMs = options.retentionMs ?? store.retentionMs;

  const series = getSeriesSet(store, event.name);
  const { tags, overflowKeys } = applyCardinalityLimits(event.tags, {
    metricName: event.name,
    existingSeries: series,
  });
  const stored: MetricEvent =
    overflowKeys.length > 0 ? { ...event, tags } : event;

  store.events.push(stored);

  if (store.events.length > MAX_EVENTS) {
    store.events.splice(0, store.events.length - MAX_EVENTS);
  }

  const seriesKey = buildSeriesKey(event.name, stored.tags);

  if (!series.has(seriesKey) && series.size < CARDINALITY_LIMITS.totalSeries) {
    series.add(seriesKey);
  }

  if (event.kind === "histogram") {
    const samples = store.histograms.get(event.name) ?? [];

    samples.push(event.value);

    if (samples.length > MAX_HISTOGRAM_SAMPLES) {
      samples.splice(0, samples.length - MAX_HISTOGRAM_SAMPLES);
    }

    store.histograms.set(event.name, samples);
  } else {
    store.counters.set(
      event.name,
      (store.counters.get(event.name) ?? 0) + event.value,
    );
  }

  store.pushCount += 1;

  if (store.pushCount % PRUNE_EVERY_PUSHES === 0) {
    pruneExpiredEvents();
  }
}

export type EventFilter = {
  name?: string;
  fromTimestamp?: number;
  toTimestamp?: number;
  actorId?: string;
  /** Semua pasangan key/value harus cocok (AND). */
  tags?: Record<string, string>;
};

function matchesTags(event: MetricEvent, tags: Record<string, string>): boolean {
  return Object.entries(tags).every(([key, value]) => event.tags[key] === value);
}

export function getEvents(filter: EventFilter = {}): MetricEvent[] {
  const { events } = getStore();

  return events.filter((event) => {
    if (filter.name && event.name !== filter.name) {
      return false;
    }

    if (filter.actorId && event.actorId !== filter.actorId) {
      return false;
    }

    if (filter.tags && !matchesTags(event, filter.tags)) {
      return false;
    }

    const timestamp = Date.parse(event.timestamp);

    if (filter.fromTimestamp !== undefined && timestamp < filter.fromTimestamp) {
      return false;
    }

    if (filter.toTimestamp !== undefined && timestamp > filter.toTimestamp) {
      return false;
    }

    return true;
  });
}

export function getEventsSince(metricName: string, sinceMs: number): MetricEvent[] {
  return getEvents({ name: metricName, fromTimestamp: Date.now() - sinceMs });
}

export function getCounters(): Record<string, number> {
  return Object.fromEntries(getStore().counters.entries());
}

export function getHistogram(name: string): number[] {
  return getStore().histograms.get(name) ?? [];
}

export function getTotalEvents(): number {
  return getStore().events.length;
}

export function getEarliestEvent(): MetricEvent | null {
  const { events } = getStore();

  return events[0] ?? null;
}

export function getKindTotal(kind: MetricKind): number {
  return getStore().events.filter((event) => event.kind === kind).length;
}

/**
 * Buang event yang melewati batas retensi. Mengembalikan jumlah event yang
 * dibuang. Counter kumulatif dan sample histogram tidak disentuh karena keduanya
 * sudah berupa agregat monotonic.
 */
export function pruneExpiredEvents(now: number = Date.now()): number {
  const store = getStore();
  const cutoff = now - store.retentionMs;
  const active: MetricEvent[] = [];
  let pruned = 0;

  for (const event of store.events) {
    if (Date.parse(event.timestamp) < cutoff) {
      pruned += 1;
      continue;
    }

    active.push(event);
  }

  if (pruned > 0) {
    store.events = active;
  }

  return pruned;
}

/** Jumlah series unik; tanpa argumen menjumlahkan seluruh metrik. */
export function getSeriesCount(metricName?: string): number {
  const { seriesByMetric } = getStore();

  if (metricName !== undefined) {
    return seriesByMetric.get(metricName)?.size ?? 0;
  }

  let total = 0;

  for (const series of seriesByMetric.values()) {
    total += series.size;
  }

  return total;
}

export function resetStore(): void {
  const store = getStore();

  store.events = [];
  store.counters.clear();
  store.histograms.clear();
  store.seriesByMetric.clear();
  store.pushCount = 0;
  store.retentionMs = DEFAULT_RETENTION_MS;
}
