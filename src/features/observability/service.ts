import "server-only";

import {
  heatmap,
  rollup,
  summarize,
} from "@/features/observability/lib/aggregate";
import { METRIC_NAMES } from "@/features/observability/lib/constants";
import {
  getCounters,
  getEarliestEvent,
  getEvents,
  getTotalEvents,
} from "@/features/observability/lib/store";
import { computeBusinessMetrics } from "@/features/observability/lib/business-metrics";
import type { BusinessMetricsSnapshot } from "@/features/observability/lib/business-metrics";
import { getGoldenSignals } from "@/features/observability/lib/golden-signals";
import type { GoldenSignalsSnapshot } from "@/features/observability/lib/golden-signals";
import { computeErrorBudget, computeSlos } from "@/features/observability/lib/slo";
import type { ErrorBudgetSummary, SloResult } from "@/features/observability/lib/slo";
import { metricQuerySchema } from "@/features/observability/schema";
import type {
  MetricQuery,
  ObservabilitySnapshot,
  TimeSeriesPoint,
  TopAction,
} from "@/features/observability/types";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function topActions(events: ReturnType<typeof getEvents>, limit: number): TopAction[] {
  const totals = new Map<string, number>();

  for (const event of events) {
    totals.set(event.name, (totals.get(event.name) ?? 0) + event.value);
  }

  return [...totals.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }));
}

export function getObservabilitySnapshot(now = Date.now()): ObservabilitySnapshot {
  const events = getEvents();

  return {
    kpis: {
      loginSuccess24h: getEvents({
        name: METRIC_NAMES.LOGIN_SUCCESS,
        fromTimestamp: now - DAY_MS,
      }).length,
      loginFailure24h: getEvents({
        name: METRIC_NAMES.LOGIN_FAILURE,
        fromTimestamp: now - DAY_MS,
      }).length,
      activeActors1h: new Set(
        getEvents({
          name: METRIC_NAMES.LOGIN_ATTEMPT,
          fromTimestamp: now - HOUR_MS,
        })
          .map((event) => event.actorId)
          .filter((actorId): actorId is string => Boolean(actorId)),
      ).size,
      rateLimitHits24h: getEvents({
        name: METRIC_NAMES.RATE_LIMIT_HIT,
        fromTimestamp: now - DAY_MS,
      }).length,
    },
    latency: summarize(METRIC_NAMES.SERVER_ACTION_LATENCY),
    loginTimeseries: rollup(METRIC_NAMES.LOGIN_SUCCESS, "24h", {
      bucketMs: HOUR_MS,
      now,
    }),
    activityHeatmap: heatmap(METRIC_NAMES.LOGIN_ATTEMPT, 7, now),
    topActions: topActions(events, 10),
    counters: getCounters(),
    totalEvents: getTotalEvents(),
    windowStart: new Date(events[0] ? Date.parse(events[0].timestamp) : now).toISOString(),
  };
}

export function queryMetrics(input: unknown, now = Date.now()): {
  points: TimeSeriesPoint[];
  query: MetricQuery | null;
} {
  const parsed = metricQuerySchema.safeParse(input ?? {});

  if (!parsed.success || !parsed.data.name) {
    return { points: [], query: null };
  }

  const { name, window, bucketMs, actorId } = parsed.data;

  return {
    points: rollup(name, window, { bucketMs, now, ...(actorId ? { actorId } : {}) }),
    query: parsed.data,
  };
}

export function getStoreHealth(): {
  totalEvents: number;
  oldestEventAt: string | null;
} {
  const oldest = getEarliestEvent();

  return {
    totalEvents: getTotalEvents(),
    oldestEventAt: oldest ? oldest.timestamp : null,
  };
}

/**
 * SLO/SLI + error budget. Tanpa data, semua status `unknown` dan
 * `errorBudgetRemaining` bernilai `null` — bukan "sehat".
 */
export function getSloSnapshot(now = Date.now()): {
  results: SloResult[];
  errorBudget: ErrorBudgetSummary;
} {
  return {
    results: computeSlos(now),
    errorBudget: computeErrorBudget(now),
  };
}

/** DAU/MAU, tingkat keberhasilan login dan MFA, serta funnel login. */
export function getBusinessMetricsSnapshot(now = Date.now()): BusinessMetricsSnapshot {
  return computeBusinessMetrics(now);
}

/** Empat golden signal (traffic, latency, errors, saturation). */
export function getGoldenSignalsSnapshot(now = Date.now()): GoldenSignalsSnapshot {
  return getGoldenSignals(now);
}
