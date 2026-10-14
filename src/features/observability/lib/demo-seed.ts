import "server-only";

import { METRIC_NAMES, type MetricName } from "@/features/observability/lib/constants";
import { getEvents } from "@/features/observability/lib/store";
import { trackMetric } from "@/features/observability/lib/track";
import type { TrackMetricValues } from "@/features/observability/schema";

export const DEMO_SEED_BUDGET = 400;

const DEMO_HORIZON_MS = 24 * 60 * 60 * 1000;

const DEMO_ROUTES: readonly string[] = [
  "/dashboard",
  "/dashboard/settings",
  "/dashboard/settings/observability",
  "/dashboard/users",
  "/dashboard/settings/security",
];

const HOURLY_WEIGHTS: readonly number[] = [
  0, 0, 1, 1, 2, 3, 5, 8, 10, 10, 9, 8,
  9, 10, 9, 8, 7, 5, 3, 2, 1, 1, 0, 0,
];

const LATENCY_SAMPLES_MS: readonly number[] = [120, 180, 210, 260, 300, 380, 420, 520, 700, 900];

interface CounterMetricSpec {
  name: MetricName;
  count: number;
  withOutcome?: boolean;
}

const COUNTER_METRICS: readonly CounterMetricSpec[] = [
  { name: METRIC_NAMES.LOGIN_ATTEMPT, count: 60 },
  { name: METRIC_NAMES.LOGIN_SUCCESS, count: 48 },
  { name: METRIC_NAMES.LOGIN_FAILURE, count: 12, withOutcome: true },
  { name: METRIC_NAMES.MFA_CHALLENGE, count: 20 },
  { name: METRIC_NAMES.MFA_SUCCESS, count: 18 },
  { name: METRIC_NAMES.MFA_FAILURE, count: 2, withOutcome: true },
  { name: METRIC_NAMES.PAGE_VIEW, count: 70 },
  { name: METRIC_NAMES.COMMAND_MENU_OPEN, count: 25 },
  { name: METRIC_NAMES.USER_CREATE, count: 14 },
  { name: METRIC_NAMES.USER_UPDATE, count: 18 },
  { name: METRIC_NAMES.USER_DELETE, count: 4 },
  { name: METRIC_NAMES.CONTACT_MESSAGE, count: 8 },
] as const;

const LATENCY_EVENT_COUNT = 60;

function buildTimestamps(count: number, nowMs: number): string[] {
  const totalWeight = HOURLY_WEIGHTS.reduce((sum, weight) => sum + weight, 0);
  const timestamps: string[] = [];

  for (let i = 0; i < count; i += 1) {
    let accumulated = 0;
    const target = (i / count) * totalWeight;
    let hour = 23;

    for (let h = 0; h < 24; h += 1) {
      accumulated += HOURLY_WEIGHTS[h];
      if (target < accumulated) {
        hour = h;
        break;
      }
    }

    const minute = (i * 7) % 60;
    const second = (i * 11) % 60;
    const eventTime = new Date(nowMs);
    eventTime.setHours(hour, minute, second, 0);

    let timestamp = eventTime.getTime();
    if (timestamp > nowMs) {
      timestamp -= DEMO_HORIZON_MS;
    }

    timestamps.push(new Date(timestamp).toISOString());
  }

  return timestamps;
}

export function buildDemoEvents(now: Date): TrackMetricValues[] {
  const nowMs = now.getTime();
  const events: TrackMetricValues[] = [];

  for (const metric of COUNTER_METRICS) {
    const timestamps = buildTimestamps(metric.count, nowMs);

    for (let i = 0; i < metric.count; i += 1) {
      const tags: Record<string, string> = {
        route: DEMO_ROUTES[i % DEMO_ROUTES.length],
      };

      if (metric.withOutcome) {
        tags.outcome = i % 5 === 0 ? "failure" : "success";
      }

      events.push({
        name: metric.name,
        kind: "counter",
        value: 1,
        tags,
        source: "demo",
        timestamp: timestamps[i],
      });
    }
  }

  const latencyTimestamps = buildTimestamps(LATENCY_EVENT_COUNT, nowMs);

  for (let i = 0; i < LATENCY_EVENT_COUNT; i += 1) {
    events.push({
      name: METRIC_NAMES.SERVER_ACTION_LATENCY,
      kind: "histogram",
      unit: "ms",
      value: LATENCY_SAMPLES_MS[i % LATENCY_SAMPLES_MS.length],
      tags: {
        route: DEMO_ROUTES[i % DEMO_ROUTES.length],
        outcome: i % 10 === 0 ? "failure" : "success",
      },
      source: "demo",
      timestamp: latencyTimestamps[i],
    });
  }

  return events;
}

export function seedDemoObservability(now: Date = new Date()): void {
  const seeded = new Set<string>();
  let budget = DEMO_SEED_BUDGET;

  for (const input of buildDemoEvents(now)) {
    if (budget === 0) {
      return;
    }

    if (!seeded.has(input.name)) {
      if (getEvents({ name: input.name }).length > 0) {
        continue;
      }
      seeded.add(input.name);
    }

    trackMetric(input);
    budget -= 1;
  }
}

export function hasDemoData(): boolean {
  return getEvents().some((event) => event.source === "demo");
}
