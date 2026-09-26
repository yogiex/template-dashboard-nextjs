/**
 * Empat golden signals versi Google SRE (latency, traffic, errors, saturation)
 * yang dihitung dari event store in-memory.
 *
 * Batasan yang perlu diketahui pembaca:
 *
 * - Data diambil dari event ber-tag `http.route` dan digabung menjadi satu
 *   tabel per route: `traffic.byRoute`, `latency.byRoute`, dan `errors.byRoute`
 *   memakai tabel yang sama, jadi jumlah request, error, dan latensinya selalu
 *   bisa dibandingkan antar signal. Route tanpa tag masuk ke kelompok
 *   `(tanpa route)` supaya jumlahnya tidak hilang diam-diam.
 * - Saturasi hanya bisa ditampilkan kalau event runtime benar-benar ada.
 *   Kolom yang tidak punya data bernilai `null`, bukan `0` — nol berarti
 *   "terukur nol", sedangkan `null` berarti "tidak terukur". Membedakan keduanya
 *   penting supaya halaman tidak mengarang angka.
 * - Store in-memory kehilangan semua data saat restart, jadi snapshot ini
 *   hanya deskripsi kondisi proses yang sedang berjalan.
 */

import { OTEL_ATTRIBUTE_KEYS, METRIC_NAMES } from "@/features/observability/lib/constants";
import { getEvents } from "@/features/observability/lib/store";
import type { MetricEvent } from "@/features/observability/types";

/** Window default untuk keempat golden signal. */
const WINDOW_MS = 60 * 60 * 1000;

/** Jumlah route per tabel; diurutkan count desc lalu nama route asc. */
const MAX_ROUTES = 10;

const UNKNOWN_ROUTE = "(tanpa route)";

const MS_DIGITS = 2;

export interface RouteSignal {
  route: string;
  requests: number;
  errors: number;
  /** `errors / requests`; 1 bila ada error tanpa request tercatat. */
  errorRate: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
}

export interface GoldenSignalsSnapshot {
  traffic: {
    total: number;
    byRoute: RouteSignal[];
  };
  latency: {
    overall: { p50Ms: number; p95Ms: number; p99Ms: number };
    byRoute: RouteSignal[];
  };
  errors: {
    total: number;
    /** `total / traffic.total`, 0 bila tidak ada request. */
    rate: number;
    byRoute: RouteSignal[];
  };
  saturation: {
    eventLoopLagMs: number | null;
    heapUsedBytes: number | null;
    rssBytes: number | null;
    activeRequests: number | null;
    cpuUserMs: number | null;
    uptimeSeconds: number | null;
    /** True bila minimal satu event saturasi ditemukan. */
    hasData: boolean;
  };
  /** False bila tidak ada satu pun event HTTP dalam window. */
  hasData: boolean;
}

type RouteAccumulator = {
  route: string;
  requests: number;
  errors: number;
  durations: number[];
};

function round(value: number, digits = MS_DIGITS): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const factor = 10 ** digits;

  return Math.round(value * factor) / factor;
}

function routeOf(event: MetricEvent): string {
  return event.tags[OTEL_ATTRIBUTE_KEYS.ROUTE] ?? UNKNOWN_ROUTE;
}

function percentile(sorted: number[], ratio: number): number {
  if (sorted.length === 0) {
    return 0;
  }

  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))] ?? 0;
}

function sortedOrEmpty(values: number[]): number[] {
  return values.length === 0 ? [] : [...values].sort((left, right) => left - right);
}

function toRouteSignal(accumulator: RouteAccumulator): RouteSignal {
  // Durasi disimpan dalam detik; seluruh output signal dalam milidetik.
  const sortedMs = sortedOrEmpty(accumulator.durations.map((value) => value * 1_000));

  return {
    route: accumulator.route,
    requests: accumulator.requests,
    errors: accumulator.errors,
    // Route dengan error tapi tanpa request tercatat dianggap 100% error:
    // nol di sini berarti "tidak ada error sama sekali".
    errorRate:
      accumulator.requests > 0
        ? round(accumulator.errors / accumulator.requests, 4)
        : accumulator.errors > 0
          ? 1
          : 0,
    p50Ms: round(percentile(sortedMs, 0.5)),
    p95Ms: round(percentile(sortedMs, 0.95)),
    p99Ms: round(percentile(sortedMs, 0.99)),
  };
}

/** Urut count desc, tie-break nama route asc supaya hasilnya deterministik. */
function toRouteSignals(accumulators: Map<string, RouteAccumulator>): RouteSignal[] {
  return [...accumulators.values()]
    .sort((left, right) => {
      if (right.requests !== left.requests) {
        return right.requests - left.requests;
      }

      return left.route.localeCompare(right.route);
    })
    .slice(0, MAX_ROUTES)
    .map(toRouteSignal);
}

/** Sample terakhir tiap metrik runtime di dalam window. */
function latestValues(events: MetricEvent[]): Map<string, number> {
  const latest = new Map<string, { timestamp: number; value: number }>();

  for (const event of events) {
    const timestamp = Date.parse(event.timestamp);

    if (Number.isNaN(timestamp)) {
      continue;
    }

    const previous = latest.get(event.name);

    if (!previous || timestamp > previous.timestamp) {
      latest.set(event.name, { timestamp, value: event.value });
    }
  }

  const result = new Map<string, number>();

  for (const [name, entry] of latest) {
    result.set(name, entry.value);
  }

  return result;
}

export function getGoldenSignals(now: number = Date.now()): GoldenSignalsSnapshot {
  const events = getEvents({ fromTimestamp: now - WINDOW_MS, toTimestamp: now });
  const routes = new Map<string, RouteAccumulator>();
  const allDurations: number[] = [];

  let requestTotal = 0;
  let errorTotal = 0;

  const bucket = (event: MetricEvent): RouteAccumulator => {
    const route = routeOf(event);
    const existing = routes.get(route);

    if (existing) {
      return existing;
    }

    const created: RouteAccumulator = { route, requests: 0, errors: 0, durations: [] };

    routes.set(route, created);

    return created;
  };

  for (const event of events) {
    switch (event.name) {
      case METRIC_NAMES.HTTP_SERVER_REQUEST_COUNT:
        requestTotal += event.value;
        bucket(event).requests += event.value;
        break;
      case METRIC_NAMES.HTTP_SERVER_ERROR_COUNT:
        errorTotal += event.value;
        bucket(event).errors += event.value;
        break;
      case METRIC_NAMES.HTTP_SERVER_REQUEST_DURATION:
        allDurations.push(event.value);
        bucket(event).durations.push(event.value);
        break;
      default:
        break;
    }
  }

  const overallMs = sortedOrEmpty(allDurations.map((value) => value * 1_000));
  const byRoute = toRouteSignals(routes);
  const latest = latestValues(events);
  const eventLoopLagMs = latest.get(METRIC_NAMES.NODEJS_EVENT_LOOP_LAG) ?? null;
  const heapUsedBytes = latest.get(METRIC_NAMES.NODEJS_MEMORY_HEAP_USED_BYTES) ?? null;
  const rssBytes = latest.get(METRIC_NAMES.NODEJS_MEMORY_RSS_BYTES) ?? null;
  const activeRequests = latest.get(METRIC_NAMES.HTTP_SERVER_ACTIVE_REQUESTS) ?? null;
  const cpuUserMs = latest.get(METRIC_NAMES.PROCESS_CPU_USER_MS) ?? null;
  const uptimeSeconds = latest.get(METRIC_NAMES.PROCESS_UPTIME_SECONDS) ?? null;
  const saturationFields = [
    eventLoopLagMs,
    heapUsedBytes,
    rssBytes,
    activeRequests,
    cpuUserMs,
    uptimeSeconds,
  ];

  return {
    traffic: {
      total: round(requestTotal, 0),
      byRoute,
    },
    latency: {
      overall: {
        p50Ms: round(percentile(overallMs, 0.5)),
        p95Ms: round(percentile(overallMs, 0.95)),
        p99Ms: round(percentile(overallMs, 0.99)),
      },
      byRoute,
    },
    errors: {
      total: round(errorTotal, 0),
      rate: requestTotal > 0 ? round(errorTotal / requestTotal, 4) : 0,
      byRoute,
    },
    saturation: {
      eventLoopLagMs: eventLoopLagMs === null ? null : round(eventLoopLagMs),
      heapUsedBytes: heapUsedBytes === null ? null : Math.round(heapUsedBytes),
      rssBytes: rssBytes === null ? null : Math.round(rssBytes),
      activeRequests: activeRequests === null ? null : Math.round(activeRequests),
      cpuUserMs: cpuUserMs === null ? null : round(cpuUserMs),
      uptimeSeconds: uptimeSeconds === null ? null : round(uptimeSeconds),
      hasData: saturationFields.some((value) => value !== null),
    },
    hasData: requestTotal > 0 || errorTotal > 0 || allDurations.length > 0,
  };
}
