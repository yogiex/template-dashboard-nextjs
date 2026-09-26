import { serverEnv } from "@/lib/env";
import { AppError } from "@/lib/error";

export type SessionUser = {
  id: string
  role: "admin" | "editor" | "viewer"
}

const ROLE_HIERARCHY: Record<SessionUser["role"], number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
}

/**
 * Pesan untuk pengguna yang belum punya sesi. Aman ditampilkan: tidak
 * membocorkan apakah ada sesi, cookie mana yang salah, atau apa pun soal
 * backend yang belum ada.
 */
const UNAUTHENTICATED_MESSAGE = "Sesi tidak ditemukan. Silakan login kembali."

/**
 * Sesi placeholder untuk pengembangan lokal. Sengaja memakai `id` yang jelas
 * bukan id pengguna sungguhan, supaya kalau bocor ke log atau UI masih terbaca
 * sebagai data dummy.
 */
const DEV_PLACEHOLDER_SESSION: SessionUser = {
  id: "usr_placeholder",
  role: "admin",
}

/**
 * Sumber kebenaran identitas di server.
 *
 * Ini placeholder yang disengaja: template ini frontend-only dan belum punya
 * backend, jadi belum ada cookie/session yang bisa dibaca dan belum ada yang
 * bisa diverifikasi. `null` berarti "tidak ada sesi" — bukan "coba lagi nanti"
 * dan bukan "beri aku user sementara". Pemanggil wajib gagal tertutup.
 *
 * Titik integrasi saat backend tiba: baca cookie session di sini, verifikasi
 * signature-nya dengan kunci server, lalu petakan ke `SessionUser`. Hanya
 * fungsi ini yang boleh menyentuh sumber identitas; `requireSession()` dan
 * `requireSessionForDev()` tidak boleh membaca cookie langsung.
 *
 * Module-private dengan sengaja. Tidak ada kebutuhan di luar `rbac.ts` untuk
 * "mungkin ada sesi", dan meng-export-nya hanya memberi jalan membaca identitas
 * tanpa melewati guard. Test pun tidak memerlukannya: selama nilai kembaliannya
 * selalu `null`, yang perlu dikunci adalah perilakunya lewat
 * `requireSession()` / `requireSessionForDev()`.
 */
async function getSessionFromRequest(): Promise<SessionUser | null> {
  return null
}

/**
 * Kontrak produksi: session WAJIB terverifikasi di server, tanpa jalan keluar.
 *
 * Sengaja tidak membaca `DEV_AUTH_BYPASS` sama sekali. Fungsi ini adalah
 * security boundary yang dipakai semua Server Action, sedangkan bypass lokal
 * hanya boleh masuk lewat `requireSessionForDev()`. Pemisahan itu disengaja:
 * reviewer cukup grep nama fungsi bypass itu dan langsung melihat setiap
 * affordance dev-only yang ada, sementara tidak ada satu pun jalur kode yang
 * bisa dibuka hanya dengan menyalakan env var.
 *
 * Melempar `AppError("UNAUTHENTICATED")` (status 401) saat tidak ada sesi.
 */
export async function requireSession(): Promise<SessionUser> {
  const session = await getSessionFromRequest()

  if (!session) {
    throw new AppError("UNAUTHENTICATED", {
      message: UNAUTHENTICATED_MESSAGE,
    })
  }

  return session
}

/**
 * Escape hatch OPT-IN untuk pengembangan lokal, supaya template masih bisa
 * dijalankan sebelum backend ada. Tidak ada wiring otomatis di proxy, halaman,
 * atau layout — pemanggil harus mengganti `requireSession()` dengan ini
 * secara eksplisit, jadi tidak ada tempat yang diam-diam bergantung pada bypass.
 *
 * Tetap fail-closed: placeholder hanya boleh keluar bila `DEV_AUTH_BYPASS` persis
 * `"1"` DAN `NODE_ENV` bukan `"production"`. Keduanya harus lolos, jadi
 * environment yang ter-deploy selalu menolak apa pun isi env-nya — env yang
 * salah-set tidak membuka auth. Nilai flag tidak pernah di-log atau di-echo;
 * yang keluar dari sini hanya hasil evaluasinya.
 */
export async function requireSessionForDev(): Promise<SessionUser> {
  const session = await getSessionFromRequest()

  if (session) {
    return session
  }

  const bypassEnabled = serverEnv.DEV_AUTH_BYPASS === "1"
  const runningInProduction = serverEnv.NODE_ENV === "production"

  if (!bypassEnabled || runningInProduction) {
    throw new AppError("UNAUTHENTICATED", {
      message: UNAUTHENTICATED_MESSAGE,
    })
  }

  return DEV_PLACEHOLDER_SESSION
}

/**
 * Syarat role minimum: `viewer` < `editor` < `admin`. Melempar
 * `AppError("FORBIDDEN")` (status 403) bila role sesi di bawah `minimum`.
 *
 * Semantik hierarki ini load-bearing dan sengaja tidak diubah jadi daftar role
 * (`SessionUser["role"][]`): pemanggil lain menulis "setidaknya level ini",
 * dan mengubahnya jadi membership check akan melonggarkan guard yang sudah
 * bekerja. `viewer` boleh masuk halaman `editor`, tapi `editor` tidak boleh
 * masuk halaman `admin`.
 */
export function requireRole(
  session: SessionUser,
  minimum: SessionUser["role"],
): void {
  if (ROLE_HIERARCHY[session.role] < ROLE_HIERARCHY[minimum]) {
    throw new AppError("FORBIDDEN", {
      message: "Akses tidak diizinkan.",
    })
  }
}
