import { METRIC_WINDOWS } from "@/features/observability/schema";
import { getEvents, getHistogram } from "@/features/observability/lib/store";
import type {
  ActivityHeatmapCell,
  MetricSummary,
  TimeSeriesPoint,
} from "@/features/observability/types";

const WINDOW_MS: Record<(typeof METRIC_WINDOWS)[number], number> = {
  "1m": 60_000,
  "5m": 5 * 60_000,
  "1h": 60 * 60_000,
  "24h": 24 * 60 * 60_000,
  "7d": 7 * 24 * 60 * 60_000,
};

export function getWindowMs(window: (typeof METRIC_WINDOWS)[number]): number {
  return WINDOW_MS[window];
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;

  return Math.round(value * factor) / factor;
}

export function rollup(
  name: string,
  window: (typeof METRIC_WINDOWS)[number],
  options: { bucketMs?: number; now?: number; actorId?: string } = {},
): TimeSeriesPoint[] {
  const now = options.now ?? Date.now();
  const bucketMs = options.bucketMs ?? 60_000;
  const fromTimestamp = now - WINDOW_MS[window];
  const events = getEvents({
    name,
    fromTimestamp,
    ...(options.actorId ? { actorId: options.actorId } : {}),
  });
  const buckets = new Map<number, number>();

  for (const event of events) {
    const timestamp = Date.parse(event.timestamp);
    const bucket = Math.floor(timestamp / bucketMs) * bucketMs;

    buckets.set(bucket, (buckets.get(bucket) ?? 0) + event.value);
  }

  return [...buckets.entries()]
    .sort(([left], [right]) => left - right)
    .map(([timestamp, value]) => ({
      timestamp: new Date(timestamp).toISOString(),
      value: round(value),
    }));
}

export function summarize(name: string): MetricSummary {
  const values = getHistogram(name);
  const empty: MetricSummary = {
    name,
    total: 0,
    count: 0,
    avg: 0,
    p50: 0,
    p95: 0,
    p99: 0,
    min: 0,
    max: 0,
  };

  if (values.length === 0) {
    return empty;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const total = values.reduce((sum, value) => sum + value, 0);
  const pick = (percentile: number) =>
    sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * percentile))] ?? 0;

  return {
    name,
    total: round(total),
    count: values.length,
    avg: round(total / values.length),
    p50: round(pick(0.5)),
    p95: round(pick(0.95)),
    p99: round(pick(0.99)),
    min: round(sorted[0] ?? 0),
    max: round(sorted[sorted.length - 1] ?? 0),
  };
}

export function heatmap(
  name: string,
  windowDays = 7,
  now = Date.now(),
): ActivityHeatmapCell[] {
  const events = getEvents({
    name,
    fromTimestamp: now - windowDays * 24 * 60 * 60_000,
  });
  const grid = new Map<string, number>();

  for (const event of events) {
    const date = new Date(event.timestamp);
    const key = `${date.getDay()}-${date.getHours()}`;

    grid.set(key, (grid.get(key) ?? 0) + event.value);
  }

  const cells: ActivityHeatmapCell[] = [];

  for (let day = 0; day < 7; day += 1) {
    for (let hour = 0; hour < 24; hour += 1) {
      cells.push({ day, hour, count: grid.get(`${day}-${hour}`) ?? 0 });
    }
  }

  return cells;
}
