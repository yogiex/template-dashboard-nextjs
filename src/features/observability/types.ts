import type {
  MetricKind,
  MetricQuery,
  MetricSource,
  MetricWindow,
} from "@/features/observability/schema";

export type { MetricKind, MetricQuery, MetricSource, MetricWindow };

export type MetricEvent = {
  id: string;
  /** ISO timestamp. */
  timestamp: string;
  /** Nama metrik ter-registrasi, contoh: `auth.login.success`. */
  name: string;
  kind: MetricKind;
  value: number;
  /** Sudah melewati `redactTags()`; tidak pernah berisi PII mentah. */
  tags: Record<string, string>;
  /** Satuan pengukuran, contoh: `ms`, `By`, `s`. */
  unit?: string;
  actorId?: string;
  /** `demo` hanya untuk event hasil generator mock; event nyata membiarkannya kosong. */
  source?: MetricSource;
};

export type TimeSeriesPoint = {
  timestamp: string;
  value: number;
};

export type MetricSummary = {
  name: string;
  total: number;
  count: number;
  avg: number;
  p50: number;
  p95: number;
  p99: number;
  min: number;
  max: number;
};

export type ActivityHeatmapCell = {
  /** 0 = Minggu … 6 = Sabtu (mengikuti `Date#getDay`). */
  day: number;
  hour: number;
  count: number;
};

export type TopAction = {
  name: string;
  count: number;
};

export type ObservabilitySnapshot = {
  kpis: {
    loginSuccess24h: number;
    loginFailure24h: number;
    activeActors1h: number;
    rateLimitHits24h: number;
  };
  latency: MetricSummary;
  loginTimeseries: TimeSeriesPoint[];
  activityHeatmap: ActivityHeatmapCell[];
  topActions: TopAction[];
  counters: Record<string, number>;
  totalEvents: number;
  windowStart: string;
};
