import { z } from "zod";

export const ANOMALY_KINDS = [
  "new_ip",
  "new_device",
  "unusual_hour",
  "high_volume",
  "failed_login_burst",
  "privilege_change",
] as const;

export const RISK_LEVELS = ["low", "medium", "high", "critical"] as const;

export const anomalyKindSchema = z.enum(ANOMALY_KINDS);
export const riskLevelSchema = z.enum(RISK_LEVELS);

export const uebaQuerySchema = z.object({
  actorId: z.string().max(64).optional(),
  level: riskLevelSchema.optional(),
});

export const uebaActorIdSchema = z.string().min(1).max(64);

export type AnomalyKind = (typeof ANOMALY_KINDS)[number];
export type RiskLevel = (typeof RISK_LEVELS)[number];
export type UebaQuery = z.infer<typeof uebaQuerySchema>;
