import "server-only";

import { getEvents } from "@/features/observability/lib/store";
import type { UserBaseline } from "@/features/ueba/types";

/**
 * Baseline dihitung ulang dari event store (maks 5000 event), jadi tidak perlu
 * tabel terpisah. Kalau nanti dipindah ke DB, simpan hasil ini per user dan
 * update secara incremental lewat `updateBaseline()`.
 */

export const BASELINE_WINDOW_DAYS = 30;
/**
 * Minimal event sebelum baseline dianggap stabil. Tanpa ambang ini, user baru
 * akan memicu anomali pada setiap event (false positive).
 */
export const MIN_EVENTS_FOR_BASELINE = 20;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;

  return Math.round(value * factor) / factor;
}

export function computeBaseline(
  actorId: string,
  now = Date.now(),
): UserBaseline | null {
  const events = getEvents({
    actorId,
    fromTimestamp: now - BASELINE_WINDOW_DAYS * MS_PER_DAY,
  });

  if (events.length < MIN_EVENTS_FOR_BASELINE) {
    return null;
  }

  const knownIps: Record<string, number> = {};
  const knownUserAgents: Record<string, number> = {};
  const activeHours = Array.from({ length: 24 }, () => 0) as number[];
  const eventsPerDay = new Map<string, number>();

  for (const event of events) {
    const ip = event.tags.ip;
    const userAgent = event.tags.userAgent;
    const hour = new Date(event.timestamp).getHours();
    const day = event.timestamp.slice(0, 10);

    if (ip) {
      knownIps[ip] = (knownIps[ip] ?? 0) + 1;
    }

    if (userAgent) {
      knownUserAgents[userAgent] = (knownUserAgents[userAgent] ?? 0) + 1;
    }

    activeHours[hour] = (activeHours[hour] ?? 0) + 1;
    eventsPerDay.set(day, (eventsPerDay.get(day) ?? 0) + event.value);
  }

  const dailyValues = [...eventsPerDay.values()];
  const mean =
    dailyValues.length > 0
      ? dailyValues.reduce((sum, value) => sum + value, 0) / dailyValues.length
      : 0;
  const variance =
    dailyValues.length > 0
      ? dailyValues.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
        dailyValues.length
      : 0;

  return {
    actorId,
    updatedAt: new Date(now).toISOString(),
    knownIps,
    knownUserAgents,
    activeHours,
    avgActionsPerDay: round(events.length / BASELINE_WINDOW_DAYS),
    stdActionsPerDay: round(Math.sqrt(variance)),
    lastSeenAt: events[events.length - 1]?.timestamp ?? new Date(now).toISOString(),
    totalEvents: events.length,
  };
}

export function updateBaseline(
  baseline: UserBaseline,
  event: { timestamp: string; value: number; tags: Record<string, string> },
): UserBaseline {
  const ip = event.tags.ip;
  const userAgent = event.tags.userAgent;
  const hour = new Date(event.timestamp).getHours();
  const next: UserBaseline = {
    ...baseline,
    updatedAt: event.timestamp,
    knownIps: { ...baseline.knownIps },
    knownUserAgents: { ...baseline.knownUserAgents },
    activeHours: [...baseline.activeHours],
    totalEvents: baseline.totalEvents + 1,
    lastSeenAt: event.timestamp,
  };

  if (ip) {
    next.knownIps[ip] = (next.knownIps[ip] ?? 0) + 1;
  }

  if (userAgent) {
    next.knownUserAgents[userAgent] = (next.knownUserAgents[userAgent] ?? 0) + 1;
  }

  next.activeHours[hour] = (next.activeHours[hour] ?? 0) + event.value;

  return next;
}
