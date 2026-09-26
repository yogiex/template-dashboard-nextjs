"use server";

import { randomUUID } from "node:crypto";

import { logAudit } from "@/features/audit/lib/log-audit";
import { auditQuerySchema, type AuditQuery } from "@/features/audit/schema";
import {
  getAuditSummary,
  queryAuditEvents,
  verifyAuditIntegrity,
  type AuditPage,
} from "@/features/audit/service";
import type { IntegrityReport } from "@/features/audit/types";
import {
  AppError,
  getErrorMessage,
  type ErrorCode,
  type FieldErrors,
} from "@/lib/error";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/rate-limit";
import { requireRole, requireSession, type SessionUser } from "@/lib/rbac";

export type AuditActionError = {
  code: ErrorCode;
  message: string;
  traceId: string;
  fieldErrors?: FieldErrors;
};

export type AuditActionState<T> =
  | { success: true; data: T; traceId: string }
  | { success: false; error: AuditActionError };

export type AuditSummary = ReturnType<typeof getAuditSummary>;

export type AuditOverview = {
  summary: AuditSummary;
  integrity: IntegrityReport;
};

/**
 * Identifier rate limit: id aktor dari `requireSession()`, bukan email mentah,
 * dan `enforceRateLimit` dipanggil setelah session tervalidasi supaya limitnya
 * per-aktor. Default (5 percobaan / 60 detik) dipakai apa adanya: satu render
 * halaman audit = satu panggilan, jadi jendela yang lebih ketat hanya akan
 * mengunci admin yang berpindah filter cepat, sementara yang diintai adalah
 * pengulangan pertanyaan dalam waktu singkat, bukan navigasi biasa.
 */
const AUDIT_ACTION_RATE_LIMIT_PURPOSE = {
  query: "audit-read",
  overview: "audit-overview",
} as const;

function failure<T>(
  error: unknown,
  traceId: string,
  event: string,
): AuditActionState<T> {
  if (error instanceof AppError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.userMessage,
        traceId,
        ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
      },
    };
  }

  logger.error(event, error, { traceId });

  return {
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: getErrorMessage("INTERNAL_ERROR"),
      traceId,
    },
  };
}

/**
 * Guard untuk akses baca audit log: session dari server, role minimal admin,
 * lalu rate limit per-aktor. Identitas tidak pernah diambil dari payload client.
 *
 * Fail-closed sejak `requireSession()` di `src/lib/rbac.ts` berhenti mengembalikan
 * placeholder: tanpa sesi terverifikasi fungsi itu melempar `UNAUTHENTICATED`
 * (401), jadi guard di bawah ini benar-benar menolak pemanggil tanpa sesi dan
 * `requireRole()` baru menolak ketika role-nya kurang. Guard ini sekarang
 * security boundary, bukan dekorasi.
 *
 * TODO(Sprint 7.3): enforcement identitas yang sebenarnya belum ada. Sampai
 * `getSessionFromRequest()` membaca cookie/session dari server, tidak ada
 * identitas terverifikasi sama sekali — jadi di template ini `requireSession()`
 * menolak SEMUA pemanggil, termasuk yang sah. `requireSessionForDev()` (opt-in
 * lokal: `DEV_AUTH_BYPASS=1` DAN `NODE_ENV` bukan production) adalah satu-satunya
 * cara mendapat sesi placeholder. Guard tetap ditulis sekarang supaya bentuk
 * dan urutan pemeriksaan sama dengan action lain dan tidak ada jalur baca audit
 * tanpa jejak. Jangan dihapus, dan jangan dianggap tergantikan oleh guard di
 * halaman atau komponen — enforcement hanya berlaku di server.
 */
async function requireAuditReader(
  purpose: string,
): Promise<SessionUser> {
  const session = await requireSession();

  requireRole(session, "admin");
  enforceRateLimit(session.id, purpose);

  return session;
}

function parseQuery(input: unknown): AuditQuery {
  const parsed = auditQuerySchema.safeParse(input ?? {});

  if (!parsed.success) {
    const fieldErrors = parsed.error.issues.reduce<FieldErrors>(
      (errors, issue) => {
        const field = issue.path[0];

        if (typeof field === "string") {
          errors[field] = [...(errors[field] ?? []), issue.message];
        }

        return errors;
      },
      {},
    );

    throw new AppError("VALIDATION_ERROR", {
      message: "Filter audit log tidak valid.",
      fieldErrors,
    });
  }

  return parsed.data;
}

/**
 * Catat penolakan membaca audit log. Kategori `authz` karena penolakan di
 * boundary ini berasal dari session/RBAC, bukan dari validasi payload.
 * `reason` hanya berisi `ErrorCode`; tidak ada filter, email, atau payload.
 */
function auditRejected(options: {
  action: string;
  source: string;
  traceId: string;
  reason: string;
  actor: SessionUser;
}): void {
  void logAudit({
    action: options.action,
    category: "authz",
    severity: "warning",
    result: "failure",
    source: options.source,
    requestId: options.traceId,
    actor: { id: options.actor.id, role: options.actor.role },
    resource: { type: "audit_log", id: "read" },
    metadata: { reason: options.reason },
  });
}

/**
 * Baca satu halaman audit log. Query event adalah akses data sensitif, jadi
 * pembacaannya sendiri dicatat lewat `logAudit` (kategori `security`).
 *
 * Event pencatatannya ditulis SETELAH snapshot diambil, jadi entry "audit
 * diquery" ini tidak ikut muncul di halaman yang dikembalikan. Itu disengaja:
 * yang diaudit adalah aksesnya, bukan hasil filternya.
 */
export async function queryAuditEventsAction(
  input: unknown,
): Promise<AuditActionState<AuditPage>> {
  const traceId = randomUUID();
  let session: SessionUser | null = null;

  try {
    session = await requireAuditReader(AUDIT_ACTION_RATE_LIMIT_PURPOSE.query);
    const query = parseQuery(input);
    const page = queryAuditEvents(query);

    logger.info("audit.query.read", {
      actorId: session.id,
      traceId,
      total: page.total,
    });

    void logAudit({
      action: "audit_log_queried",
      category: "security",
      severity: "info",
      result: "success",
      source: "audit/query",
      requestId: traceId,
      actor: { id: session.id, role: session.role },
      resource: { type: "audit_log", id: "read" },
      metadata: {
        total: page.total,
        page: page.page,
        pageSize: page.pageSize,
        ...(query.category ? { category: query.category } : {}),
        ...(query.severity ? { severity: query.severity } : {}),
      },
    });

    return { success: true, data: page, traceId };
  } catch (error) {
    if (error instanceof AppError) {
      logger.info("audit.query.rejected", {
        actorId: session?.id ?? "unavailable",
        code: error.code,
        traceId,
      });

      if (session) {
        auditRejected({
          action: "audit_log_query_rejected",
          source: "audit/query",
          traceId,
          reason: error.code,
          actor: session,
        });
      }
    }

    return failure(error, traceId, "audit.query.unexpected_error");
  }
}

/**
 * Ringkasan 24 jam + laporan integritas rantai hash untuk dasbor audit.
 * Verifikasi integritas menghitung ulang hash tiap entry, jadi ini operasi
 * reading yang lebih berat daripada `queryAuditEventsAction` dan memakai
 * purpose rate limit sendiri.
 */
export async function getAuditOverviewAction(): Promise<
  AuditActionState<AuditOverview>
> {
  const traceId = randomUUID();
  let session: SessionUser | null = null;

  try {
    session = await requireAuditReader(AUDIT_ACTION_RATE_LIMIT_PURPOSE.overview);
    const summary = getAuditSummary();
    const integrity = verifyAuditIntegrity();

    logger.info("audit.overview.read", {
      actorId: session.id,
      traceId,
      total24h: summary.total24h,
      brokenAtIndex: integrity.brokenAtIndex,
    });

    void logAudit({
      action: "audit_overview_read",
      category: "security",
      severity: "info",
      result: "success",
      source: "audit/overview",
      requestId: traceId,
      actor: { id: session.id, role: session.role },
      resource: { type: "audit_log", id: "overview" },
      metadata: {
        total24h: summary.total24h,
        checkedEntries: integrity.checkedEntries,
      },
    });

    return {
      success: true,
      data: { summary, integrity },
      traceId,
    };
  } catch (error) {
    if (error instanceof AppError) {
      logger.info("audit.overview.rejected", {
        actorId: session?.id ?? "unavailable",
        code: error.code,
        traceId,
      });

      if (session) {
        auditRejected({
          action: "audit_overview_read_rejected",
          source: "audit/overview",
          traceId,
          reason: error.code,
          actor: session,
        });
      }
    }

    return failure(error, traceId, "audit.overview.unexpected_error");
  }
}
