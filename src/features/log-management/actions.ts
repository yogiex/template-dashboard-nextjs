"use server";

import {
  approveDisposal,
  completeDisposal,
  scheduleDisposal,
  type DisposalQueueItem,
} from "@/features/log-management/lib/disposal-queue";
import { runScheduledDisposalSweep, verifyIntegrityWithTimestamp } from "@/features/log-management/lib/schedule";
import {
  approveDisposalSchema,
  completeDisposalSchema,
  runSweepSchema,
  scheduleDisposalSchema,
} from "@/features/log-management/schema";
import {
  AppError,
  getErrorMessage,
  type ErrorCode,
  type FieldErrors,
} from "@/lib/error";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/rate-limit";
import { requireRole, requireSession, type SessionUser } from "@/lib/rbac";

export type LogActionError = {
  code: ErrorCode;
  message: string;
  fieldErrors?: FieldErrors;
};

export type LogActionState<T> =
  | { success: true; data: T }
  | { success: false; error: LogActionError };

const SENSITIVE_ACTION_LIMIT = {
  maxAttempts: 10,
  windowMs: 60_000,
} as const;

type ValidationIssue = {
  path: PropertyKey[];
  message: string;
};

function failure(error: AppError): { success: false; error: LogActionError } {
  return {
    success: false,
    error: {
      code: error.code,
      message: error.userMessage,
      fieldErrors: error.fieldErrors,
    },
  };
}

function internalFailure(): { success: false; error: LogActionError } {
  return {
    success: false,
    error: { code: "INTERNAL_ERROR", message: getErrorMessage("INTERNAL_ERROR") },
  };
}

function parseInput<T>(
  schema: {
    safeParse: (
      input: unknown,
    ) =>
      | { success: true; data: T }
      | { success: false; error: { issues: ValidationIssue[] } };
  },
  input: unknown,
  message: string,
): T {
  const result = schema.safeParse(input);

  if (!result.success) {
    const fieldErrors = result.error.issues.reduce<FieldErrors>(
      (errors, issue) => {
        const field = issue.path[0];

        if (typeof field === "string") {
          errors[field] = [...(errors[field] ?? []), issue.message];
        }

        return errors;
      },
      {},
    );

    throw new AppError("VALIDATION_ERROR", { message, fieldErrors });
  }

  return result.data;
}

/**
 * Guard untuk aksi sensitif: session dari server, role minimal admin, dan
 * rate limit. Identitas TIDAK pernah diambil dari payload client.
 */
async function requireAdmin(
  purpose: string,
): Promise<SessionUser> {
  const session = await requireSession();

  if (!session.id) {
    throw new AppError("UNAUTHENTICATED", {
      message: "Sesi berakhir. Silakan login kembali.",
    });
  }

  enforceRateLimit(session.id, purpose, SENSITIVE_ACTION_LIMIT);
  requireRole(session, "admin");

  return session;
}

function toActor(session: SessionUser): { id: string; role: string } {
  return { id: session.id, role: session.role };
}

export async function scheduleDisposalAction(
  input: unknown,
): Promise<LogActionState<{ item: DisposalQueueItem }>> {
  try {
    const session = await requireAdmin("log-disposal-schedule");
    const data = parseInput(
      scheduleDisposalSchema,
      input,
      "Jadwal disposal tidak valid.",
    );

    const item = scheduleDisposal(data, toActor(session));

    return { success: true, data: { item } };
  } catch (error) {
    if (error instanceof AppError) {
      return failure(error);
    }

    logger.error("log-management.schedule_disposal.unexpected_error", error);

    return internalFailure();
  }
}

export async function approveDisposalAction(
  input: unknown,
): Promise<LogActionState<{ item: DisposalQueueItem }>> {
  try {
    const session = await requireAdmin("log-disposal-approve");
    const data = parseInput(
      approveDisposalSchema,
      input,
      "Keputusan disposal tidak valid.",
    );

    const item = approveDisposal(data.disposalId, data.decision, toActor(session));

    return { success: true, data: { item } };
  } catch (error) {
    if (error instanceof AppError) {
      return failure(error);
    }

    logger.error("log-management.approve_disposal.unexpected_error", error);

    return internalFailure();
  }
}

export async function completeDisposalAction(
  input: unknown,
): Promise<LogActionState<{ item: DisposalQueueItem }>> {
  try {
    const session = await requireAdmin("log-disposal-complete");
    const data = parseInput(
      completeDisposalSchema,
      input,
      "Penyelesaian disposal tidak valid.",
    );

    const item = completeDisposal(data.disposalId, data.outcome, toActor(session));

    return { success: true, data: { item } };
  } catch (error) {
    if (error instanceof AppError) {
      return failure(error);
    }

    logger.error("log-management.complete_disposal.unexpected_error", error);

    return internalFailure();
  }
}

export async function runDisposalSweepAction(
  input: unknown = {},
): Promise<LogActionState<{ processed: number; skipped: number; reason: string | null }>> {
  try {
    const session = await requireAdmin("log-disposal-sweep");
    const data = parseInput(runSweepSchema, input, "Parameter sweep tidak valid.");
    const result = runScheduledDisposalSweep(
      Date.now(),
      toActor(session),
      data.maxItems,
    );

    return {
      success: true,
      data: {
        processed: result.processed.length,
        skipped: result.skipped.length,
        reason: result.skippedReason,
      },
    };
  } catch (error) {
    if (error instanceof AppError) {
      return failure(error);
    }

    logger.error("log-management.disposal_sweep.unexpected_error", error);

    return internalFailure();
  }
}

export async function verifyIntegrityAction(): Promise<
  LogActionState<{
    verifiedAt: string | null;
    brokenAtIndex: number;
    checkedEntries: number;
  }>
> {
  try {
    const session = await requireAdmin("log-integrity-verify");
    const state = verifyIntegrityWithTimestamp();

    logger.info("log-management.integrity_verified", {
      actorId: session.id,
      brokenAtIndex: state.lastReport?.brokenAtIndex ?? null,
    });

    return {
      success: true,
      data: {
        verifiedAt: state.lastVerifiedAt,
        brokenAtIndex: state.lastReport?.brokenAtIndex ?? -1,
        checkedEntries: state.lastReport?.checkedEntries ?? 0,
      },
    };
  } catch (error) {
    if (error instanceof AppError) {
      return failure(error);
    }

    logger.error("log-management.integrity_verify.unexpected_error", error);

    return internalFailure();
  }
}
