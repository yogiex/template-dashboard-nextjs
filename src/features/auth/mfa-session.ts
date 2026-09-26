import "server-only";

import { cookies } from "next/headers";

/**
 * Transport token MFA. Sengaja dipisah dari `actions.ts` karena file
 * `"use server"` hanya boleh mengekspor async function.
 *
 * Token disimpan di cookie httpOnly dengan path khusus: tidak masuk URL, access
 * log, referrer, maupun riwayat browser, dan tidak dikirim ke halaman di luar
 * `/login/mfa`.
 */
export const MFA_COOKIE_NAME = "mfa_pending";
export const MFA_COOKIE_PATH = "/login/mfa";
export const MFA_COOKIE_MAX_AGE_SECONDS = 10 * 60;

function mfaCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: MFA_COOKIE_PATH,
    maxAge,
  };
}

export async function setMfaSessionToken(token: string): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(MFA_COOKIE_NAME, token, mfaCookieOptions(MFA_COOKIE_MAX_AGE_SECONDS));
}

export async function readMfaSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();

  return cookieStore.get(MFA_COOKIE_NAME)?.value ?? null;
}

/**
 * Kosongkan cookie dengan opsi yang sama. `cookies().delete()` tanpa path yang
 * sama tidak akan mengosongkan cookie yang di-set dengan path khusus.
 */
export async function clearMfaSessionToken(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(MFA_COOKIE_NAME, "", mfaCookieOptions(0));
}
