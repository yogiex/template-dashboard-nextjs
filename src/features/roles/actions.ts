"use server"

import { randomUUID } from "node:crypto"

import { AppError, getErrorMessage, type ErrorCode, type FieldErrors } from "@/lib/error"
import { logger } from "@/lib/logger"
import { enforceRateLimit } from "@/lib/rate-limit"
import { requireRole, requireSession } from "@/lib/rbac"

export type RoleReference = {
  id: "admin" | "editor" | "viewer"
  name: string
  description: string
}

export type GetRolesActionResult =
  | { success: true; data: RoleReference[]; traceId: string }
  | {
      success: false
      error: {
        code: ErrorCode
        message: string
        traceId: string
        fieldErrors?: FieldErrors
      }
    }

const ROLES: RoleReference[] = [
  {
    id: "admin",
    name: "Administrator",
    description: "Akses penuh ke seluruh fitur dan pengaturan sistem.",
  },
  {
    id: "editor",
    name: "Editor",
    description: "Akses untuk mengelola konten dan data operasional.",
  },
  {
    id: "viewer",
    name: "Viewer",
    description: "Akses baca untuk melihat data yang diizinkan.",
  },
]

function failure(
  error: unknown,
  traceId: string,
  event: string,
): GetRolesActionResult {
  if (error instanceof AppError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.userMessage,
        traceId,
        fieldErrors: error.fieldErrors,
      },
    }
  }

  logger.error(event, error, { traceId })
  return {
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: getErrorMessage("INTERNAL_ERROR"),
      traceId,
    },
  }
}

export async function getRolesAction(): Promise<GetRolesActionResult> {
  const traceId = randomUUID()
  let actorId = "unavailable"

  try {
    const session = await requireSession()
    actorId = session.id
    enforceRateLimit(actorId, "roles-read")
    requireRole(session, "admin")
    logger.info("roles.read", { actorId, traceId })

    return {
      success: true,
      data: ROLES.map((role) => ({ ...role })),
      traceId,
    }
  } catch (error) {
    if (error instanceof AppError) {
      logger.info("roles.read.rejected", {
        actorId,
        code: error.code,
        traceId,
      })
    }

    return failure(error, traceId, "roles.read.unexpected_error")
  }
}
