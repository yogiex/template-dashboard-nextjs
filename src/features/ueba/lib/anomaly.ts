import "server-only";

import type { MetricEvent } from "@/features/observability/types";
import { METRIC_NAMES } from "@/features/observability/lib/constants";
import { redactEvidence } from "@/lib/redact";
import type { Anomaly, AnomalyKind, UserBaseline } from "@/features/ueba/types";

/**
 * Rule engine anomali. Setiap detector adalah fungsi murni
 * `(context) => Anomaly | null`, jadi mudah diuji dan ditambah.
 *
 * Spec awal memisahkan tiap detector ke file sendiri; di project ini semua
 * detector tinggal terdaftar di satu registry agar tidak ada enam file
 * satu-fungsi.
 */

/** Minimal kemunculan sebelum IP dianggap "terkenal". */
const KNOWN_IP_THRESHOLD = 2;
const UNUSUAL_HOUR_RATIO = 0.01;
const UNUSUAL_HOUR_MIN_EVENTS = 50;
const HIGH_VOLUME_SIGMA = 3;
const FAILED_LOGIN_WINDOW_MS = 15 * 60_000;
const FAILED_LOGIN_THRESHOLD = 5;

const KIND_LABELS: Record<AnomalyKind, string> = {
  new_ip: "IP baru",
  new_device: "Perangkat baru",
  unusual_hour: "Jam tidak wajar",
  high_volume: "Volume tidak wajar",
  failed_login_burst: "Burst login gagal",
  privilege_change: "Perubahan role",
};

export type DetectContext = {
  baseline: UserBaseline | null;
  recentEvents: MetricEvent[];
  event: MetricEvent;
  now: number;
};

export type Detector = (context: DetectContext) => Anomaly | null;

function severityFromScore(score: number): Anomaly["severity"] {
  if (score >= 0.8) {
    return "critical";
  }

  if (score >= 0.6) {
    return "high";
  }

  if (score >= 0.4) {
    return "medium";
  }

  return "low";
}

function makeAnomaly(
  kind: AnomalyKind,
  score: number,
  actorId: string,
  message: string,
  evidence: Record<string, unknown>,
  now: number,
): Anomaly {
  const clampedScore = Math.min(1, Math.max(0, score));

  return {
    id: crypto.randomUUID(),
    actorId,
    kind,
    score: Number(clampedScore.toFixed(2)),
    severity: severityFromScore(clampedScore),
    detectedAt: new Date(now).toISOString(),
    message,
    evidence: redactEvidence(evidence),
  };
}

const detectNewIp: Detector = ({ baseline, event, now }) => {
  if (!baseline) {
    return null;
  }

  const ip = event.tags.ip;

  if (!ip) {
    return null;
  }

  const seenCount = baseline.knownIps[ip] ?? 0;

  if (seenCount >= KNOWN_IP_THRESHOLD) {
    return null;
  }

  return makeAnomaly(
    "new_ip",
    0.5,
    event.actorId ?? "unknown",
    "Akses dari IP hash yang belum pernah terlihat pada akun ini.",
    { ip, seenCount, kindLabel: KIND_LABELS.new_ip },
    now,
  );
};

const detectNewDevice: Detector = ({ baseline, event, now }) => {
  if (!baseline) {
    return null;
  }

  const userAgent = event.tags.userAgent;

  if (!userAgent || baseline.knownUserAgents[userAgent]) {
    return null;
  }

  return makeAnomaly(
    "new_device",
    0.4,
    event.actorId ?? "unknown",
    "Akses dari user agent yang belum pernah terlihat pada akun ini.",
    { userAgent, kindLabel: KIND_LABELS.new_device },
    now,
  );
};

const detectUnusualHour: Detector = ({ baseline, event, now }) => {
  if (!baseline || baseline.totalEvents <= UNUSUAL_HOUR_MIN_EVENTS) {
    return null;
  }

  const hour = new Date(event.timestamp).getHours();
  const hourCount = baseline.activeHours[hour] ?? 0;
  const totalByHour = baseline.activeHours.reduce((sum, value) => sum + value, 0);
  const historicalRatio = totalByHour > 0 ? hourCount / totalByHour : 0;

  if (historicalRatio >= UNUSUAL_HOUR_RATIO) {
    return null;
  }

  return makeAnomaly(
    "unusual_hour",
    0.3,
    event.actorId ?? "unknown",
    `Aktivitas pada jam ${hour}:00  akun ini.`,
    { hour, historicalRatio: historicalRatio.toFixed(4), kindLabel: KIND_LABELS.unusual_hour },
    now,
  );
};

const detectHighVolume: Detector = ({ baseline, recentEvents, event, now }) => {
  if (!baseline || baseline.stdActionsPerDay <= 0 || !event.actorId) {
    return null;
  }

  const today = event.timestamp.slice(0, 10);
  const todayCount = recentEvents
    .filter(
      (candidate) =>
        candidate.actorId === event.actorId &&
        candidate.timestamp.slice(0, 10) === today,
    )
    .reduce((sum, candidate) => sum + candidate.value, 0);
  const threshold = baseline.avgActionsPerDay + HIGH_VOLUME_SIGMA * baseline.stdActionsPerDay;

  if (todayCount <= threshold) {
    return null;
  }

  const zScore = (todayCount - baseline.avgActionsPerDay) / baseline.stdActionsPerDay;

  return makeAnomaly(
    "high_volume",
    Math.min(0.9, zScore / 5),
    event.actorId,
    `Volume aktivitas hari ini (${todayCount}) jauh di atas rata-rata akun (${baseline.avgActionsPerDay}).`,
    {
      today: todayCount,
      avg: baseline.avgActionsPerDay,
      std: baseline.stdActionsPerDay,
      zScore: zScore.toFixed(2),
      kindLabel: KIND_LABELS.high_volume,
    },
    now,
  );
};

const detectFailedLoginBurst: Detector = ({ recentEvents, event, now }) => {
  if (event.name !== METRIC_NAMES.LOGIN_FAILURE || !event.actorId) {
    return null;
  }

  const attempts = recentEvents.filter(
    (candidate) =>
      candidate.actorId === event.actorId &&
      candidate.name === METRIC_NAMES.LOGIN_FAILURE &&
      now - Date.parse(candidate.timestamp) < FAILED_LOGIN_WINDOW_MS,
  ).length;

  if (attempts < FAILED_LOGIN_THRESHOLD) {
    return null;
  }

  return makeAnomaly(
    "failed_login_burst",
    0.7,
    event.actorId,
    `${attempts} kali login gagal dalam 15 menit terakhir.`,
    { attempts, windowMinutes: FAILED_LOGIN_WINDOW_MS / 60_000, kindLabel: KIND_LABELS.failed_login_burst },
    now,
  );
};

const detectPrivilegeChange: Detector = ({ event, now }) => {
  if (event.name !== METRIC_NAMES.USER_UPDATE || !event.actorId) {
    return null;
  }

  if (!event.tags.roleChanged) {
    return null;
  }

  return makeAnomaly(
    "privilege_change",
    0.8,
    event.actorId,
    "Perubahan role/per Privileges terdeteksi dan perlu verifikasi.",
    { ...event.tags, kindLabel: KIND_LABELS.privilege_change },
    now,
  );
};

export const DETECTORS: Detector[] = [
  detectNewIp,
  detectNewDevice,
  detectUnusualHour,
  detectHighVolume,
  detectFailedLoginBurst,
  detectPrivilegeChange,
];

export function detect(context: DetectContext): Anomaly[] {
  const anomalies: Anomaly[] = [];

  for (const detector of DETECTORS) {
    const anomaly = detector(context);

    if (anomaly) {
      anomalies.push(anomaly);
    }
  }

  return anomalies;
}

export const ANOMALY_KIND_LABELS = KIND_LABELS;
