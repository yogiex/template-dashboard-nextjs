import "server-only";

import { monitorEventLoopDelay } from "node:perf_hooks";
import type { IntervalHistogram } from "node:perf_hooks";

import {
  METRIC_NAMES,
  METRIC_UNITS,
} from "@/features/observability/lib/constants";
import { trackMetric } from "@/features/observability/lib/track";

/**
 * Metrik runtime proses Node.js (golden signals sisi host).
 *
 * Batasan yang sengaja dijaga:
 * - hanya menyebut nama metrik yang sudah terdaftar di `METRIC_NAMES`; tidak
 *   ada nama metrik baru yang dikarang di sini;
 * - semua sampling dibungkus `try/catch`. Instrumentation tidak boleh
 *   menjatuhkan proses, termasuk saat `process.cpuUsage()` gagal di platform
 *   tertentu;
 * - `process.cpu.user_ms` adalah counter monoton: nilainya tidak pernah turun
 *   dan selalu diemit sebagai akumulasi sejak proses start.
 */

export interface RuntimeSnapshot {
  eventLoopLagMeanMs: number;
  eventLoopLagP99Ms: number;
  heapUsedBytes: number;
  rssBytes: number;
  cpuUserMs: number;
  cpuSystemMs: number;
  uptimeSeconds: number;
  sampledAt: string;
}

/** Default 30 detik: cukup untuk tren, cukup murah untuk event store in-memory. */
const DEFAULT_INTERVAL_MS = 30_000;

/**
 * Batas bawah 1 detik. Interval yang lebih kecil hanya menambah noise pada
 * event loop, jadi nilai kecil tetap dijepit ke batas ini.
 */
const MIN_INTERVAL_MS = 1_000;

/** Resolusi monitor event loop; 20 ms cukup untuk melihat lag yang berarti. */
const EVENT_LOOP_RESOLUTION_MS = 20;

const NS_PER_MS = 1_000_000;

const STATE_KEY = Symbol.for("template.runtimeMetrics");

type RuntimeState = {
  timer: ReturnType<typeof setInterval> | null;
  histogram: IntervalHistogram | null;
  snapshot: RuntimeSnapshot | null;
  intervalMs: number;
};

type GlobalWithState = typeof globalThis & {
  [STATE_KEY]?: RuntimeState;
};

function getState(): RuntimeState {
  const globalState = globalThis as GlobalWithState;

  if (!globalState[STATE_KEY]) {
    globalState[STATE_KEY] = {
      timer: null,
      histogram: null,
      snapshot: null,
      intervalMs: DEFAULT_INTERVAL_MS,
    };
  }

  return globalState[STATE_KEY];
}

/** Angka NaN/Infinity tidak boleh masuk event store; dinormalisasi jadi 0. */
function toFiniteNumber(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;

  return Math.round(value * factor) / factor;
}

function toMilliseconds(nanoseconds: number): number {
  return round(toFiniteNumber(nanoseconds) / NS_PER_MS, 4);
}

/**
 * Baca satu sampel runtime. Pure-ish: hanya membaca API `process` dan
 * histogram event loop, tidak mengubah state aplikasi.
 */
export function collectRuntimeSample(): RuntimeSnapshot {
  const state = getState();
  const memory = process.memoryUsage();
  const cpu = process.cpuUsage();
  const histogram = state.histogram;

  return {
    eventLoopLagMeanMs: histogram ? toMilliseconds(histogram.mean) : 0,
    eventLoopLagP99Ms: histogram
      ? toMilliseconds(histogram.percentile(99))
      : 0,
    heapUsedBytes: toFiniteNumber(memory.heapUsed),
    rssBytes: toFiniteNumber(memory.rss),
    cpuUserMs: round(toFiniteNumber(cpu.user) / 1_000, 3),
    cpuSystemMs: round(toFiniteNumber(cpu.system) / 1_000, 3),
    uptimeSeconds: round(toFiniteNumber(process.uptime()), 3),
    sampledAt: new Date().toISOString(),
  };
}

/**
 * Terbitkan sampel runtime sebagai metrik. Dipisah dari `collectRuntimeSample`
 * supaya test bisa menguji sampling tanpa efek samping ke event store.
 */
function publish(snapshot: RuntimeSnapshot): void {
  const runtimeTags = { source: "runtime_metrics" };

  trackMetric({
    name: METRIC_NAMES.NODEJS_EVENT_LOOP_LAG,
    kind: "histogram",
    value: snapshot.eventLoopLagMeanMs,
    unit: METRIC_UNITS[METRIC_NAMES.NODEJS_EVENT_LOOP_LAG],
    tags: { ...runtimeTags, unit: "mean" },
  });

  trackMetric({
    name: METRIC_NAMES.NODEJS_EVENT_LOOP_LAG,
    kind: "histogram",
    value: snapshot.eventLoopLagP99Ms,
    unit: METRIC_UNITS[METRIC_NAMES.NODEJS_EVENT_LOOP_LAG],
    tags: { ...runtimeTags, unit: "p99" },
  });

  trackMetric({
    name: METRIC_NAMES.NODEJS_MEMORY_HEAP_USED_BYTES,
    kind: "gauge",
    value: snapshot.heapUsedBytes,
    unit: METRIC_UNITS[METRIC_NAMES.NODEJS_MEMORY_HEAP_USED_BYTES],
    tags: runtimeTags,
  });

  trackMetric({
    name: METRIC_NAMES.NODEJS_MEMORY_RSS_BYTES,
    kind: "gauge",
    value: snapshot.rssBytes,
    unit: METRIC_UNITS[METRIC_NAMES.NODEJS_MEMORY_RSS_BYTES],
    tags: runtimeTags,
  });

  trackMetric({
    name: METRIC_NAMES.PROCESS_CPU_USER_MS,
    kind: "counter",
    value: snapshot.cpuUserMs,
    unit: METRIC_UNITS[METRIC_NAMES.PROCESS_CPU_USER_MS],
    tags: runtimeTags,
  });

  trackMetric({
    name: METRIC_NAMES.PROCESS_UPTIME_SECONDS,
    kind: "gauge",
    value: snapshot.uptimeSeconds,
    unit: METRIC_UNITS[METRIC_NAMES.PROCESS_UPTIME_SECONDS],
    tags: runtimeTags,
  });
}

function sampleAndPublish(): void {
  try {
    const snapshot = collectRuntimeSample();

    getState().snapshot = snapshot;

    publish(snapshot);
  } catch {
    // Instrumentation tidak boleh menjatuhkan proses.
  }
}

/**
 * Aktifkan sampling runtime. Idempoten: panggilan kedua tidak membuat timer
 * kedua, tapi mengembalikan fungsi stop yang sama.
 */
export function startRuntimeMetrics(options?: {
  intervalMs?: number;
}): () => void {
  const state = getState();

  if (state.timer) {
    return stopRuntimeMetrics;
  }

  const requested = options?.intervalMs ?? DEFAULT_INTERVAL_MS;

  state.intervalMs = Math.max(
    Number.isFinite(requested) ? requested : DEFAULT_INTERVAL_MS,
    MIN_INTERVAL_MS,
  );

  try {
    const histogram = monitorEventLoopDelay({
      resolution: EVENT_LOOP_RESOLUTION_MS,
    });

    histogram.enable();

    state.histogram = histogram;

    const timer = setInterval(sampleAndPublish, state.intervalMs);

    // Jangan menahan proses tetap hidup hanya karena interval metrik.
    if (typeof timer === "object" && typeof timer.unref === "function") {
      timer.unref();
    }

    state.timer = timer;

    // Sample pertama diambil langsung supaya `getRuntimeSnapshot()` sudah terisi
    // segera setelah start.
    sampleAndPublish();
  } catch {
    state.timer = null;
    state.histogram = null;
  }

  return stopRuntimeMetrics;
}

export function stopRuntimeMetrics(): void {
  const state = getState();

  if (state.timer) {
    clearInterval(state.timer);
    state.timer = null;
  }

  if (state.histogram) {
    try {
      state.histogram.disable();
    } catch {
      // Histogram sudah tidak aktif; abaikan.
    }

    state.histogram = null;
  }
}

export function isRuntimeMetricsRunning(): boolean {
  return getState().timer !== null;
}

/** Snapshot terakhir; `null` kalau sampling belum pernah berjalan. */
export function getRuntimeSnapshot(): RuntimeSnapshot | null {
  return getState().snapshot;
}
