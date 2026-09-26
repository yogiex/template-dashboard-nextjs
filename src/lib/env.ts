import { z } from "zod";

/**
 * Validasi environment variable di satu boundary dengan typed schema.
 *
 * Aturan pemisahan:
 * - `serverEnvSchema` hanya untuk nilai server (tidak boleh masuk bundle browser).
 * - `clientEnvSchema` hanya untuk `NEXT_PUBLIC_*`; nilainya terkirim ke browser dan
 *   harus dianggap publik.
 *
 * `env.ts` sengaja tidak memakai `import "server-only"` karena
 * `src/config/site.ts` membacanya dan ikut ter-import dari Client Component
 * (`app-sidebar-header.tsx`). Karena itu pemisahan ditegakkan lewat dua export
 * terpisah: `serverEnv` (hanya dari file server) dan `clientEnv` (aman di kedua
 * sisi). Jangan pernah log nilai `serverEnv`.
 */

const emptyStringToUndefined = (value: unknown) => (value === "" ? undefined : value);

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  /**
   * Kunci enkripsi Server Action. Opsional supaya template bisa dijalankan tanpa
   * konfigurasi; wajib ada (dan harus stabil antar-instance) di deployment yang
   * memakai multi-instance. Minimal 32 karakter, jangan pernah di-log.
   */
  NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: z.preprocess(
    emptyStringToUndefined,
    z.string().min(32).optional(),
  ),
  /**
   * Mengaktifkan `/api/health/metrics`. Default `false` (endpoint 404) karena
   * isinya adalah data operasional dan tidak perlu terekspos pada template
   * yang belum punya backend. Nilainya hanya dibaca sebagai flag; tidak pernah
   * dikembalikan sebagai bagian dari response.
   */
  HEALTH_METRICS_ENABLED: z.preprocess(
    emptyStringToUndefined,
    z.enum(["true", "false"]).optional(),
  ),
  /**
   * Opt-in bypass autentikasi untuk pengembangan lokal; satu-satunya konsumennya
   * `requireSessionForDev()` di `src/lib/rbac.ts`. Hanya persis `"1"` yang
   * mengaktifkan, dan tetap butuh `NODE_ENV` bukan `production`, sehingga
   * environment yang ter-deploy tidak bisa dibukanya apa pun isi env-nya.
   *
   * Sengaja TIDAK memakai prefix `NEXT_PUBLIC_`. Modul ini tidak punya
   * `import "server-only"` (lihat catatan di atas), jadi nilai server bisa
   * ikut ter-import lewat `src/config/site.ts` ke Client Component; kalau
   * variabel ini publik, Next akan meng-inline nilainya ke bundle browser dan
   * affordance yang seharusnya server-side ikut terbawa ke klien. Nilai ini
   * sendiri bukan secret, tapi jalan membypass autentikasi harus tetap di sisi
   * server.
   *
   * Hanya `"0"` dan `"1"` yang diterima, jadi `DEV_AUTH_BYPASS=0` tetap cara
   * yang valid mematikan flag (bukan error boot) sementara `"true"`/`"yes"`
   * menggagalkan boot dengan pesan yang jelas — lebih baik gagal keras daripada
   * diam-diam tidak aktif. Perbandingan `"1"` ada di `src/lib/rbac.ts`, bukan
   * di sini, karena `isFlagEnabled()` memakai semantik `"true"` yang terbalik.
   */
  DEV_AUTH_BYPASS: z.preprocess(
    emptyStringToUndefined,
    z.enum(["0", "1"]).optional(),
  ),
});

/** Flag boolean yang sudah dinormalisasi; `undefined` berarti "tidak diatur". */
export function isFlagEnabled(value: string | undefined): boolean {
  return value === "true";
}

const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});

function parseEnv<T extends z.ZodTypeAny>(
  schema: T,
  source: unknown,
  scope: "server" | "client",
): z.infer<T> {
  const parsed = schema.safeParse(source);

  if (!parsed.success) {
    const fields = Object.keys(parsed.error.flatten().fieldErrors).join(", ");
    throw new Error(
      `Environment variable ${scope} tidak valid: ${fields || "tidak diketahui"}. Cek .env.example dan bandingkan dengan .env.local.`,
    );
  }

  return parsed.data;
}

/** Nilai server. Hanya import dari file server (Server Component, action, service). */
export const serverEnv = parseEnv(serverEnvSchema, process.env, "server");

/** Nilai publik. Aman di-import dari Client Component. */
export const clientEnv = parseEnv(clientEnvSchema, process.env, "client");

/**
 * Gabungan keduanya untuk kompatibilitas import lama (`env.NEXT_PUBLIC_APP_URL`).
 * Akses nilai server lewat `serverEnv` agar batas server/client jelas.
 */
export const env = { ...serverEnv, ...clientEnv };
