import { z } from "zod";

export const AUDIT_CATEGORIES = [
  "auth",
  "authz",
  "data",
  "config",
  "security",
  "log",
] as const;

export const AUDIT_SEVERITIES = ["info", "warning", "critical"] as const;
export const AUDIT_RESULTS = ["success", "failure", "error"] as const;

export const auditCategorySchema = z.enum(AUDIT_CATEGORIES);
export const auditSeveritySchema = z.enum(AUDIT_SEVERITIES);
export const auditResultSchema = z.enum(AUDIT_RESULTS);

export const auditActorSchema = z.object({
  id: z.string().max(64).optional(),
  /** Wajib sudah dimask oleh pemanggil; `logAudit` memaksa masking via `redactActor()`. */
  email: z.string().max(254).optional(),
  role: z.string().max(40).optional(),
});

export const auditResourceSchema = z.object({
  type: z.string().min(1).max(60),
  id: z.string().max(120),
  name: z.string().max(120).optional(),
});

const METADATA_MAX_STRING = 200;
const METADATA_MAX_ARRAY = 20;
const METADATA_MAX_KEYS = 40;
const METADATA_MAX_BYTES = 2_048;

const metadataScalarSchema = z.union([
  z.string().max(METADATA_MAX_STRING),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);

/**
 * Metadata dibatasi scalar satu lapis.
 *
 * Sebelumnya `z.unknown()` menerima nilai apa pun, termasuk object bersiklus,
 * BigInt, atau string 1MB, yang seluruhnya ikut di-`JSON.stringify` untuk
 * menghitung hash pada setiap append. Batas ini membuat ukuran per entry
 * terjamin sebelum data sampai ke store in-memory.
 */
const metadataValueSchema = z.union([
  metadataScalarSchema,
  z.array(metadataScalarSchema).max(METADATA_MAX_ARRAY),
]);

export const auditMetadataSchema = z
  .record(z.string().max(50), metadataValueSchema)
  .refine(
    (metadata) => Object.keys(metadata).length <= METADATA_MAX_KEYS,
    `Metadata maksimal ${METADATA_MAX_KEYS} key.`,
  )
  .refine(
    (metadata) => JSON.stringify(metadata).length <= METADATA_MAX_BYTES,
    `Metadata maksimal ${METADATA_MAX_BYTES} byte.`,
  );

/**
 * Bentuk event audit. Semua field sudah melewati redaksi; `metadata` tidak
 * boleh berisi secret (dicek lagi oleh `redactTags()`).
 */
export const auditEventInputSchema = z.object({
  action: z.string().min(1).max(100),
  category: auditCategorySchema,
  severity: auditSeveritySchema.default("info"),
  result: auditResultSchema.default("success"),
  actor: auditActorSchema.optional(),
  resource: auditResourceSchema.optional(),
  requestId: z.string().max(64).optional(),
  source: z.string().min(1).max(100),
  host: z.string().max(64).optional(),
  userAgent: z.string().max(120).optional(),
  metadata: auditMetadataSchema.optional(),
  timestamp: z.string().datetime().optional(),
});

export const auditQuerySchema = z.object({
  category: auditCategorySchema.optional(),
  severity: auditSeveritySchema.optional(),
  result: auditResultSchema.optional(),
  action: z.string().max(100).optional(),
  actorId: z.string().max(64).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(25),
});

export type AuditCategory = (typeof AUDIT_CATEGORIES)[number];
export type AuditSeverity = (typeof AUDIT_SEVERITIES)[number];
export type AuditResult = (typeof AUDIT_RESULTS)[number];
export type AuditEventInput = z.input<typeof auditEventInputSchema>;
export type AuditEvent = z.infer<typeof auditEventInputSchema> & {
  id: string;
  timestamp: string;
  /** Hash entry ini; `previousHash` membentuk rantai tamper-evidence. */
  hash: string;
  previousHash: string | null;
};
export type AuditQuery = z.infer<typeof auditQuerySchema>;
