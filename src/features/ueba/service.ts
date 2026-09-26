import "server-only";

import { getEvents } from "@/features/observability/lib/store";
import { computeBaseline } from "@/features/ueba/lib/baseline";
import { detect } from "@/features/ueba/lib/anomaly";
import { computeRisk } from "@/features/ueba/lib/risk";
import { uebaActorIdSchema, uebaQuerySchema } from "@/features/ueba/schema";
import type { Anomaly, UserRiskProfile } from "@/features/ueba/types";

/**
 * Mock store anomaly, sama seperti event store observability: in-memory dan
 * ditempel di `globalThis` supaya tidak hilang saat modul dievaluasi ulang.
 */

const MAX_ANOMALIES = 1_000;
const STORE_KEY = Symbol.for("template.ueba.anomalies");

type GlobalWithStore = typeof globalThis & { [STORE_KEY]?: Anomaly[] };

function getAnomalyStore(): Anomaly[] {
  const globalStore = globalThis as GlobalWithStore;
  const existing = globalStore[STORE_KEY];

  if (existing) {
    return existing;
  }

  const created: Anomaly[] = [];

  globalStore[STORE_KEY] = created;

  return created;
}

export function recordAnomalies(anomalies: Anomaly[]): void {
  if (anomalies.length === 0) {
    return;
  }

  const store = getAnomalyStore();

  store.push(...anomalies);

  if (store.length > MAX_ANOMALIES) {
    store.splice(0, store.length - MAX_ANOMALIES);
  }
}

/**
 * Evaluasi satu actor terhadap event terakhirnya. Dipanggil dari
 * `trackMetric()` dengan throttle, jadi aman di hot path.
 */
export function recordAnomaliesForActor(actorId: string, now = Date.now()): Anomaly[] {
  const events = getEvents({ actorId });
  const event = events[events.length - 1];

  if (!event) {
    return [];
  }

  const anomalies = detect({
    baseline: computeBaseline(actorId, now),
    recentEvents: events,
    event,
    now,
  });

  recordAnomalies(anomalies);

  return anomalies;
}

export function listAnomalies(actorId?: string, now = Date.now()): Anomaly[] {
  const store = getAnomalyStore();
  const filtered = actorId
    ? store.filter((anomaly) => anomaly.actorId === actorId)
    : store;

  return [...filtered]
    .filter(
      (anomaly) =>
        now - Date.parse(anomaly.detectedAt) < 72 * 60 * 60 * 1000,
    )
    .sort((left, right) => right.detectedAt.localeCompare(left.detectedAt));
}

function summarizeBaseline(actorId: string, now: number): UserRiskProfile["baseline"] {
  const baseline = computeBaseline(actorId, now);

  if (!baseline) {
    return {
      available: false,
      totalEvents: 0,
      lastSeenAt: null,
      knownIpCount: 0,
      knownDeviceCount: 0,
    };
  }

  return {
    available: true,
    totalEvents: baseline.totalEvents,
    lastSeenAt: baseline.lastSeenAt,
    knownIpCount: Object.keys(baseline.knownIps).length,
    knownDeviceCount: Object.keys(baseline.knownUserAgents).length,
  };
}

export function listUserRiskProfiles(input: unknown, now = Date.now()): {
  items: UserRiskProfile[];
  total: number;
} {
  const parsed = uebaQuerySchema.safeParse(input ?? {});

  if (!parsed.success) {
    return { items: [], total: 0 };
  }

  const { actorId, level } = parsed.data;
  const anomalies = listAnomalies(undefined, now);
  const actorIds = [...new Set(anomalies.map((anomaly) => anomaly.actorId))];

  if (actorId) {
    actorIds.push(actorId);
  }

  const items = [...new Set(actorIds)]
    .map((id) =>
      computeRisk(id, anomalies, summarizeBaseline(id, now), now),
    )
    .filter((profile) => !level || profile.level === level)
    .sort((left, right) => right.riskScore - left.riskScore);

  return { items, total: items.length };
}

export function getUserRiskProfile(
  input: unknown,
  now = Date.now(),
): UserRiskProfile | null {
  const actorId = uebaActorIdSchema.safeParse(input);

  if (!actorId.success) {
    return null;
  }

  const anomalies = listAnomalies(actorId.data, now);

  if (anomalies.length === 0) {
    return null;
  }

  return computeRisk(
    actorId.data,
    anomalies,
    summarizeBaseline(actorId.data, now),
    now,
  );
}
