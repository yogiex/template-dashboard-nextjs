import "server-only";

import type {
  Anomaly,
  AnomalyKind,
  UserRiskProfile,
} from "@/features/ueba/types";

/**
 * Agregasi anomaly menjadi skor 0-100 dengan peluruhan waktu.
 * Bobot mengikuti dampak: burst login gagal dan perubahan role paling
 * berbahaya, "jam tidak wajar" paling ringan.
 */

const WEIGHTS: Record<AnomalyKind, number> = {
  new_ip: 10,
  new_device: 12,
  unusual_hour: 6,
  high_volume: 15,
  failed_login_burst: 25,
  privilege_change: 20,
};

const DEFAULT_WEIGHT = 5;
/** Anomaly dianggap kadaluwarsa setelah 72 jam. */
const DECAY_HOURS = 72;

const LEVEL_THRESHOLDS = {
  critical: 75,
  high: 50,
  medium: 25,
} as const;

export function computeRisk(
  actorId: string,
  anomalies: Anomaly[],
  baseline: UserRiskProfile["baseline"],
  now = Date.now(),
): UserRiskProfile {
  const recent = anomalies.filter(
    (anomaly) =>
      anomaly.actorId === actorId &&
      now - Date.parse(anomaly.detectedAt) < DECAY_HOURS * 60 * 60_000,
  );

  let score = 0;

  for (const anomaly of recent) {
    const weight = WEIGHTS[anomaly.kind] ?? DEFAULT_WEIGHT;
    const ageHours = (now - Date.parse(anomaly.detectedAt)) / 3_600_000;
    const decay = Math.max(0, 1 - ageHours / DECAY_HOURS);

    score += weight * anomaly.score * decay;
  }

  const riskScore = Math.min(100, Math.round(score));
  const latest = recent.reduce<string | null>(
    (acc, anomaly) => (acc === null || anomaly.detectedAt > acc ? anomaly.detectedAt : acc),
    null,
  );

  return {
    actorId,
    riskScore,
    level:
      riskScore >= LEVEL_THRESHOLDS.critical
        ? "critical"
        : riskScore >= LEVEL_THRESHOLDS.high
          ? "high"
          : riskScore >= LEVEL_THRESHOLDS.medium
            ? "medium"
            : "low",
    anomalies: [...recent].sort((left, right) =>
      right.detectedAt.localeCompare(left.detectedAt),
    ),
    lastUpdated: latest ?? new Date(now).toISOString(),
    totalAnomalies: recent.length,
    baseline,
  };
}
