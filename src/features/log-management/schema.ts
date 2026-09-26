import { z } from "zod";

import { AUDIT_CATEGORIES } from "@/features/audit/schema";

/**
 * Boundary validasi Log Management (NIST SP 800-92).
 *
 * Sengaja tidak memuat `approvedBy`: identitas approver selalu diambil dari
 * `requireSession()` di server, tidak pernah dari payload client.
 */

export const DISPOSAL_CATEGORIES = AUDIT_CATEGORIES;

export const DISPOSAL_METHODS = [
  "crypto-shredding",
  "secure-delete",
  "overwrite",
  "physical-destruction",
] as const;

export const DISPOSAL_STATUSES = [
  "scheduled",
  "approved",
  "completed",
  "rejected",
] as const;

export const disposalMethodSchema = z.enum(DISPOSAL_METHODS);
export const disposalStatusSchema = z.enum(DISPOSAL_STATUSES);

/** Jendela retensi yang valid; batas atas mencegah disposal instan. */
export const retentionWindowSchema = z.object({
  category: z.enum(DISPOSAL_CATEGORIES),
  retentionDays: z.coerce.number().int().min(1).max(3650),
  gracePeriodHours: z.coerce.number().int().min(0).max(24 * 30),
  note: z.string().max(240).optional(),
});

export const scheduleDisposalSchema = retentionWindowSchema;

export const approveDisposalSchema = z.object({
  disposalId: z.string().min(8).max(64),
  decision: z.enum(["approve", "reject"]),
});

export const completeDisposalSchema = z.object({
  disposalId: z.string().min(8).max(64),
  outcome: z.string().max(240).optional(),
});

export const runSweepSchema = z.object({
  maxItems: z.coerce.number().int().min(1).max(50).default(10),
});

export const logQuerySchema = z.object({
  category: z.enum(DISPOSAL_CATEGORIES).optional(),
  severity: z.enum(["info", "warning", "critical"]).optional(),
  result: z.enum(["success", "failure", "error"]).optional(),
  action: z.string().max(100).optional(),
  actorId: z.string().max(64).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(25),
});

export type DisposalMethod = (typeof DISPOSAL_METHODS)[number];
export type DisposalStatus = (typeof DISPOSAL_STATUSES)[number];
export type RetentionWindowInput = z.input<typeof retentionWindowSchema>;
export type LogQuery = z.infer<typeof logQuerySchema>;
