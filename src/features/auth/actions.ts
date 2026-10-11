"use server";

import {
  AUDIT_ACTIONS,
  type AuditAction,
} from "@/features/audit/lib/categories";
import { logAudit } from "@/features/audit/lib/log-audit";
import { loginFormSchema } from "@/features/auth/schema";
import { createSession, destroySession } from "@/features/auth/session";
import { verifyCredentials } from "@/features/auth/service";
import {
  AppError,
  getErrorMessage,
  type ErrorCode,
  type FieldErrors,
} from "@/lib/error";
import { logger } from "@/lib/logger";
import { getSafeRequestContext } from "@/lib/request-context";
import { enforceRateLimit } from "@/lib/rate-limit";

/**
 * Limit auth yang diperketat dari default (5/menit) ke 5 per 15 menit.
 * Alasannya: brute force kredensial punya entropy rendah dan sering diulang;
 * jendela 15 menit membatasi percobaan otomatis tanpa mengganggu pengguna sah
 * yang salah ketik beberapa kali.
 */
const AUTH_RATE_LIMIT = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
} as const;

export type ActionError = {
  code: ErrorCode;
  message: string;
  fieldErrors?: FieldErrors;
};

export type ActionState =
  | { success: true }
  | { success: false; error: ActionError };

export type LoginActionState =
  | { success: true }
  | { success: false; error: ActionError };

type ValidationIssue = {
  path: PropertyKey[];
  message: string;
};

function actionFailure(error: AppError): ActionError {
  return {
    code: error.code,
    message: error.userMessage,
    fieldErrors: error.fieldErrors,
  };
}

function internalFailure(): ActionState {
  return {
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: getErrorMessage("INTERNAL_ERROR"),
    },
  };
}

function toFieldErrors(issues: ValidationIssue[]): FieldErrors {
  return issues.reduce<FieldErrors>((errors, issue) => {
    const field = issue.path[0];

    if (typeof field === "string") {
      errors[field] = [...(errors[field] ?? []), issue.message];
    }

    return errors;
  }, {});
}

/**
 * Catat percobaan auth yang ditolak. `reason` hanya berisi `ErrorCode` —
 * tidak pernah password, token, kode OTP, atau backup code.
 */
function auditRejected(options: {
  action: AuditAction;
  source: string;
  reason: string;
}): void {
  void logAudit({
    action: options.action,
    category: "auth",
    severity: "warning",
    result: "failure",
    source: options.source,
    metadata: { reason: options.reason },
  });
}

/** Rate limit adalah sinyal keamanan, bukan sekadar error validasi. */
function auditRateLimitHit(source: string): void {
  void logAudit({
    action: AUDIT_ACTIONS.RATE_LIMIT_HIT,
    category: "security",
    severity: "warning",
    result: "failure",
    source,
    metadata: { control: "rate-limit" },
  });
}

export async function loginAction(input: unknown): Promise<LoginActionState> {
  try {
    const result = loginFormSchema.safeParse(input);

    if (!result.success) {
      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Data login tidak valid.",
          fieldErrors: toFieldErrors(result.error.issues),
        },
      };
    }

    const data = result.data;
    const requestContext = await getSafeRequestContext();

    // Dua control dipakai bersamaan: key per email melindungi akun target, key
    // per-IP-hash (bukan IP mentah) membatasi penyerang yang merotasi email.
    // Kalau `ipHash` null (dev/proxy tanpa header) kontrol per-IP dilewati agar
    // semua pengguna lokal tidak terkunci ke satu bucket.
    if (requestContext.ipHash) {
      enforceRateLimit(requestContext.ipHash, "login-ip", AUTH_RATE_LIMIT);
    }

    enforceRateLimit(data.email, "login", AUTH_RATE_LIMIT);

    // Service melempar `AppError("UNAUTHENTICATED")` dengan pesan generik,
    // sehingga email terdaftar/tidak tidak bisa dibedakan.
    const user = await verifyCredentials(data.email, data.password);

    // Mock: store hanya punya satu user, jadi role-nya konstan. Saat backend
    // tiba, role WAJIB di-lookup dari user store — jangan dibiarkan hardcode.
    await createSession(
      { id: user.userId, role: "admin" },
      { rememberMe: data.rememberMe },
    );

    void logAudit({
      action: AUDIT_ACTIONS.LOGIN_SUCCESS,
      category: "auth",
      severity: "info",
      result: "success",
      source: "auth/login",
      actor: { id: user.userId },
    });

    // Mock latency supaya state loading form terlihat saat demo.
    await new Promise((resolve) => setTimeout(resolve, 400));

    return { success: true };
  } catch (error) {
    if (error instanceof AppError) {
      if (error.code === "RATE_LIMITED") {
        auditRateLimitHit("auth/login");
      } else {
        auditRejected({
          action: AUDIT_ACTIONS.LOGIN_REJECTED,
          source: "auth/login",
          reason: error.code,
        });
      }

      return { success: false, error: actionFailure(error) };
    }

    logger.error("auth.login.unexpected_error", error);
    auditRejected({
      action: AUDIT_ACTIONS.LOGIN_REJECTED,
      source: "auth/login",
      reason: "unknown",
    });

    return internalFailure();
  }
}

export async function logoutAction(): Promise<ActionState> {
  await destroySession();

  // Belum ada action audit `logout` di `AUDIT_ACTIONS` dan file itu adalah
  // satu-satunya sumber kebenaran nama action, jadi logout dicatat lewat
  // logger saja (tanpa logAudit) untuk sementara.
  logger.info("auth.logout");

  return { success: true };
}
