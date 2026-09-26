"use server"

import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"

import { AUDIT_ACTIONS, type AuditAction } from "@/features/audit/lib/categories"
import { logAudit } from "@/features/audit/lib/log-audit"
import { METRIC_NAMES } from "@/features/observability/lib/constants"
import { trackMetric, withMetric } from "@/features/observability/lib/track"
import { createUser, deleteUser, updateUser } from "@/features/user/service"
import { AppError, getErrorMessage, type ErrorCode, type FieldErrors } from "@/lib/error"
import { logger } from "@/lib/logger"
import { enforceRateLimit } from "@/lib/rate-limit"
import { requireRole, requireSession, type SessionUser } from "@/lib/rbac"

export type UserActionResult =
  | { success: true }
  | {
      success: false
      error: {
        code: ErrorCode
        message: string
        traceId: string
        fieldErrors?: FieldErrors
      }
    }

export type DeleteUserActionResult = UserActionResult

/**
 * Identifier rate limit: id aktor dari `requireSession()`, bukan email mentah.
 * `enforceRateLimit` dipanggil setelah session tervalidasi supaya limitnya
 * per-aktor (termasuk admin yang berebut mengubah user yang sama), bukan
 * per-proses.
 *
 * Limit memakai default (5 percobaan / 60 detik) dan sengaja tidak dikencangkan:
 * perubahan data user di dashboard adalah operasi infrequent, jadi jendela yang
 * lebih ketat hanya akan mengunci admin yang bekerja cepat tanpa menambah
 * proteksi nyata terhadap penyerang yang sudah dibatasi RBAC + audit.
 */
const USER_ACTION_RATE_LIMIT_PURPOSE = {
  create: "create-user",
  update: "update-user",
  delete: "delete-user",
} as const

function getResourceId(input: unknown): string | undefined {
  if (typeof input !== "object" || input === null || !("id" in input)) {
    return undefined
  }

  const id = String((input as { id: unknown }).id).slice(0, 64)

  return id === "" ? undefined : id
}

function failure(error: unknown, traceId: string, event: string): UserActionResult {
  if (error instanceof AppError) {
    return {
      success: false,
      error: { code: error.code, message: error.userMessage, traceId, fieldErrors: error.fieldErrors },
    }
  }
  logger.error(event, error, { traceId })
  return {
    success: false,
    error: { code: "INTERNAL_ERROR", message: getErrorMessage("INTERNAL_ERROR"), traceId },
  }
}

/**
 * Catat operasi yang ditolak. Kategori `authz` karena penolakan di boundary ini
 * berasal dari session/RBAC, bukan dari validasi payload. `reason` hanya berisi
 * `ErrorCode`; tidak ada password, email, atau payload yang ikut.
 */
function auditRejected(options: {
  action: AuditAction
  source: string
  traceId: string
  reason: string
  actor: SessionUser
  targetId?: string
}): void {
  void logAudit({
    action: options.action,
    category: "authz",
    severity: "warning",
    result: "failure",
    source: options.source,
    requestId: options.traceId,
    actor: { id: options.actor.id, role: options.actor.role },
    ...(options.targetId
      ? { resource: { type: "user", id: options.targetId } }
      : {}),
    metadata: { reason: options.reason },
  })
}

export async function createUserAction(input: unknown): Promise<UserActionResult> {
  const traceId = randomUUID()
  let session: SessionUser | null = null
  try {
    session = await requireSession()
    requireRole(session, "admin")
    enforceRateLimit(session.id, USER_ACTION_RATE_LIMIT_PURPOSE.create)
    const created = await withMetric(METRIC_NAMES.SERVER_ACTION_LATENCY, () => createUser(input), {
      action: "createUserAction",
    })
    revalidatePath("/users")
    trackMetric({ name: METRIC_NAMES.USER_CREATE, actorId: session.id })
    logger.info("user.created", { actorId: session.id, traceId })
    void logAudit({
      action: AUDIT_ACTIONS.USER_CREATED,
      category: "data",
      severity: "info",
      result: "success",
      source: "user/create",
      requestId: traceId,
      actor: { id: session.id, role: session.role },
      resource: { type: "user", id: created.id },
      metadata: { role: created.role, status: created.status },
    })
    return { success: true }
  } catch (error) {
    if (error instanceof AppError) {
      logger.info("user.create.rejected", { code: error.code, traceId })

      if (session) {
        auditRejected({
          action: AUDIT_ACTIONS.USER_CREATE_REJECTED,
          source: "user/create",
          traceId,
          reason: error.code,
          actor: session,
        })
      }
    }
    return failure(error, traceId, "user.create.unexpected_error")
  }
}

export async function updateUserAction(input: unknown): Promise<UserActionResult> {
  const traceId = randomUUID()
  const targetId = getResourceId(input)
  let session: SessionUser | null = null
  try {
    session = await requireSession()
    requireRole(session, "admin")
    enforceRateLimit(session.id, USER_ACTION_RATE_LIMIT_PURPOSE.update)
    const updated = await withMetric(METRIC_NAMES.SERVER_ACTION_LATENCY, () => updateUser(input), {
      action: "updateUserAction",
    })
    revalidatePath("/users")
    trackMetric({
      name: METRIC_NAMES.USER_UPDATE,
      actorId: session.id,
      // Catatan: `roleChanged` SENGAJA tidak dikirim. Flag itu adalah input
      // detector `privilege_change` UEBA, jadi hanya boleh dihitung dari diff
      // role sebelum/sesudah. `updateUser()` hanya mengembalikan state sesudah,
      // dan mengarang flag `true` untuk setiap update membuat detector itu
      // selalu menyala (false positive). Backend harus mengembalikan
      // before/after (atau field `roleChanged` dari service); sampai itu ada, metrik ini
      // hanya menandai bahwa ada update.
    })
    logger.info("user.updated", { actorId: session.id, traceId })
    void logAudit({
      action: AUDIT_ACTIONS.USER_UPDATED,
      category: "data",
      severity: "info",
      result: "success",
      source: "user/update",
      requestId: traceId,
      actor: { id: session.id, role: session.role },
      resource: { type: "user", id: updated.id },
      metadata: { role: updated.role, status: updated.status },
    })
    return { success: true }
  } catch (error) {
    if (error instanceof AppError) {
      logger.info("user.update.rejected", { code: error.code, traceId })

      if (session) {
        auditRejected({
          action: AUDIT_ACTIONS.USER_UPDATE_REJECTED,
          source: "user/update",
          traceId,
          reason: error.code,
          actor: session,
          ...(targetId ? { targetId } : {}),
        })
      }
    }
    return failure(error, traceId, "user.update.unexpected_error")
  }
}

export async function deleteUserAction(id: unknown): Promise<DeleteUserActionResult> {
  const traceId = randomUUID()
  const targetId = getResourceId({ id })
  let session: SessionUser | null = null
  try {
    session = await requireSession()
    requireRole(session, "admin")
    enforceRateLimit(session.id, USER_ACTION_RATE_LIMIT_PURPOSE.delete)
    await withMetric(METRIC_NAMES.SERVER_ACTION_LATENCY, () => deleteUser({ id }), {
      action: "deleteUserAction",
    })
    revalidatePath("/users")
    trackMetric({ name: METRIC_NAMES.USER_DELETE, actorId: session.id })
    logger.info("user.deleted", { actorId: session.id, targetId: targetId ?? "invalid" })
    void logAudit({
      action: AUDIT_ACTIONS.USER_DELETED,
      category: "data",
      severity: "warning",
      result: "success",
      source: "user/delete",
      requestId: traceId,
      actor: { id: session.id, role: session.role },
      ...(targetId ? { resource: { type: "user", id: targetId } } : {}),
    })
    return { success: true }
  } catch (error) {
    if (error instanceof AppError) {
      logger.info("user.delete.rejected", { code: error.code })

      if (session) {
        auditRejected({
          action: AUDIT_ACTIONS.USER_DELETE_REJECTED,
          source: "user/delete",
          traceId,
          reason: error.code,
          actor: session,
          ...(targetId ? { targetId } : {}),
        })
      }
    }
    return failure(error, traceId, "user.delete.unexpected_error")
  }
}
