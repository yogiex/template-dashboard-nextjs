import "server-only";

import { appendAuditEvent } from "@/features/audit/lib/store";
import { normalizeSeverity } from "@/features/audit/lib/severity";
import { auditEventInputSchema, type AuditEvent } from "@/features/audit/schema";
import { logger } from "@/lib/logger";
import { redactActor, redactTags } from "@/lib/redact";

export type AuditActorInput = {
  id?: string;
  email?: string;
  role?: string;
};

/**
 * Satu-satunya pintu penulisan audit log (NIST SP 800-92 §4.2 TS-2).
 *
 * Sifat penting:
 * - tidak pernah melempar exception (logging tidak boleh menggagalkan request);
 * - selalu memvalidasi input dan memaksa redaksi PII/secret;
 * - selalu menaikkan severity di bawah lantai kategori (`normalizeSeverity`);
 * - selalu menghasilkan entry berantai hash.
 */
export function logAudit(
  input: unknown,
  actor?: AuditActorInput,
): AuditEvent | null {
  try {
    const parsed = auditEventInputSchema.safeParse(input);

    if (!parsed.success) {
      logger.warn("audit.invalid_event", { action: "unknown" });

      return null;
    }

    const data = parsed.data;
    // Argumen `actor` menang atas `data.actor` saat key sama. `email` datang
    // dari pemanggil dan tidak pernah melewati schema, jadi masih mentah:
    // mask setelah merge, bukan hanya di `metadata`.
    const mergedActor =
      actor || data.actor
        ? { ...(data.actor ?? {}), ...(actor ?? {}) }
        : undefined;
    const safeActor = redactActor(mergedActor);
    const entry = appendAuditEvent({
      id: crypto.randomUUID(),
      timestamp: data.timestamp ?? new Date().toISOString(),
      action: data.action,
      category: data.category,
      severity: normalizeSeverity(data.category, data.severity),
      result: data.result,
      source: data.source,
      ...(safeActor ? { actor: safeActor } : {}),
      ...(data.resource ? { resource: data.resource } : {}),
      ...(data.requestId ? { requestId: data.requestId } : {}),
      ...(data.host ? { host: data.host } : {}),
      ...(data.userAgent ? { userAgent: data.userAgent } : {}),
      // Metadata lewat redaksi yang sama dengan metrik: key sensitif dibuang.
      ...(data.metadata ? { metadata: redactTags(data.metadata) } : {}),
    });

    logger.info("audit.recorded", {
      action: entry.action,
      category: entry.category,
      severity: entry.severity,
      result: entry.result,
    });

    return entry;
  } catch {
    return null;
  }
}
