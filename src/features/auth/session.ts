import "server-only";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";

import type { SessionUser } from "@/lib/rbac";

export const SESSION_COOKIE_NAME = "mock_session";
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;
export const REMEMBER_ME_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

type SessionRecord = { user: SessionUser; expiresAt: number };

/**
 * Store session MOCK — dan jujur soal batasnya: `Map` di level modul berarti
 * seluruh state hidup di memori satu proses. Isinya hilang sekali saja saat
 * restart, jadi semua token yang sudah terlanjur terbit ikut mati, dan tidak
 * ada jaminan apa pun kalau aplikasi berjalan di lebih dari satu instance
 * (instance B tidak mengenali token yang terbit di instance A).
 *
 * Titik penggantinya saat backend datang: bukan memperbesar `Map` ini, tapi
 * mengganti isi modul dengan pembacaan record dari store yang nyata, dan
 * memverifikasi signature token dengan kunci server sebelum record dianggap
 * sah. Token yang cuma "ada di Map" belum membuktikan apa pun. Kontrak tiga
 * fungsi ekspor sengaja dibiarkan seperti ini supaya pemanggilnya
 * (`rbac.ts` → `requireSession()`) tidak perlu ikut berubah.
 */
const sessions = new Map<string, SessionRecord>();

type CookieStore = Awaited<ReturnType<typeof cookies>>;

function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

/**
 * Membuka cookie store tanpa melempar. `cookies()` menolak dipanggil di luar
 * request scope, dan pembaca sesi memang bisa sampai ke sana (test, prerender,
 * skrip). Untuk jalur baca itu berarti "tidak ada request, jadi tidak ada
 * sesi" — `null`, bukan crash — supaya `requireSession()` tetap bisa gagal
 * tertutup dengan `UNAUTHENTICATED`. Fungsi tulis `createSession()` sengaja
 * tidak memakai helper ini: gagal menyetel cookie saat login adalah error yang
 * harus terlihat, bukan sesuatu yang diam-diam dikembalikan sebagai sukses.
 */
async function getCookieStore(): Promise<CookieStore | null> {
  try {
    return await cookies();
  } catch {
    return null;
  }
}

/**
 * Menghapus cookie harus memakai opsi yang sama dengan saat menyetel, plus
 * `maxAge: 0`. Path yang berbeda akan meninggalkan cookie lama yang sama sekali
 * tidak tersentuh, dan tanpa `maxAge: 0` sebagian client masih menahan nilai
 * tersebut sampai kedaluwarsa alaminya.
 */
function clearSessionCookie(cookieStore: CookieStore): void {
  cookieStore.set(SESSION_COOKIE_NAME, "", sessionCookieOptions(0));
}

function purgeExpiredSessions(now: number): void {
  for (const [token, record] of sessions) {
    if (record.expiresAt <= now) {
      sessions.delete(token);
    }
  }
}

export async function createSession(
  user: SessionUser,
  options?: { rememberMe?: boolean },
): Promise<string> {
  const maxAge = options?.rememberMe
    ? REMEMBER_ME_MAX_AGE_SECONDS
    : SESSION_MAX_AGE_SECONDS;
  const token = randomBytes(32).toString("base64url");

  purgeExpiredSessions(Date.now());

  sessions.set(token, {
    user,
    expiresAt: Date.now() + maxAge * 1000,
  });

  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, sessionCookieOptions(maxAge));

  return token;
}

export async function readSession(): Promise<SessionUser | null> {
  const cookieStore = await getCookieStore();

  if (!cookieStore) {
    return null;
  }

  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const record = sessions.get(token);

  if (!record) {
    return null;
  }

  if (record.expiresAt <= Date.now()) {
    sessions.delete(token);
    clearSessionCookie(cookieStore);

    return null;
  }

  return record.user;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await getCookieStore();

  if (!cookieStore) {
    return;
  }

  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    sessions.delete(token);
  }

  clearSessionCookie(cookieStore);
}
