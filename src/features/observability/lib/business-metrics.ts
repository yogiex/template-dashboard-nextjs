/**
 * Metrik bisnis yang bisa dihitung dari event yang sudah ada di store.
 *
 * Aturan utama: **jangan mengarang metrik**. Kalau event sumbernya tidak pernah
 * muncul, rate-nya `null` dan step funnel-nya dihilangkan, bukan diisi `0`.
 * Nol berarti "terukur nol"; `null` berarti "tidak ada data untuk diukur".
 *
 * Definisi:
 *
 * - `dau`: jumlah aktor unik dengan aktivitas dalam 24 jam terakhir. Sumbernya
 *   event login (percobaan maupun hasil), jadi ini "aktor yang mencoba masuk",
 *   bukan pengguna aktif produk secara keseluruhan.
 * - `mau`: jumlah aktor unik dalam 30 hari terakhir. Karena store hanya
 *   menerima 5000 event, angka ini hanya akurat pada beban template.
 * - `dauMauRatio`: `dau / mau`; 0 saat `mau = 0`.
 *
 * Label funnel berasal dari `BUSINESS_FUNNEL_STEPS` di `src/config/slo.ts`.
 */

import { BUSINESS_FUNNEL_STEPS } from "@/config/slo";
import { METRIC_NAMES } from "@/features/observability/lib/constants";
import { getEvents } from "@/features/observability/lib/store";
import type { MetricEvent } from "@/features/observability/types";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAU_DAYS = 30;

const RATIO_DIGITS = 4;

export interface BusinessMetricsSnapshot {
  dau: number;
  mau: number;
  dauMauRatio: number;
  authSuccessRate: number | null;
  mfaSuccessRate: number | null;
  /** Urutan step tetap; step tanpa data tidak disertakan. */
  funnel: { step: string; count: number }[];
  hasData: boolean;
}

/** Metrik yang menandai aktivitas aktor; dipakai untuk DAU/MAU. */
const ACTIVITY_METRICS = new Set<string>([
  METRIC_NAMES.LOGIN_ATTEMPT,
  METRIC_NAMES.LOGIN_SUCCESS,
  METRIC_NAMES.LOGIN_FAILURE,
  METRIC_NAMES.MFA_CHALLENGE,
  METRIC_NAMES.MFA_SUCCESS,
  METRIC_NAMES.MFA_FAILURE,
]);

/** Metrik sumber tiap step funnel, dicocokkan dengan kunci di config. */
const FUNNEL_METRICS: Record<string, string> = {
  attempt: METRIC_NAMES.LOGIN_ATTEMPT,
  success: METRIC_NAMES.LOGIN_SUCCESS,
  mfa_challenge: METRIC_NAMES.MFA_CHALLENGE,
  mfa_success: METRIC_NAMES.MFA_SUCCESS,
};

function round(value: number, digits = RATIO_DIGITS): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const factor = 10 ** digits;

  return Math.round(value * factor) / factor;
}

function countEvents(events: MetricEvent[]): number {
  let total = 0;

  for (const event of events) {
    total += event.value;
  }

  return total;
}

function sumBy(events: MetricEvent[], name: string): number {
  return countEvents(events.filter((event) => event.name === name));
}

/** Rasio successes terhadap total percobaan; `null` bila denominator nol. */
function successRate(successes: number, attempts: number): number | null {
  if (attempts <= 0) {
    return null;
  }

  return round(successes / attempts);
}

export function computeBusinessMetrics(
  now: number = Date.now(),
): BusinessMetricsSnapshot {
  const activity = getEvents({
    fromTimestamp: now - MAU_DAYS * DAY_MS,
    toTimestamp: now,
  }).filter((event) => ACTIVITY_METRICS.has(event.name));

  const dauActors = new Set<string>();
  const mauActors = new Set<string>();
  const dayStart = now - DAY_MS;

  for (const event of activity) {
    if (!event.actorId) {
      continue;
    }

    mauActors.add(event.actorId);

    if (Date.parse(event.timestamp) >= dayStart) {
      dauActors.add(event.actorId);
    }
  }

  const attempts = sumBy(activity, METRIC_NAMES.LOGIN_ATTEMPT);
  const successes = sumBy(activity, METRIC_NAMES.LOGIN_SUCCESS);
  const mfaChallenges = sumBy(activity, METRIC_NAMES.MFA_CHALLENGE);
  const mfaSuccesses = sumBy(activity, METRIC_NAMES.MFA_SUCCESS);
  const funnel: { step: string; count: number }[] = [];

  for (const step of BUSINESS_FUNNEL_STEPS) {
    const metric = FUNNEL_METRICS[step.key];

    if (!metric) {
      continue;
    }

    const count = sumBy(activity, metric);

    // Step tanpa data dihilangkan supaya funnel tidak menampilkan 0 palsu.
    if (count > 0) {
      funnel.push({ step: step.label, count });
    }
  }

  return {
    dau: dauActors.size,
    mau: mauActors.size,
    dauMauRatio: mauActors.size > 0 ? round(dauActors.size / mauActors.size) : 0,
    authSuccessRate: successRate(successes, attempts),
    mfaSuccessRate: successRate(mfaSuccesses, mfaChallenges),
    funnel,
    hasData: activity.length > 0,
  };
}
