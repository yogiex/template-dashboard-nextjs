import type { AnomalyKind, RiskLevel } from "@/features/ueba/schema";

export type { AnomalyKind, RiskLevel };

export type UserBaseline = {
  actorId: string;
  updatedAt: string;
  /** `ip_hash` (bukan IP mentah) → jumlah kemunculan. */
  knownIps: Record<string, number>;
  /** User agent sudah di-truncate oleh `redactTags()`. */
  knownUserAgents: Record<string, number>;
  /** 24 slot, jumlah event per jam. */
  activeHours: number[];
  avgActionsPerDay: number;
  stdActionsPerDay: number;
  lastSeenAt: string;
  totalEvents: number;
};

export type Anomaly = {
  id: string;
  actorId: string;
  kind: AnomalyKind;
  /** Kontribusi 0-1 terhadap risiko. */
  score: number;
  severity: RiskLevel;
  detectedAt: string;
  /** Sudah melewati `redactEvidence()`. */
  evidence: Record<string, string>;
  message: string;
};

export type UserRiskProfile = {
  actorId: string;
  /** 0-100. */
  riskScore: number;
  level: RiskLevel;
  anomalies: Anomaly[];
  lastUpdated: string;
  totalAnomalies: number;
  baseline: {
    available: boolean;
    totalEvents: number;
    lastSeenAt: string | null;
    knownIpCount: number;
    knownDeviceCount: number;
  };
};
