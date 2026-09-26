import "server-only";

import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

import { AUTH_PAGE_CONFIG } from "@/config/auth-pages";
import type {
  AuthPageConfig,
  ForgotPasswordFormValues,
  MfaMethod,
  RegisterFormValues,
  ResetPasswordFormValues,
} from "@/features/auth/schema";
import { AppError } from "@/lib/error";
import { logger } from "@/lib/logger";
import {
  buildOtpAuthUrl,
  generateTotpSecret,
  verifyTotpCode,
} from "@/lib/totp";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

/**
 * Mock seluruh state MFA. Saat backend siap, pindahkan ke tabel
 * `mfa_enrollments` (secret, hash backup code) + `mfa_challenges` (token hash).
 * Ingat: Map in-memory hilang saat restart dan tidak aman untuk multi-instance.
 */
export const MFA_CHALLENGE_TTL_MS = 10 * 60 * 1000;
export const MFA_ENROLLMENT_TTL_MS = 10 * 60 * 1000;
export const MFA_EMAIL_RESEND_COOLDOWN_MS = 30 * 1000;
export const MFA_BACKUP_CODE_COUNT = 10;
export const MFA_MAX_ATTEMPTS = 5;
export const MFA_INVALID_CODE_MESSAGE =
  "Kode tidak valid atau sudah kedaluwarsa.";

/**
 * Kode demo untuk email OTP dan fallback TOTP. Hanya aktif di luar production.
 *
 * SENGAJA tidak di-export (AUTH-32): nilai ini cukup untuk melewati verifikasi
 * OTP, jadi ia tidak boleh masuk jalur client. Yang dirender UI adalah `isDemoMode`
 * dari `process.env.NODE_ENV` plus copy di `src/config/mfa-pages.ts` — hint teks
 * tidak butuh nilai kodenya sendiri, jadi tidak ada alasan konstanta ini keluar
 * dari modul `server-only` ini.
 */
const MFA_DEMO_CODE = "123456";

/**
 * Id user mock. Store ini hanya punya satu baris, jadi id-nya disamakan dengan
 * `DEV_PLACEHOLDER_SESSION.id` di `src/lib/rbac.ts`: saat `DEV_AUTH_BYPASS=1`,
 * guard mengembalikan sesi dengan id tersebut, dan `getUserOrThrow()` akan
 * menolaknya kalau id mockstore berbeda — alur MFA jadi tidak bisa dicoba lokal.
 *
 * Ganti seluruh store ini dengan tabel user backend; setelah itu id session
 * selalu berasal dari `requireSession()` dan tidak ada nilai mock yang perlu
 * dicocokkan.
 */
const MOCK_USER_ID = "usr_placeholder";
const BACKUP_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // tanpa 0/O/1/I
const MFA_EXPIRED_MESSAGE =
  "Sesi verifikasi tidak valid atau sudah berakhir. Silakan masuk kembali.";

const isDemoMode = process.env.NODE_ENV !== "production";

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateResetToken(): {
  token: string;
  tokenHash: string;
  expiresAt: Date;
} {
  const token = randomBytes(32).toString("hex");

  return {
    token,
    tokenHash: hashResetToken(token),
    expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
  };
}

export async function getAuthPageConfig(): Promise<AuthPageConfig> {
  return AUTH_PAGE_CONFIG;
}

/* -------------------------------------------------------------------------- */
/*                              Mock user store                               */
/* -------------------------------------------------------------------------- */

type MfaEnrollment = {
  method: MfaMethod;
  secret: string | null;
  backupCodeHashes: Set<string>;
  enabledAt: number;
};

type MockUser = {
  id: string;
  email: string;
  password: string;
  mfa: MfaEnrollment | null;
};

// Kredensial demo hanya untuk mock. Ganti dengan session + user store.
const users = new Map<string, MockUser>([
  [
    MOCK_USER_ID,
    {
      id: MOCK_USER_ID,
      email: "demo@example.com",
      password: "password123",
      mfa: null,
    },
  ],
]);

export type AuthenticatedUser = { userId: string; email: string };

function findUserByEmail(email: string): MockUser | null {
  for (const user of users.values()) {
    if (user.email === email) {
      return user;
    }
  }

  return null;
}

function getUserOrThrow(userId: string): MockUser {
  const user = users.get(userId);

  if (!user) {
    throw new AppError("UNAUTHENTICATED", { message: "Sesi berakhir." });
  }

  return user;
}

/**
 * Satu-satunya pintu verifikasi kredensial. Pesan error sengaja generik dan
 * tidak memakai `fieldErrors` supaya email terdaftar/tidak tidak bisa dibedakan.
 */
export async function verifyCredentials(
  email: string,
  password: string,
): Promise<AuthenticatedUser> {
  const user = findUserByEmail(email);

  if (!user || !safeEqual(user.password, password)) {
    logger.warn("auth.login.rejected");

    throw new AppError("UNAUTHENTICATED", {
      message: "Email atau kata sandi salah.",
    });
  }

  return { userId: user.id, email: user.email };
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export type RegisterResult = { userId: string };

export async function registerUser(
  input: RegisterFormValues
): Promise<RegisterResult> {
  void input;
  throw new Error("NOT_IMPLEMENTED: registerUser menunggu Sprint 4 (DB + auth)");
}

type StoredResetToken = {
  expiresAt: number;
  usedAt: number | null;
};

// Mock store. Ganti dengan tabel DB saat Sprint 4 (hash token, bukan token mentah).
const resetTokensByHash = new Map<string, StoredResetToken>();

function purgeExpiredResetTokens(now: number): void {
  for (const [hash, entry] of resetTokensByHash) {
    if (entry.expiresAt <= now) {
      resetTokensByHash.delete(hash);
    }
  }
}

export async function requestPasswordReset(
  input: ForgotPasswordFormValues
): Promise<{ sent: true }> {
  const { token, tokenHash, expiresAt } = generateResetToken();
  const now = Date.now();
  const expiresInMinutes = Math.round((expiresAt.getTime() - now) / 60000);

  purgeExpiredResetTokens(now);
  resetTokensByHash.clear();

  resetTokensByHash.set(tokenHash, {
    expiresAt: expiresAt.getTime(),
    usedAt: null,
  });

  // Tautan reset hanya log di development. Di production NEVER log token.
  logger.info("auth.reset.requested", {
    expiresInMinutes,
    ...(isDemoMode ? { resetPath: `/reset-password?token=${token}` } : {}),
  });

  void input;

  return { sent: true };
}

export async function verifyResetToken(token: string): Promise<boolean> {
  const hash = hashResetToken(token);
  const entry = resetTokensByHash.get(hash);

  if (!entry) {
    return false;
  }

  return entry.usedAt === null && entry.expiresAt > Date.now();
}

export async function resetPassword(
  input: ResetPasswordFormValues
): Promise<void> {
  const hash = hashResetToken(input.token);
  const entry = resetTokensByHash.get(hash);

  if (!entry || entry.usedAt !== null || entry.expiresAt <= Date.now()) {
    throw new AppError("VALIDATION_ERROR", {
      message: "Tautan reset password tidak valid atau sudah kedaluwarsa.",
      fieldErrors: { token: ["Tautan tidak valid atau sudah kedaluwarsa."] },
    });
  }

  entry.usedAt = Date.now();

  logger.info("auth.reset.completed", { singleUse: true });
}

/* -------------------------------------------------------------------------- */
/*                            MFA (mock in-memory)                            */
/* -------------------------------------------------------------------------- */

type PendingChallenge = {
  userId: string;
  method: MfaMethod;
  maskedEmail: string;
  expiresAt: number;
  attempts: number;
  emailCodeSentAt: number | null;
};

type TotpEnrollment = {
  userId: string;
  secret: string;
  expiresAt: number;
};

type EmailEnrollment = {
  userId: string;
  expiresAt: number;
  codeSentAt: number;
};

export type MfaChallenge = {
  token: string;
  method: MfaMethod;
  maskedEmail: string;
  expiresAt: number;
};

export type MfaStatus = {
  enabled: boolean;
  method: MfaMethod | null;
  enabledAt: number | null;
  remainingBackupCodes: number;
};

const challengesByToken = new Map<string, PendingChallenge>();
const totpEnrollments = new Map<string, TotpEnrollment>();
const emailEnrollments = new Map<string, EmailEnrollment>();

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");

  if (!local || !domain) {
    return "email Anda";
  }

  const visible = local.slice(0, 2);

  return `${visible}${"•".repeat(Math.max(local.length - 2, 2))}@${domain}`;
}

function purgeExpiredMfaState(now: number): void {
  for (const [token, challenge] of challengesByToken) {
    if (challenge.expiresAt <= now) {
      challengesByToken.delete(token);
    }
  }

  for (const [id, enrollment] of totpEnrollments) {
    if (enrollment.expiresAt <= now) {
      totpEnrollments.delete(id);
    }
  }

  for (const [id, enrollment] of emailEnrollments) {
    if (enrollment.expiresAt <= now) {
      emailEnrollments.delete(id);
    }
  }
}

export async function getMfaStatus(userId: string): Promise<MfaStatus> {
  const { mfa } = getUserOrThrow(userId);

  return {
    enabled: mfa !== null,
    method: mfa?.method ?? null,
    enabledAt: mfa?.enabledAt ?? null,
    remainingBackupCodes: mfa?.backupCodeHashes.size ?? 0,
  };
}

export async function beginMfaChallenge(
  userId: string,
): Promise<MfaChallenge> {
  const user = getUserOrThrow(userId);
  const mfa = user.mfa;

  if (!mfa) {
    throw new AppError("CONFLICT", { message: "MFA belum aktif untuk akun ini." });
  }

  const now = Date.now();

  purgeExpiredMfaState(now);

  const token = randomBytes(32).toString("hex");
  const expiresAt = now + MFA_CHALLENGE_TTL_MS;
  const maskedEmail = maskEmail(user.email);
  const emailCodeSentAt =
    mfa.method === "email" ? sendMockEmailCode(maskedEmail, now) : null;

  challengesByToken.set(token, {
    userId,
    method: mfa.method,
    maskedEmail,
    expiresAt,
    attempts: 0,
    emailCodeSentAt,
  });

  logger.info("auth.mfa.challenge_started", {
    method: mfa.method,
    expiresInMinutes: Math.round(MFA_CHALLENGE_TTL_MS / 60000),
  });

  return { token, method: mfa.method, maskedEmail, expiresAt };
}

export async function getMfaChallenge(
  token: string,
): Promise<Pick<MfaChallenge, "method" | "maskedEmail" | "expiresAt"> | null> {
  purgeExpiredMfaState(Date.now());

  const challenge = challengesByToken.get(token);

  if (!challenge) {
    return null;
  }

  return {
    method: challenge.method,
    maskedEmail: challenge.maskedEmail,
    expiresAt: challenge.expiresAt,
  };
}

function getChallengeOrThrow(token: string): PendingChallenge {
  purgeExpiredMfaState(Date.now());

  const challenge = challengesByToken.get(token);

  if (!challenge) {
    throw new AppError("UNAUTHENTICATED", { message: MFA_EXPIRED_MESSAGE });
  }

  return challenge;
}

function assertAttemptsRemaining(challenge: PendingChallenge, token: string): void {
  if (challenge.attempts < MFA_MAX_ATTEMPTS) {
    return;
  }

  challengesByToken.delete(token);

  logger.warn("auth.mfa.locked", { method: challenge.method });

  throw new AppError("RATE_LIMITED", {
    message: "Terlalu banyak percobaan. Silakan masuk kembali setelah 15 menit.",
  });
}

function invalidCodeError(): AppError {
  return new AppError("VALIDATION_ERROR", {
    message: MFA_INVALID_CODE_MESSAGE,
    fieldErrors: { code: [MFA_INVALID_CODE_MESSAGE] },
  });
}

/**
 * Verifikasi kode OTP (authenticator atau email). Token consumed on success.
 */
export async function verifyMfaCode(
  token: string,
  code: string,
): Promise<AuthenticatedUser> {
  const challenge = getChallengeOrThrow(token);

  assertAttemptsRemaining(challenge, token);

  const user = getUserOrThrow(challenge.userId);
  const mfa = user.mfa;

  if (!mfa) {
    throw new AppError("UNAUTHENTICATED", { message: MFA_EXPIRED_MESSAGE });
  }

  const secret = mfa.secret;
  const isValid =
    mfa.method === "totp" && secret
      ? verifyTotpCode(secret, code) || (isDemoMode && code === MFA_DEMO_CODE)
      : isDemoMode && code === MFA_DEMO_CODE;

  challenge.attempts += 1;

  if (!isValid) {
    logger.warn("auth.mfa.failed", {
      method: mfa.method,
      attempts: challenge.attempts,
    });

    throw invalidCodeError();
  }

  challengesByToken.delete(token);

  logger.info("auth.mfa.succeeded", { method: mfa.method });

  return { userId: user.id, email: user.email };
}

/** Backup code single-use: hash di-stored, plaintext hanya sekali di UI. */
export async function verifyMfaBackupCode(
  token: string,
  code: string,
): Promise<AuthenticatedUser> {
  const challenge = getChallengeOrThrow(token);

  assertAttemptsRemaining(challenge, token);

  const user = getUserOrThrow(challenge.userId);
  const mfa = user.mfa;

  if (!mfa) {
    throw new AppError("UNAUTHENTICATED", { message: MFA_EXPIRED_MESSAGE });
  }

  const normalized = code.trim().toUpperCase();
  const hash = hashResetToken(normalized);
  const matched = [...mfa.backupCodeHashes].find((stored) => safeEqual(stored, hash));

  challenge.attempts += 1;

  if (!matched) {
    logger.warn("auth.mfa.backup_failed", { attempts: challenge.attempts });

    throw invalidCodeError();
  }

  mfa.backupCodeHashes.delete(matched);
  challengesByToken.delete(token);

  logger.info("auth.mfa.succeeded", {
    method: mfa.method,
    via: "backup-code",
    remainingBackupCodes: mfa.backupCodeHashes.size,
  });

  return { userId: user.id, email: user.email };
}

export async function resendMfaEmailCode(token: string): Promise<void> {
  const challenge = getChallengeOrThrow(token);

  if (challenge.method !== "email") {
    throw new AppError("VALIDATION_ERROR", {
      message: "Metode MFA aktif bukan email OTP.",
    });
  }

  const now = Date.now();
  const lastSentAt = challenge.emailCodeSentAt ?? 0;

  if (now - lastSentAt < MFA_EMAIL_RESEND_COOLDOWN_MS) {
    throw new AppError("RATE_LIMITED", {
      message: `Tunggu ${Math.ceil(
        (MFA_EMAIL_RESEND_COOLDOWN_MS - (now - lastSentAt)) / 1000,
      )} detik sebelum meminta kode lagi.`,
    });
  }

  challenge.emailCodeSentAt = sendMockEmailCode(challenge.maskedEmail, now);

  logger.info("auth.mfa.email_code_resent", { method: "email" });
}

function sendMockEmailCode(maskedEmail: string, now: number): number {
  // Mock: kode tidak disimpan dan tidak dikirim. Log hanya di development.
  logger.info("auth.mfa.email_code_sent", {
    delivery: "log-only",
    ...(isDemoMode ? { maskedEmail, code: MFA_DEMO_CODE } : {}),
  });

  return now;
}

export type TotpEnrollmentSecret = {
  enrollmentId: string;
  secret: string;
  otpauthUrl: string;
};

export async function startTotpEnrollment(
  userId: string,
): Promise<TotpEnrollmentSecret> {
  const user = getUserOrThrow(userId);

  if (user.mfa) {
    throw new AppError("CONFLICT", {
      message: "MFA sudah aktif. Nonaktifkan dulu sebelum mengganti metode.",
    });
  }

  purgeExpiredMfaState(Date.now());

  const secret = generateTotpSecret();
  const enrollmentId = randomBytes(16).toString("hex");

  totpEnrollments.set(enrollmentId, {
    userId,
    secret,
    expiresAt: Date.now() + MFA_ENROLLMENT_TTL_MS,
  });

  // Secret tidak pernah masuk log.
  logger.info("auth.mfa.enrollment_started", { method: "totp" });

  return {
    enrollmentId,
    secret,
    otpauthUrl: buildOtpAuthUrl({ secret, accountName: user.email }),
  };
}

function generateBackupCodes(): { plain: string[]; hashes: Set<string> } {
  const plain: string[] = [];
  const hashes = new Set<string>();
  const block = () =>
    Array.from({ length: 4 }, () =>
      BACKUP_CODE_ALPHABET[randomInt(BACKUP_CODE_ALPHABET.length)],
    ).join("");

  while (plain.length < MFA_BACKUP_CODE_COUNT) {
    const code = `${block()}-${block()}`;

    if (hashes.has(hashResetToken(code))) {
      continue;
    }

    plain.push(code);
    hashes.add(hashResetToken(code));
  }

  return { plain, hashes };
}

function enableMfa(
  user: MockUser,
  method: MfaMethod,
  secret: string | null,
): { backupCodes: string[] } {
  const { plain, hashes } = generateBackupCodes();

  user.mfa = { method, secret, backupCodeHashes: hashes, enabledAt: Date.now() };

  logger.info("auth.mfa.enabled", { method, backupCodeCount: plain.length });

  return { backupCodes: plain };
}

/**
 * Error yang dipakai saat enrolment tidak ada ATAU bukan milik session yang
 * memanggil. Dua kasus sengaja memakai respons identik supaya `enrollmentId`
 * tidak berubah jadi oracle "id ini ada tapi milik orang lain".
 */
function invalidEnrollmentError(hint: string): AppError {
  return new AppError("VALIDATION_ERROR", {
    message: "Sesi enrolment tidak valid atau sudah kedaluwarsa.",
    fieldErrors: { code: [hint] },
  });
}

export async function confirmTotpEnrollment(
  enrollmentId: string,
  code: string,
  userId: string,
): Promise<{ backupCodes: string[] }> {
  purgeExpiredMfaState(Date.now());

  const enrollment = totpEnrollments.get(enrollmentId);

  if (!enrollment) {
    throw invalidEnrollmentError("Mulai ulang dari awal.");
  }

  if (enrollment.userId !== userId) {
    logger.warn("auth.mfa.enrollment_forbidden", { method: "totp" });

    throw invalidEnrollmentError("Mulai ulang dari awal.");
  }

  const isValid =
    verifyTotpCode(enrollment.secret, code) ||
    (isDemoMode && code === MFA_DEMO_CODE);

  if (!isValid) {
    logger.warn("auth.mfa.enrollment_failed", { method: "totp" });

    throw invalidCodeError();
  }

  totpEnrollments.delete(enrollmentId);

  return enableMfa(getUserOrThrow(enrollment.userId), "totp", enrollment.secret);
}

export type EmailEnrollmentChallenge = {
  enrollmentId: string;
  maskedEmail: string;
  expiresAt: number;
};

export async function startEmailEnrollment(
  userId: string,
): Promise<EmailEnrollmentChallenge> {
  const user = getUserOrThrow(userId);

  if (user.mfa) {
    throw new AppError("CONFLICT", {
      message: "MFA sudah aktif. Nonaktifkan dulu sebelum mengganti metode.",
    });
  }

  purgeExpiredMfaState(Date.now());

  const now = Date.now();
  const enrollmentId = randomBytes(16).toString("hex");
  const maskedEmail = maskEmail(user.email);

  emailEnrollments.set(enrollmentId, {
    userId,
    expiresAt: now + MFA_ENROLLMENT_TTL_MS,
    codeSentAt: now,
  });

  sendMockEmailCode(maskedEmail, now);

  logger.info("auth.mfa.enrollment_started", { method: "email" });

  return {
    enrollmentId,
    maskedEmail,
    expiresAt: now + MFA_ENROLLMENT_TTL_MS,
  };
}

export async function confirmEmailEnrollment(
  enrollmentId: string,
  code: string,
  userId: string,
): Promise<{ backupCodes: string[] }> {
  purgeExpiredMfaState(Date.now());

  const enrollment = emailEnrollments.get(enrollmentId);

  if (!enrollment) {
    throw invalidEnrollmentError("Kirim ulang kode lalu coba lagi.");
  }

  if (enrollment.userId !== userId) {
    logger.warn("auth.mfa.enrollment_forbidden", { method: "email" });

    throw invalidEnrollmentError("Kirim ulang kode lalu coba lagi.");
  }

  if (!isDemoMode || code !== MFA_DEMO_CODE) {
    logger.warn("auth.mfa.enrollment_failed", { method: "email" });

    throw invalidCodeError();
  }

  emailEnrollments.delete(enrollmentId);

  return enableMfa(getUserOrThrow(enrollment.userId), "email", null);
}

export async function disableMfa(
  userId: string,
  password: string,
): Promise<void> {
  const user = getUserOrThrow(userId);

  if (!safeEqual(user.password, password)) {
    throw new AppError("UNAUTHENTICATED", {
      message: "Kata sandi salah.",
      fieldErrors: { password: ["Kata sandi salah."] },
    });
  }

  user.mfa = null;

  logger.info("auth.mfa.disabled", { method: "user-initiated" });
}
