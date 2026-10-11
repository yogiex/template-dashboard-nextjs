import "server-only";

import { redirect } from "next/navigation";

import { AppError } from "@/lib/error";
import {
  requireSession,
  requireSessionForDev,
  type SessionUser,
} from "@/lib/rbac";

/** Tujuan redirect saat tidak ada sesi. Satu konstanta supaya tidak ada tebakan path login. */
const LOGIN_PATH = "/login";

/**
 * Guard session **produksi** untuk route segment: layout, page, atau Server
 * Component.
 *
 * Sengaja memakai `requireSession()`, bukan `requireSessionForDev()`: guard ini
 * yang menentukan apakah shell terautentikasi terbuka. Bypass
 * `DEV_AUTH_BYPASS` hanya boleh masuk lewat pemanggilan eksplisit ke
 * `requirePageSessionForDev()`, jadi tidak ada jalur kode yang diam-diam
 * bergantung pada env var — grep nama fungsi bypass itu tetap menunjukkan
 * setiap affordance dev yang ada.
 *
 * Fail-closed: `UNAUTHENTICATED` (401) menjadi `redirect("/login")`. Error lain
 * — termasuk `FORBIDDEN` dan crash tak terduga — dilempar ulang apa adanya,
 * karena keduanya keputusan yang berbeda dan menyamarkannya jadi "silakan
 * login" hanya menutupi bug. `redirect()` melempar error kontrol, jadi dipanggil
 * dari `catch`, bukan dari dalam blok `try` (alasan lengkapnya ada di
 * `requirePageSessionForDev` di bawah).
 *
 * Mengembalikan sesi, bukan `void`, supaya pemanggil yang butuh `session.id`
 * (mis. membaca data milik user sendiri) tidak menebak identitas lagi.
 */
export async function requirePageSession(): Promise<SessionUser> {
  try {
    return await requireSession();
  } catch (error) {
    if (error instanceof AppError && error.code === "UNAUTHENTICATED") {
      redirect(LOGIN_PATH);
    }

    throw error;
  }
}

/**
 * Escape hatch **dev** untuk route segment: pelengkap `requirePageSession()`
 * di atas, bukan penggantinya. Dipakai saat template perlu dibuka sebelum ada
 * sesi sungguhan; jangan dikenakan pada guard produksi.
 *
 * Dipisah dari `rbac.ts` karena dua alasan. Pertama, `rbac.ts` adalah sumber
 * kebenaran identitas dan sengaja tidak tahu apa pun soal routing. Kedua,
 * coupling "session lalu navigasi" hanya boleh ada di satu file, jadi grep
 * `requirePageSessionForDev` langsung menunjukkan setiap halaman yang memakai
 * affordance dev ini.
 *
 * Fail-closed. `UNAUTHENTICATED` (401) menjadi `redirect("/login")`; error lain
 * — termasuk `FORBIDDEN` dan crash tak terduga — dilempar ulang apa adanya, bukan
 * disamarkan jadi "silakan login", karena keduanya keputusan yang berbeda dan
 * error yang salah akan menutupi bug.
 *
 * Mengembalikan sesi, bukan `void`, supaya pemanggil yang butuh `session.id`
 * (mis. membaca data milik user sendiri) tidak menebak identitas lagi.
 */
export async function requirePageSessionForDev(): Promise<SessionUser> {
  try {
    return await requireSessionForDev();
  } catch (error) {
    if (error instanceof AppError && error.code === "UNAUTHENTICATED") {
      // `redirect()` bekerja dengan melempar error kontrol (`NEXT_REDIRECT`),
      // jadi HARUS dipanggil di luar `try` — itu syarat resmi Next.js. Kalau
      // dipanggil di dalam `try`, error kontrol itu tertangkap `catch` di atas
      // lalu dilempar ulang sebagai crash biasa dan redirect-nya hilang.
      redirect(LOGIN_PATH);
    }

    throw error;
  }
}
