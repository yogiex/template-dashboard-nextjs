# 05 — Error Handling

> Semua signature di dokumen ini diverifikasi terhadap kode repo (Next.js `16.3.6`) per 2026-09. Dokumentasi acuan: `docs/ERROR-HANDLING.md`, `docs/ARCHITECTURE.md` §8.2, §10.6, §10.7, `docs/SECURITY.md`.

## 1. Error Taxonomy: `AppError`

Lokasi nyata: `src/lib/error.ts`. **Constructor memakai kode sebagai argumen pertama posisional**, lalu object options:

```ts
export const ERROR_CODES = [
  "VALIDATION_ERROR",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "RATE_LIMITED",
  "INTERNAL_ERROR",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];
export type FieldErrors = Record<string, string[]>;

export type AppErrorOptions = {
  message?: string;
  fieldErrors?: FieldErrors;
  cause?: unknown;
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly fieldErrors?: FieldErrors;

  constructor(code: ErrorCode, options: AppErrorOptions = {}) {
    super(options.message ?? USER_MESSAGES[code], { cause: options.cause });
    this.name = "AppError";
    this.code = code;
    this.fieldErrors = options.fieldErrors;
  }

  get status(): number;      // dari HTTP_STATUS[code]
  get userMessage(): string; // pesan aman Bahasa Indonesia
}
```

Helper yang benar-benar ada di file yang sama: `getErrorStatus(code): number` dan `getErrorMessage(code): string`.

Pemakaian yang benar:

```ts
import { AppError, getErrorMessage, type ErrorCode, type FieldErrors } from "@/lib/error"

throw new AppError("CONFLICT", {
  message: "Email sudah digunakan.",
  fieldErrors: { email: ["Email sudah digunakan."] },
})

throw new AppError("RATE_LIMITED")            // pesan default, aman
throw new AppError("INTERNAL_ERROR", { cause: error })  // cause tidak diserialisasi
```

> Koreksi terhadap `docs/ERROR-HANDLING.md` §4: contoh di dokumen itu memakai constructor objek `{ code, detail, ... }` dan field `errors`. Kode nyata menang — repo memakai `new AppError(code, { message, fieldErrors, cause })` dengan getter `status`/`userMessage`. Ikuti kode; jangan membuat subclass per pesan, dan jangan melempar `AppError` dari komponen UI.

Aturan pemakaian:

- Service membuat `AppError` hanya untuk kegagalan dengan kategori stabil. Error mentah dari dependency dipetakan di boundary integrasi.
- `message` hanya untuk kasus yang memang butuh kalimat spesifik; `userMessage` selalu tersedia sebagai fallback aman.
- Jangan menaruh password, token, cookie, payload, query database, atau identifier sensitif di `message`/`fieldErrors`.
- `cause` hanya untuk diagnosa server; tidak pernah masuk respons atau state client.
- Subclass hanya jika menambah data domain aman atau hook pemetaan nyata. Repo belum punya subclass apa pun.

## 2. Tabel Error Codes

`ERROR_CODES` di `src/lib/error.ts` adalah satu-satunya klasifikasi yang dikirim lintas lapisan. Tujuh kode; tidak ada kode 422/502/503/504 sebagai kode aplikasi.

| Kode | Status | Arti | Sumber di repo | Perilaku UI default |
| --- | ---: | --- | --- | --- |
| `VALIDATION_ERROR` | 400 | Input tidak valid / field wajib kosong | `src/features/*/schema.ts` via `safeParse`, `validationError()` di `service.ts` | Tampilkan per field dari `fieldErrors`; jangan mutasi |
| `UNAUTHENTICATED` | 401 | Identitas tidak dapat dibuktikan | `requireSession()` di `src/lib/rbac.ts` saat integrasi session nyata | Minta login ulang |
| `FORBIDDEN` | 403 | Identitas diketahui, tidak berwenang | `requireRole(session, minimum)` di `src/lib/rbac.ts` | Tampilkan akses ditolak tanpa detail internal |
| `NOT_FOUND` | 404 | Sumber tidak ada atau tidak terlihat | service/`notFound()` | Empty state, bukan error modal |
| `CONFLICT` | 409 | Bertentangan dengan state saat ini | `ensureUniqueEmail()` di `src/features/user/service.ts` | Minta muat ulang/konfirmasi; jangan retry otomatis |
| `RATE_LIMITED` | 429 | Terlalu banyak permintaan | `enforceRateLimit()` di `src/lib/rate-limit.ts` | Tunggu dengan backoff; jangan tampilkan angka threshold |
| `INTERNAL_ERROR` | 500 | Bug atau dependency gagal | `catch` di action, `problemResponse()` di `src/lib/api.ts` | Pesan generik + `traceId` untuk dukungan |

Status selalu dibaca lewat `error.status` atau `getErrorStatus(code)`; jangan menulis angka status manual di komponen.

## 3. Envelope di Action

Envelope nyata (dipakai `src/features/user/actions.ts` dan `src/features/auth/actions.ts`):

```ts
export type UserActionResult =
  | { success: true }
  | {
      success: false
      error: {
        code: ErrorCode
        message: string
        traceId: string
        fieldErrors?: FieldErrors
      }
    }
```

`src/features/contact/actions.ts` memakai varian tanpa `traceId` (`ContactActionState` dengan `code`, `message`, `fieldErrors?`) karena form publik tidak punya alur dukungan; itu tetap sah selama `traceId` dicatat di log server.

Helper `failure` yang dipakai di `src/features/user/actions.ts`:

```ts
function failure(error: unknown, traceId: string, event: string): UserActionResult {
  if (error instanceof AppError) {
    return {
      success: false,
      error: { code: error.code, message: error.userMessage, traceId, fieldErrors: error.fieldErrors },
    }
  }
  logger.error(event, error, { traceId })
  return { success: false, error: { code: "INTERNAL_ERROR", message: getErrorMessage("INTERNAL_ERROR"), traceId } }
}
```

Kaid envelope:

- Selalu discriminated union dengan `success`; bentuknya seragam di seluruh `actions.ts`.
- Tidak pernah melempar error domain keluar dari action; `error.tsx` diperlakukan untuk kegagalan render/transport umum, bukan untuk validasi form.
- Tidak pernah return data domain mentah, error database, atau seluruh entity hasil mutasi.
- `traceId` dibuat dengan `randomUUID()` dari `node:crypto` **sebelum** `try` agar satu insiden punya satu ID.
- `fieldErrors` hanya berisi nama field dan pesan aman untuk ditampilkan.

Untuk Route Handler (belum ada di template, tapi adapter-nya sudah siap di `src/lib/api.ts`):

```ts
import { problemResponse } from "@/lib/api"

return problemResponse(error, { instance: "/api/projects", traceId })
```

`problemResponse` mengembalikan `Response.json` dengan `Content-Type: application/problem+json`, header `X-Trace-Id`, body `{ type, title, status, detail, traceId, instance?, fieldErrors? }`, dan melog otomatis (`logger.error` untuk status >= 500, `logger.warn` untuk penolakan). Nol file `route.ts` di repo saat ini; lihat `docs/INTEGRATION.md` saat backend tiba.

## 4. Expected vs Uncaught

| Jenis | Contoh | Cara ditangani |
| --- | --- | --- |
| Expected (bisa dipulihkan) | Zod `safeParse` gagal, email duplikat, rate limit, submit gagal | **Return nilai** `success: false` + `code`; tidak pernah `throw` melewati boundary |
| Uncaught (bug/dependency) | TypeError, credential habis, API hilir down | `throw` dari service, ditangkap `catch` di action, dipetakan ke `INTERNAL_ERROR`, dicatat via `logger.error` |

Prinsip: expected error adalah state UI, bukan exception. `throw` dipakai untuk kondisi yang memang tidak boleh dilanjutkan. Jangan membuat kode error ad hoc per layar; semuanya dari `ERROR_CODES`.

## 5. Handler di Server Action

Urutan di dalam setiap action (`src/features/user/actions.ts`, `src/features/auth/actions.ts`, `src/features/contact/actions.ts`):

```ts
"use server"

import { randomUUID } from "node:crypto"
import { AppError, getErrorMessage, type ErrorCode, type FieldErrors } from "@/lib/error"
import { logger } from "@/lib/logger"
import { enforceRateLimit } from "@/lib/rate-limit"
import { requireRole, requireSession } from "@/lib/rbac"

export async function createUserAction(input: unknown): Promise<UserActionResult> {
  const traceId = randomUUID()
  try {
    enforceRateLimit("global", "create-user")
    const session = await requireSession()
    requireRole(session, "admin")
    // withMetric(METRIC_NAMES.SERVER_ACTION_LATENCY, () => createUser(input), { action: "createUserAction" })
    revalidatePath("/users")
    trackMetric({ name: METRIC_NAMES.USER_CREATE, actorId: session.id })
    logAudit({ action: "user.create", category: "user_management", result: "success", severity: "info" }, { id: session.id })
    logger.info("user.created", { actorId: session.id, traceId })
    return { success: true }
  } catch (error) {
    if (error instanceof AppError) {
      logger.info("user.create.rejected", { code: error.code, traceId })
    }
    return failure(error, traceId, "user.create.unexpected_error")
  }
}
```

Kaid handler server:

1. `traceId` selalu ada dan diteruskan ke setiap `logger.*`.
2. `AppError` dicatat di level `info`/`warn` (pengelcomean yang diharapkan, bukan insiden); unknown dicatat di level `error`.
3. `cause` hanya masuk ke log server lewat `logger.error(message, error, { traceId })`; tidak pernah masuk state.
4. Event name memakai pola `domain.op` (mis. `user.created`, `user.create.rejected`, `user.create.unexpected_error`, `contact.message.received`).
5. `logAudit` dari `@/features/audit/lib/log-audit` untuk aksi sensitif (auth, role, export, delete). Audit tidak boleh menggagalkan request: fungsi itu tidak pernah melempar exception.
6. Jangan menelan `redirect()`/`notFound()` di `catch` broadened; control flow Next.js bekerja lewat exception internal.
7. Server Action bukan callback privat yang dipanggil dari server; ia juga endpoint HTTP. Tetap validasi input server-side apa pun client-nya.

## 6. Handler di Client

Signature logger yang benar (`src/lib/logger.ts`):

```ts
logger.debug(message, context?)
logger.info(message, context?)
logger.warn(message, context?)
logger.error(message, error, context?)
```

`context` selalu melewati `redactTags()` dari `@/lib/redact`: password/token/cookie dibuang, email dimask, IP di-hash.

Pola client yang benar (`src/features/contact/components/contact-form.tsx`):

```tsx
const onSubmit = async (values: ContactFormValues) => {
  setActionError(null);
  try {
    const result = await sendContactMessage(values);
    if (result.success) { setSent(true); form.reset(); return; }
    setActionError(result);
    for (const [field, messages] of Object.entries(result.error.fieldErrors ?? {})) {
      const message = messages?.[0];
      if (message && isContactField(field)) form.setError(field, { message });
    }
  } catch (error) {
    console.error("contact.submit_failed", error);
  }
};
```

Kaid handler client:

1. Submit **harus** `try/catch`. Error dari event handler tidak tertangkap `error.tsx`; tanpa `catch`, spinner menggantung dan pengguna tidak mendapat kabar.
2. `catch` cukup `console.error` ringkas; tidak ada `logger` server di client, tidak ada PII, tidak ada `error.message` ke user.
3. Banner umum ditampilkan bila `error !== null && Object.keys(error?.fieldErrors ?? {}).length === 0`. Banner **tidak** ditentukan dengan `!error?.fieldErrors` (selalu falsy-rupa).
4. UI membaca `code`/`fieldErrors`, bukan melakukan parsing teks pesan atau menebak kategori dari string.
5. Input pengguna tidak boleh hilang saat gagal. `form.formState.isSubmitting` hanya menonaktifkan tombol submit.
6. Hapus state error saat aksi baru dimulai.
7. Jangan jadikan toast satu-satunya saluran error; error penting harus tampil di area fokus dengan `role="alert"`.
8. Jangan retry otomatis `CONFLICT` atau mutasi tanpa idempotency key.

## 7. Error Boundary

File nyata di repo:

| Path | Peran |
| --- | --- |
| `src/app/error.tsx` | Root boundary, `"use client"`, pesan generik + `error.digest` + `reset()` |
| `src/app/(dashboard)/error.tsx` | Boundary per-fitur dashboard, `role="alert"`, `error.digest`, `reset()` |
| `src/app/not-found.tsx`, `src/app/(dashboard)/not-found.tsx` | Empty state 404 |
| `src/app/maintenance/page.tsx` | Halaman maintenance (bukan error) |

Bentuk yang dipakai repo:

```tsx
"use client"

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="…">
      <h2 className="mt-4 text-lg font-semibold">Gagal memuat halaman</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">Terjadi kesalahan saat menampilkan halaman ini. …</p>
      {error.digest ? <p className="mt-2 text-xs text-muted-foreground">Kode referensi: <code className="font-mono">{error.digest}</code></p> : null}
      <Button variant="outline" size="sm" className="mt-6" onClick={reset}>Coba lagi</Button>
    </div>
  )
}
```

Kaid boundary:

1. `error.tsx` **harus** Client Component; hanya itu yang bisa punya `reset()` dan lifecycle event.
2. Blast radius kecil: `error.tsx` per fitur, jangan satu boundary untuk seluruh app. Root layout failure butuh `global-error.tsx` yang menyediakan `<html>`/`<body>` sendiri (belum ada di repo).
3. `error.tsx` menangkap error render pada **child** segment, tidak pada `layout.tsx`/`template.tsx` segment yang sama di atasnya.
4. Tampilkan pesan generik + aksi retry yang aman. Satu-satunya data teknis yang boleh tampil adalah `error.digest`.
5. Jangan tampilkan `stack`, `query`, `error.message` server, atau isi `cause` di production.
6. `reset()` hanya mengulang render; jangan memaksa mutasi di dalamnya.
7. Error boundary tidak menangkap: event handler, callback async di luar render, dan error di dalam `try/catch` action. Untuk semua itu tetap `try/catch` + logger.
8. Expected error tidak boleh sampai ke boundary. Kalau envelope `success: false` berakhir di `error.tsx`, itu bug arsitektur.

## 8. Aturan Emas

1. Validasi di boundary. Input eksternal tidak tepercaya: `safeParse` di action/service, `params`/`searchParams` di page (keduanya Promise di Next.js 16).
2. Auth dan otorisasi sedekat mungkin dengan operasi: `requireSession()` + `requireRole()` di dalam action, bukan hanya di layout guard.
3. Rate-limit operasi mahal/berisiko sebelum kerja berat: `enforceRateLimit(identifier, purpose)`.
4. Satu insiden, satu `traceId`: buat di awal action, teruskan ke `logger.*` dan `failure()`.
5. Logging tanpa PII: `logger.*(message, context)` sudah di-redact otomatis; jangan menambahkan data sensitif secara manual.
6. Jangan bocorkan domain di pesan user. `userMessage`/`getErrorMessage(code)` adalah batas yang aman; `message` kustom hanya untuk kasus yang perlu kalimat spesifik.
7. `cause` untuk diagnosa, tidak pernah untuk transports. Serialisasi hanya `code`, `message`, `traceId`, `fieldErrors?`.
8. Audit aksi sensitif lewat `logAudit(...)` dari `@/features/audit/lib/log-audit`; audit tidak boleh menggagalkan request.
9. Error yang tidak menangani selalu berakhir sebagai `INTERNAL_ERROR` + log, bukan kode baru.
10. Verifikasi dengan `npm run lint` dan `npm run build` sebelum menyatakan selesai. Repo tidak punya test runner, jadi correctness envelope diverifikasi lewat review + kedua perintah itu.

## 9. Anti-Pattern

1. Melempar `AppError` dari komponen UI, atau melempar keluar dari Server Action alih-alih mengembalikan envelope.
2. Menampilkan `error.message`, `stack`, atau `cause` ke user.
3. `catch` yang hampa (`catch {}`) di jalur yang harus mencatat kegagalan.
4. `console.log` isi payload, FormData, atau body request.
5. Menebak kategori error dari teks pesan alih-alih membaca `code`.
6. Mengganti HTTP status manual per layar, atau menambah kode di luar `ERROR_CODES`.
7. Menyembunyikan error yang tidak terduga (`catch` → return sukses kosong) alih-alih memetakan ke `INTERNAL_ERROR`.
8. Menelan control flow Next.js: `redirect()`/`notFound()` tertangkap `catch` broadened sehingga navigasi mati.
9. `console.error` di loop render, atau `logger` dipanggil per render.
10. Menempelkan `src/lib/error.ts`, `logger.ts`, atau `request-context.ts` ke Client Component.
11. Melakukan retry otomatis pada `CONFLICT`, atau retry tanpa batas pada `INTERNAL_ERROR`.
12. Menyimpan `AppError` di state lalu menampilkannya apa adanya, termasuk `fieldErrors` berisi pesan mentah dari server lain.
13. Mengandalkan `error.tsx` sebagai handler validasi form, atau mengandalkan `try/catch` di action untuk hal yang harus jadi nilai balik.
