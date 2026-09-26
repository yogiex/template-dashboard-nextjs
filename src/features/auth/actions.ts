"use server";

import {
  confirmEmailEnrollmentFormSchema,
  confirmTotpEnrollmentFormSchema,
  disableMfaFormSchema,
  forgotPasswordFormSchema,
  loginFormSchema,
  registerFormSchema,
  resetPasswordFormSchema,
  verifyBackupCodeFormSchema,
  verifyMfaFormSchema,
} from "@/features/auth/schema";
import {
  beginMfaChallenge,
  confirmEmailEnrollment,
  confirmTotpEnrollment,
  disableMfa,
  getMfaStatus,
  registerUser,
  requestPasswordReset,
  resendMfaEmailCode,
  resetPassword,
  startEmailEnrollment,
  startTotpEnrollment,
  verifyCredentials,
  verifyMfaBackupCode,
  verifyMfaCode,
} from "@/features/auth/service";
import {
  clearMfaSessionToken,
  readMfaSessionToken,
  setMfaSessionToken,
} from "@/features/auth/mfa-session";
import {
  AppError,
  getErrorMessage,
  type ErrorCode,
  type FieldErrors,
} from "@/lib/error";
import { AUDIT_ACTIONS, type AuditAction } from "@/features/audit/lib/categories";
import { logAudit } from "@/features/audit/lib/log-audit";
import { METRIC_NAMES } from "@/features/observability/lib/constants";
import {
  trackMetric,
  withMetric,
} from "@/features/observability/lib/track";
import { logger } from "@/lib/logger";
import { getSafeRequestContext } from "@/lib/request-context";
import { enforceRateLimit } from "@/lib/rate-limit";
import { requireSession } from "@/lib/rbac";

/**
 * Limit auth yang diperketat dari default (5/menit) ke 5 per 15 menit.
 * Alasannya: brute force kredensial, kode OTP, dan backup code semuanya punya
 * entropy rendah dan sering diulang; jendela 15 menit bluntasi percobaan otomatis
 * tanpa mengganggu pengguna sah yang salah ketik beberapa kali.
 */
const MFA_RATE_LIMIT = {
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

/** Action yang butuh payload sukses (mis. backup codes) memakai `MfaActionState`. */
export type MfaActionState<T> =
  | { success: true; data: T }
  | { success: false; error: ActionError };

/**
 * Step 1 login bisa berhenti di step 2. `mfaRequired` menandai kondisi itu
 * supaya form mengarahkan ke `/login/mfa` alih-alih menampilkan error.
 */
export type LoginActionState =
  | { success: true }
  | { success: false; mfaRequired: true; nextPath: string }
  | { success: false; mfaRequired?: false; error: ActionError };

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

function parseInput<T>(
  schema: { safeParse: (input: unknown) => { success: true; data: T } | { success: false; error: { issues: ValidationIssue[] } } },
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

/* -------------------------------------------------------------------------- */
/*                             Audit helper (auth)                             */
/* -------------------------------------------------------------------------- */

/**
 * Catat percobaan auth yang ditolak. `reason` hanya berisi `ErrorCode` —
 * tidak pernah password, token, kode OTP, atau backup code.
 */
function auditRejected(options: {
  action: AuditAction;
  source: string;
  reason: string;
  actorId?: string;
}): void {
  void logAudit({
    action: options.action,
    category: "auth",
    severity: "warning",
    result: "failure",
    source: options.source,
    ...(options.actorId ? { actor: { id: options.actorId } } : {}),
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

      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Data login tidak valid.",
          fieldErrors,
        },
      };
    }

    const requestContext = await getSafeRequestContext();

    // Dua control dipakai bersamaan: key per email melindungi akun target, key
    // per-IP-hash (bukan IP mentah) membatasi penyerang yang merotasi email.
    // Kalau `ipHash` null (dev/proxy tanpa header) kontrol per-IP dilewati agar
    // semua pengguna lokal tidak terkunci ke satu bucket.
    if (requestContext.ipHash) {
      enforceRateLimit(requestContext.ipHash, "login-ip", MFA_RATE_LIMIT);
    }

    enforceRateLimit(String(result.data.email), "login", MFA_RATE_LIMIT);

    const baseTags = {
      ip: requestContext.ipHash ?? "unknown",
      userAgent: requestContext.userAgent ?? "unknown",
    };

    trackMetric({ name: METRIC_NAMES.LOGIN_ATTEMPT, tags: baseTags });

    let userId: string | null = null;

    try {
      userId = (
        await withMetric(
          METRIC_NAMES.SERVER_ACTION_LATENCY,
          () =>
            verifyCredentials(result.data.email, result.data.password),
          { action: "loginAction" },
        )
      ).userId;
    } catch (error) {
      trackMetric({
        name: METRIC_NAMES.LOGIN_FAILURE,
        tags: { ...baseTags, code: error instanceof AppError ? error.code : "unknown" },
      });

      throw error;
    }

    trackMetric({
      name: METRIC_NAMES.LOGIN_SUCCESS,
      actorId: userId,
      tags: baseTags,
    });

    const mfaStatus = await getMfaStatus(userId);

    void logAudit({
      action: AUDIT_ACTIONS.LOGIN_SUCCESS,
      category: "auth",
      severity: "info",
      result: "success",
      source: "auth/login",
      actor: { id: userId },
      metadata: { mfaPending: String(mfaStatus.enabled) },
    });

    // Mock latency supaya state loading form terlihat saat demo.
    await new Promise((resolve) => setTimeout(resolve, 400));

    if (!mfaStatus.enabled) {
      return { success: true };
    }

    const { token } = await beginMfaChallenge(userId);

    await setMfaSessionToken(token);
    trackMetric({ name: METRIC_NAMES.MFA_CHALLENGE, actorId: userId, tags: baseTags });

    return { success: false, mfaRequired: true, nextPath: "/login/mfa" };
  } catch (error) {
    if (error instanceof AppError) {
      if (error.code === "RATE_LIMITED") {
        trackMetric({ name: METRIC_NAMES.RATE_LIMIT_HIT, tags: { action: "loginAction" } });
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
    auditRejected({ action: AUDIT_ACTIONS.LOGIN_REJECTED, source: "auth/login", reason: "unknown" });

    return {
      success: false,
      error: { code: "INTERNAL_ERROR", message: getErrorMessage("INTERNAL_ERROR") },
    };
  }
}

function getEmailHint(input: unknown): string {
  if (typeof input !== "object" || input === null || !("email" in input)) {
    return "unknown";
  }

  return String((input as { email: unknown }).email).slice(0, 254);
}

export async function registerAction(input: unknown): Promise<ActionState> {
  try {
    const emailHint = getEmailHint(input);
    enforceRateLimit(emailHint, "register");
    enforceRateLimit("global", "register");

    const data = parseInput(
      registerFormSchema,
      input,
      "registerAction: payload gagal validasi",
    );

    await registerUser(data);

    void logAudit({
      action: AUDIT_ACTIONS.REGISTER_SUCCESS,
      category: "auth",
      severity: "info",
      result: "success",
      source: "auth/register",
      metadata: { channel: "self-service" },
    });

    return { success: true };
  } catch (error) {
    if (error instanceof AppError) {
      if (error.code === "RATE_LIMITED") {
        auditRateLimitHit("auth/register");
      } else {
        auditRejected({
          action: AUDIT_ACTIONS.REGISTER_REJECTED,
          source: "auth/register",
          reason: error.code,
        });
      }

      return { success: false, error: actionFailure(error) };
    }

    logger.error("auth.register.unexpected_error", error);
    auditRejected({
      action: AUDIT_ACTIONS.REGISTER_REJECTED,
      source: "auth/register",
      reason: "unknown",
    });

    return internalFailure();
  }
}

export async function forgotPasswordAction(
  input: unknown,
): Promise<ActionState> {
  try {
    enforceRateLimit(getEmailHint(input), "forgot-password");

    const data = parseInput(
      forgotPasswordFormSchema,
      input,
      "forgotPasswordAction: payload gagal validasi",
    );

    await requestPasswordReset(data);

    void logAudit({
      action: AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED,
      category: "auth",
      severity: "info",
      result: "success",
      source: "auth/password-reset-request",
      metadata: { channel: "self-service" },
    });

    return { success: true };
  } catch (error) {
    if (error instanceof AppError) {
      if (error.code === "RATE_LIMITED") {
        auditRateLimitHit("auth/password-reset-request");
      } else {
        auditRejected({
          action: AUDIT_ACTIONS.PASSWORD_RESET_REQUEST_REJECTED,
          source: "auth/password-reset-request",
          reason: error.code,
        });
      }

      return { success: false, error: actionFailure(error) };
    }

    logger.error("auth.forgot_password.unexpected_error", error);
    auditRejected({
      action: AUDIT_ACTIONS.PASSWORD_RESET_REQUEST_REJECTED,
      source: "auth/password-reset-request",
      reason: "unknown",
    });

    return { success: true };
  }
}

function getTokenHint(input: unknown): string {
  if (typeof input !== "object" || input === null || !("token" in input)) {
    return "unknown";
  }

  // Token reset bersifat opaque, bukan PII, jadi aman dipakai sebagai identifier.
  return String((input as { token: unknown }).token).slice(0, 64);
}

export async function resetPasswordAction(input: unknown): Promise<ActionState> {
  try {
    // Limit default (5 percobaan/menit) dipakai: token reset 64 hex sulit
    // ditebak, jadi tidak perlu jendela yang lebih ketat dari endpoint lain.
    enforceRateLimit(getTokenHint(input), "reset-password");

    const data = parseInput(
      resetPasswordFormSchema,
      input,
      "resetPasswordAction: payload gagal validasi",
    );

    await resetPassword(data);

    void logAudit({
      action: AUDIT_ACTIONS.PASSWORD_RESET_COMPLETED,
      category: "auth",
      severity: "info",
      result: "success",
      source: "auth/password-reset",
    });

    return { success: true };
  } catch (error) {
    if (error instanceof AppError) {
      logger.info("auth.reset_password.rejected", { code: error.code });

      if (error.code === "RATE_LIMITED") {
        auditRateLimitHit("auth/password-reset");
      } else {
        auditRejected({
          action: AUDIT_ACTIONS.PASSWORD_RESET_REJECTED,
          source: "auth/password-reset",
          reason: error.code,
        });
      }

      return { success: false, error: actionFailure(error) };
    }

    logger.error("auth.reset_password.unexpected_error", error);
    auditRejected({
      action: AUDIT_ACTIONS.PASSWORD_RESET_REJECTED,
      source: "auth/password-reset",
      reason: "unknown",
    });

    return internalFailure();
  }
}

/* -------------------------------------------------------------------------- */
/*                                 MFA Actions                                */
/* -------------------------------------------------------------------------- */

async function requireMfaToken(): Promise<string> {
  const token = await readMfaSessionToken();

  if (!token) {
    throw new AppError("UNAUTHENTICATED", {
      message: "Sesi verifikasi tidak ditemukan. Silakan masuk kembali.",
    });
  }

  return token;
}

/**
 * Dua tahap yang dibedakan guard-nya, dan jangan dicampur:
 *
 * 1. **Tantangan login** (`verifyMfaAction`, `verifyBackupCodeAction`,
 *    `resendMfaCodeAction`) berjalan SEBELUM session ada. Identitasnya adalah
 *    token tantangan pending di cookie httpOnly (`requireMfaToken()`), bukan
 *    session. Menaruh `requireSession()` di sini akan membuat login MFA tidak
 *    bisa pernah berhasil.
 * 2. **Pengaturan MFA** (lima action di bawah: mulai/konfirmasi enrolment TOTP
 *    dan email, serta disable) adalah operasi atas akun yang sudah login, jadi
 *    sumber identitasnya `requireSession()` dan tidak boleh ada konstanta user
 *    di mana pun.
 *
 * Tidak ada `requireRole()` di kelompok kedua: ini self-service, dampaknya
 * hanya pada akun pemanggil sendiri, jadi role `viewer` pun berhak. Yang
 * sebelumnya hilang justru session-nya.
 *
 * `requireSession()` (bukan `requireSessionForDev()`): affordance bypass dev
 * hanya untuk halaman, tidak pernah diwarisi Server Action. Kegagalan guard
 * dilempar sebagai `AppError("UNAUTHENTICATED")` dan ditangkap `catch` di
 * bawah menjadi envelope `UNAUTHENTICATED` — tidak pernah keluar ke client
 * sebagai exception.
 */

export async function verifyMfaAction(input: unknown): Promise<ActionState> {
  try {
    const data = parseInput(
      verifyMfaFormSchema,
      input,
      "verifyMfaAction: payload gagal validasi",
    );
    const token = await requireMfaToken();

    enforceRateLimit(token, "mfa-verify", MFA_RATE_LIMIT);

    const result = await withMetric(
      METRIC_NAMES.SERVER_ACTION_LATENCY,
      () => verifyMfaCode(token, data.code),
      { action: "verifyMfaAction" },
    ).catch((error: unknown) => {
      trackMetric({ name: METRIC_NAMES.MFA_FAILURE, tags: { via: "otp" } });
      throw error;
    });

    await clearMfaSessionToken();
    trackMetric({ name: METRIC_NAMES.MFA_SUCCESS, actorId: result.userId, tags: { via: "otp" } });

    void logAudit({
      action: AUDIT_ACTIONS.MFA_VERIFY_SUCCESS,
      category: "auth",
      severity: "info",
      result: "success",
      source: "auth/mfa-verify",
      actor: { id: result.userId },
      // `via` hanya metode; kode OTP tidak pernah masuk audit.
      metadata: { via: "otp" },
    });

    return { success: true };
  } catch (error) {
    if (error instanceof AppError) {
      logger.info("auth.mfa.rejected", { code: error.code });

      if (error.code === "RATE_LIMITED") {
        auditRateLimitHit("auth/mfa-verify");
        await clearMfaSessionToken();
      } else {
        auditRejected({
          action: AUDIT_ACTIONS.MFA_VERIFY_REJECTED,
          source: "auth/mfa-verify",
          reason: error.code,
        });
      }

      return { success: false, error: actionFailure(error) };
    }

    logger.error("auth.mfa.unexpected_error", error);
    auditRejected({
      action: AUDIT_ACTIONS.MFA_VERIFY_REJECTED,
      source: "auth/mfa-verify",
      reason: "unknown",
    });

    return {
      success: false,
      error: { code: "INTERNAL_ERROR", message: getErrorMessage("INTERNAL_ERROR") },
    };
  }
}

export async function verifyBackupCodeAction(
  input: unknown,
): Promise<ActionState> {
  try {
    const data = parseInput(
      verifyBackupCodeFormSchema,
      input,
      "verifyBackupCodeAction: payload gagal validasi",
    );
    const token = await requireMfaToken();

    enforceRateLimit(token, "mfa-backup", MFA_RATE_LIMIT);

    const result = await withMetric(
      METRIC_NAMES.SERVER_ACTION_LATENCY,
      () => verifyMfaBackupCode(token, data.code),
      { action: "verifyBackupCodeAction" },
    ).catch((error: unknown) => {
      trackMetric({ name: METRIC_NAMES.MFA_FAILURE, tags: { via: "backup-code" } });
      throw error;
    });

    await clearMfaSessionToken();
    trackMetric({
      name: METRIC_NAMES.MFA_SUCCESS,
      actorId: result.userId,
      tags: { via: "backup-code" },
    });

    void logAudit({
      action: AUDIT_ACTIONS.MFA_BACKUP_VERIFY_SUCCESS,
      category: "auth",
      severity: "info",
      result: "success",
      source: "auth/mfa-backup",
      actor: { id: result.userId },
      // Backup code dipakai sekali dan tidak boleh masuk audit/metric.
      metadata: { via: "backup-code" },
    });

    return { success: true };
  } catch (error) {
    if (error instanceof AppError) {
      logger.info("auth.mfa_backup.rejected", { code: error.code });

      if (error.code === "RATE_LIMITED") {
        auditRateLimitHit("auth/mfa-backup");
        await clearMfaSessionToken();
      } else {
        auditRejected({
          action: AUDIT_ACTIONS.MFA_BACKUP_VERIFY_REJECTED,
          source: "auth/mfa-backup",
          reason: error.code,
        });
      }

      return { success: false, error: actionFailure(error) };
    }

    logger.error("auth.mfa_backup.unexpected_error", error);
    auditRejected({
      action: AUDIT_ACTIONS.MFA_BACKUP_VERIFY_REJECTED,
      source: "auth/mfa-backup",
      reason: "unknown",
    });

    return {
      success: false,
      error: { code: "INTERNAL_ERROR", message: getErrorMessage("INTERNAL_ERROR") },
    };
  }
}

export async function resendMfaCodeAction(): Promise<ActionState> {
  try {
    const token = await requireMfaToken();

    // 3 permintaan per 10 menit: setiap resend mengirim email dan memperbesar
    // permukaan enumerate OTP, jadi jendela diperketat dari default dengan alasan
    // ini (bukan angka acak).
    enforceRateLimit(token, "mfa-resend", {
      maxAttempts: 3,
      windowMs: 10 * 60 * 1000,
    });
    await resendMfaEmailCode(token);

    void logAudit({
      action: AUDIT_ACTIONS.MFA_CODE_RESENT,
      category: "auth",
      severity: "info",
      result: "success",
      source: "auth/mfa-resend",
    });

    return { success: true };
  } catch (error) {
    if (error instanceof AppError) {
      if (error.code === "RATE_LIMITED") {
        auditRateLimitHit("auth/mfa-resend");
      } else {
        auditRejected({
          action: AUDIT_ACTIONS.MFA_RESEND_REJECTED,
          source: "auth/mfa-resend",
          reason: error.code,
        });
      }

      return { success: false, error: actionFailure(error) };
    }

    logger.error("auth.mfa_resend.unexpected_error", error);
    auditRejected({
      action: AUDIT_ACTIONS.MFA_RESEND_REJECTED,
      source: "auth/mfa-resend",
      reason: "unknown",
    });

    return {
      success: false,
      error: { code: "INTERNAL_ERROR", message: getErrorMessage("INTERNAL_ERROR") },
    };
  }
}

export async function startTotpEnrollmentAction(): Promise<
  MfaActionState<{ enrollmentId: string; secret: string; otpauthUrl: string }>
> {
  try {
    const session = await requireSession();
    const data = await startTotpEnrollment(session.id);

    return { success: true, data };
  } catch (error) {
    if (error instanceof AppError) {
      logger.info("auth.mfa_totp_start.rejected", { code: error.code });

      return { success: false, error: actionFailure(error) };
    }

    logger.error("auth.mfa_totp_start.unexpected_error", error);

    return {
      success: false,
      error: { code: "INTERNAL_ERROR", message: getErrorMessage("INTERNAL_ERROR") },
    };
  }
}

export async function confirmTotpEnrollmentAction(input: unknown): Promise<
  MfaActionState<{ backupCodes: string[] }>
> {
  try {
    const session = await requireSession();
    const data = parseInput(
      confirmTotpEnrollmentFormSchema,
      input,
      "confirmTotpEnrollmentAction: payload gagal validasi",
    );

    // Key rate limit ikut `session.id`, bukan `enrollmentId` dari client:
    // enrollmentId berasal dari payload, jadi memakainya sebagai key membuka
    // celah memulai jendela baru setiap kali id-nya diacak.
    enforceRateLimit(session.id, "mfa-enroll-totp", MFA_RATE_LIMIT);

    // `session.id` diteruskan supaya service bisa menolak enrolment milik akun
    // lain, bukan cuma enrollmentId yang tidak dikenal.
    const result = await confirmTotpEnrollment(
      data.enrollmentId,
      data.code,
      session.id,
    );

    return { success: true, data: result };
  } catch (error) {
    if (error instanceof AppError) {
      logger.info("auth.mfa_totp_confirm.rejected", { code: error.code });

      return { success: false, error: actionFailure(error) };
    }

    logger.error("auth.mfa_totp_confirm.unexpected_error", error);

    return {
      success: false,
      error: { code: "INTERNAL_ERROR", message: getErrorMessage("INTERNAL_ERROR") },
    };
  }
}

export async function startEmailEnrollmentAction(): Promise<
  MfaActionState<{ enrollmentId: string; maskedEmail: string; expiresAt: number }>
> {
  try {
    const session = await requireSession();
    const data = await startEmailEnrollment(session.id);

    return { success: true, data };
  } catch (error) {
    if (error instanceof AppError) {
      logger.info("auth.mfa_email_start.rejected", { code: error.code });

      return { success: false, error: actionFailure(error) };
    }

    logger.error("auth.mfa_email_start.unexpected_error", error);

    return {
      success: false,
      error: { code: "INTERNAL_ERROR", message: getErrorMessage("INTERNAL_ERROR") },
    };
  }
}

export async function confirmEmailEnrollmentAction(input: unknown): Promise<
  MfaActionState<{ backupCodes: string[] }>
> {
  try {
    const session = await requireSession();
    const data = parseInput(
      confirmEmailEnrollmentFormSchema,
      input,
      "confirmEmailEnrollmentAction: payload gagal validasi",
    );

    // Sama seperti TOTP: key per-aktor dari server, bukan id dari payload.
    enforceRateLimit(session.id, "mfa-enroll-email", MFA_RATE_LIMIT);

    const result = await confirmEmailEnrollment(
      data.enrollmentId,
      data.code,
      session.id,
    );

    return { success: true, data: result };
  } catch (error) {
    if (error instanceof AppError) {
      logger.info("auth.mfa_email_confirm.rejected", { code: error.code });

      return { success: false, error: actionFailure(error) };
    }

    logger.error("auth.mfa_email_confirm.unexpected_error", error);

    return {
      success: false,
      error: { code: "INTERNAL_ERROR", message: getErrorMessage("INTERNAL_ERROR") },
    };
  }
}

export async function disableMfaAction(input: unknown): Promise<ActionState> {
  try {
    const session = await requireSession();
    const data = parseInput(
      disableMfaFormSchema,
      input,
      "disableMfaAction: payload gagal validasi",
    );

    // Dampaknya hanya akun sendiri (password tetap diverifikasi service), tapi
    // ini tetap perubahan security state, jadi limit per-aktor tetap berlaku.
    enforceRateLimit(session.id, "mfa-disable", MFA_RATE_LIMIT);
    await disableMfa(session.id, data.password);

    return { success: true };
  } catch (error) {
    if (error instanceof AppError) {
      logger.info("auth.mfa_disable.rejected", { code: error.code });

      return { success: false, error: actionFailure(error) };
    }

    logger.error("auth.mfa_disable.unexpected_error", error);

    return {
      success: false,
      error: { code: "INTERNAL_ERROR", message: getErrorMessage("INTERNAL_ERROR") },
    };
  }
}
