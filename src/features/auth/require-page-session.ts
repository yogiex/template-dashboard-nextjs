import "server-only";

import { redirect } from "next/navigation";

import { AppError } from "@/lib/error";
import { requireSessionForDev, type SessionUser } from "@/lib/rbac";

/** Tujuan redirect saat tidak ada sesi. Satu konstanta supaya tidak ada tebakan path login. */
const LOGIN_PATH = "/login";

/**
 * Guard session untuk route segment: Server Component, page, atau layout.
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
