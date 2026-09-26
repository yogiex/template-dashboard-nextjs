# 04 — Data Fetching

> Semua signature di dokumen ini sudah diverifikasi terhadap kode repo (Next.js `16.3.6`, React `19.2.8`, zod `^3.25.76`) per 2026-09. Verifikasi klaim sebelum mengandalkannya; dokumentasi boleh tertinggal dari kode.

Dokumen acuan: `docs/ARCHITECTURE.md` §6, §7, §8, §9, `docs/PERFORMANCE.md` §3, §4, §5, `docs/SECURITY.md`.

## 0. Status integrasi data (baca dulu)

Template ini **frontend-only**. Yang ada:

- Service in-memory dengan `import "server-only"`, misalnya `src/features/user/service.ts`, `src/features/auth/service.ts`.
- Session mock di `src/lib/rbac.ts` (`requireSession()` mengembalikan user placeholder).
- Rate limiter in-memory di `src/lib/rate-limit.ts`.
- Audit store in-memory di `src/features/audit/lib/store.ts`.

Yang **belum ada** di template (jangan mengarang import-nya):

| Tidak ada | Catatan |
| --- | --- |
| `src/lib/db.ts`, Prisma/ORM, koneksi database | Lihat `docs/INTEGRATION.md`; DAL ada di `src/features/*/service.ts` sebagai satu-satunya pintu data |
| Route Handler (`src/app/**/route.ts`) | Nol file `route.ts` di repo. Pola handler + `problemResponse` sudah siap di `src/lib/api.ts` untuk dipakai nanti |
| SWR / TanStack Query | Tidak terpasang (`docs/PERFORMANCE.md` §4.4). Client fetching hanya bila perlu |
| Redis / cache handler | Cache masih in-memory bawaan Next.js |

## 1. Read default di Server

Read selalu di Server Component. Pola nyata di `src/app/(dashboard)/users/page.tsx`:

```tsx
import type { Metadata } from "next"
import { PageShell } from "@/components/layout/page-shell"
import { userQuerySchema } from "@/features/user/schema"
import { getUsers } from "@/features/user/service"

type UsersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const resolved = await searchParams
  const flat = Object.fromEntries(
    Object.entries(resolved).map(([key, value]) => [
      key,
      Array.isArray(value) ? (value[0] ?? "") : (value ?? ""),
    ]),
  )
  const parsed = userQuerySchema.safeParse(flat)
  const query = parsed.success ? parsed.data : userQuerySchema.parse({})
  const result = await getUsers(query)

  return <PageShell title="Users" description="Kelola pengguna aplikasi.">{/* … */}</PageShell>
}
```

Aturan:

1. `searchParams`/`params` adalah **Promise** di Next.js 16 — wajib `await` (ARCHITECTURE §4.1).
2. Validasi query di boundary dengan schema `safeParse`; jangan `as` assertion.
3. Query yang tidak valid tidak boleh melempar error ke user — fallback ke default schema.
4. Service (`getUsers`) sudah `import "server-only"`; data tidak pernah melewati client boundary sebagai entity.
5. Client Component tidak butuh fetch data yang sudah dirender server; kirim props serializable.
6. Otorisasi tetap di server pada setiap sumber data, bukan hanya di root layout.

## 2. Read paralel

Data independen dijalankan paralel; jika B bergantung pada A, itu dependency, bukan paralelisasi.

```tsx
const [summary, activity, alerts] = await Promise.all([
  getSummary(),
  getRecentActivity(),
  getAlerts(),
])
```

`Promise.allSettled` bila satu bagian boleh gagal tanpa menggagalkan yang lain; jangan pakai `await A; await B` untuk data independen. Payload dipaginasi/di-project di server (`getUsers` sudah mengembalikan `UserListResult`, bukan array penuh).

## 3. Tabel Cache Model

**`cacheComponents` TIDAK aktif** di `next.config.ts` (sudah diverifikasi: `nextConfig` hanya berisi `output`, `poweredByHeader`, `productionBrowserSourceMaps`, `headers()`). Jadi yang berlaku adalah model caching pra-`cacheComponents`:

| Kebutuhan data | Strategi di repo ini |
| --- | --- |
| Konten stabil `(public)/**`, `(auth)/**` shell | Static generation / prerender; tidak ada accessor I/O per request |
| `PageShell` + data dashboard | Server read per request; **tidak** di-cache |
| Data user-scoped | Tidak boleh shared-cache; cache key harus memuat identitas actor |
| Config (`src/config/**`) | Konstanta import, dibaca di server saat render |
| Audit / log / observability | In-memory per-instance, selalu fresh, tidak di-cache |
| Rate limit state | In-memory per-instance (`globalThis` + `Symbol.for`) |

Implikasi praktis:

- Jangan menulis `fetch(..., { cache: "force-cache" })` "karena Next.js saja" — pada model ini `fetch` **tidak** cached secara default; cache harus eksplisit.
- Request `fetch` identik dalam satu server render dapat dimemoisasi Next.js; accessor non-`fetch` (service in-memory) **tidak** mendapat request memoization. Bungkus dengan React `cache` bila reader yang sama dipanggil berulang dalam satu render pass.
- `unstable_cache` **belum dipakai di mana pun** di `src/`. Jika nanti dipakai untuk non-`fetch`, gunakan key parts + tags yang sempit dan stabil, dan versioned key bila schema berubah.
- Jangan pakai `cacheComponents` semantics (`"use cache"`, `cacheLife`, `cacheTag`) — API itu tidak aktif di build ini.
- Jangan pernah mengaktifkan `cacheComponents` hanya untuk performa tanpa migrasi route + uji kebenaran data (ARCHITECTURE §9.1).

## 4. Waterfall Prevention

1. Kelompokkan data independen dalam satu service call bila round trip mahal.
2. Mulai semua promise independen sebelum `await` penting.
3. Letakkan fetching sedekat mungkin dengan bagian UI yang memakainya (page/segment, bukan root layout).
4. Cache hanya bila freshness dan scope-nya aman; cache tidak memperbaiki data yang salah scope.
5. Stream bagian lambat dengan `<Suspense>` agar shell tidak terblokir.
6. Preload: panggil accessor tanpa `await` sebelum pekerjaan blocking, lalu `await` fungsi yang sama di konsumen. Hanya bila aman terhadap security/context.

## 5. Mutation Server Action (envelope wajib)

Semua mutasi lewat Server Action di `src/features/*/actions.ts` dengan file-level `"use server"`. Envelope wajib mengikuti bentuk yang benar-benar dipakai repo:

```ts
import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"

import { AppError, getErrorMessage, type ErrorCode, type FieldErrors } from "@/lib/error"
import { logger } from "@/lib/logger"
import { enforceRateLimit } from "@/lib/rate-limit"
import { requireRole, requireSession } from "@/lib/rbac"

export type UserActionResult =
  | { success: true }
  | {
      success: false
      error: { code: ErrorCode; message: string; traceId: string; fieldErrors?: FieldErrors }
    }

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

Urutan wajib di dalam action (`src/features/user/actions.ts` sebagai acuan):

1. `const traceId = randomUUID()` — **sebelum** `try`, satu insiden satu traceId.
2. `enforceRateLimit(identifier, purpose)` — untuk operasi mahal/berisiko.
3. `await requireSession()` lalu `requireRole(session, "admin")` (dari `@/lib/rbac`) — guard dekat operasi, bukan hanya di layout.
4. Validasi di service/schema (`input: unknown` di signature, bukan tipe domain).
5. `await withMetric(METRIC_NAMES.SERVER_ACTION_LATENCY, () => serviceFn(input), { action: "createUserAction" })` dari `@/features/observability/lib/track`.
6. `revalidatePath("/users")` **setelah** commit.
7. `trackMetric({ name: METRIC_NAMES.USER_CREATE, actorId: session.id })`, `logAudit(...)` bila ada perubahan sensitif, lalu `logger.info("user.created", { actorId, traceId })`.
8. `return { success: true }` (bukan objek domain penuh, bukan error mentah).
9. `catch`: `AppError` → `logger.info("<domain>.<op>.rejected", { code, traceId })`, lalu `return failure(...)`. Unknown tetap `failure(...)` yang melog `logger.error`.

Aturan tambahan:

- Action **tidak boleh** melempar error domain ke `error.tsx`; yang di-catching selalu `AppError`, unknown menjadi `INTERNAL_ERROR`.
- Jangan Performed mutasi (side effect) saat render.
- Jangan return data domain mentah, error database, atau seluruh entity hasil mutasi.
- `redirect()`/`notFound()` adalah control flow framework; jangan ditelan `catch` broadened tanpa stadium yang jelas.

## 6. Client Form

Form di repo memakai `react-hook-form` + `zodResolver` dan memanggil action secara langsung, **bukan** `useActionState`. Lihat `src/features/contact/components/contact-form.tsx` dan `src/features/auth/components/login-form.tsx`:

```tsx
"use client";

const form = useForm<ContactFormValues>({ resolver: zodResolver(contactFormSchema), defaultValues: { … } });
const [actionError, setActionError] = useState<ContactActionState | null>(null);
const error = actionError && !actionError.success ? actionError.error : null;
const hasFieldErrors = Object.keys(error?.fieldErrors ?? {}).length > 0;
const showGeneralError = error !== null && !hasFieldErrors;

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

Aturan form client:

1. `"use client"` hanya di leaf; server subtree diteruskan lewat `children`.
2. Submit **selalu** `try/catch` + `console.error` ringkas — error boundary tidak menangkap event handler.
3. Alert umum ditentukan `Object.keys(error?.fieldErrors ?? {}).length > 0`, bukan `!error?.fieldErrors`.
4. Input tidak boleh hilang saat gagal; `isSubmitting` hanya menonaktifkan tombol submit.
5. Validasi client adalah UX; server tetap validasi ulang (schema di action/service).
6. Jangan fetch data awal di client untuk data yang sudah dirender server; klik "Coba lagi" boleh memanggil router refresh/revalidasi, bukan fetch manual.

## 7. Rate Limit

`src/lib/rate-limit.ts`, sliding window in-memory:

```ts
import { enforceRateLimit, getRateLimitState, resetRateLimit } from "@/lib/rate-limit"

enforceRateLimit(identifier, purpose, options?: { maxAttempts?: number; windowMs?: number }): void
getRateLimitState(identifier, purpose, options?): { count: number; remaining: number; resetAt: number; limited: boolean }
resetRateLimit(identifier, purpose, options?): void
```

- `enforceRateLimit` **melempar** `new AppError("RATE_LIMITED")` tanpa pesan custom — pesan dan threshold tidak boleh bocor.
- Default: 5 percobaan / 60 detik per bucket `purpose:maxAttempts:windowMs`.
- Pola identifier di repo: `enforceRateLimit("global", "create-user")` untuk pembatas kasar per proses, plus identifier spesifik (`getEmailHint(input)`, `getSafeRequestContext().ipHash`) untuk pembatas per-subjek.
- Bucket name per operasi (`"create-user"`, `"update-user"`, `"delete-user"`, `"contact"`) — jangan memakai ulang satu bucket untuk operasi berbeda.
- `getRateLimitState` hanya untuk UI/diagnostik internal; jangan tampilkan angka threshold ke user.
- Rate limit adalah Kontrol yangsehimpit, bukan security boundary tunggal; session + RBAC tetap wajib.
- Untuk auth, `MFA_RATE_LIMIT = { maxAttempts: 5, windowMs: 15 * 60 * 1000 }` di `src/features/auth/actions.ts`.

## 8. Revalidation

Yang benar-benar dipakai repo: **`revalidatePath` saja** (`src/features/user/actions.ts`, 3 call site). Nol pemakaian `revalidateTag`, `updateTag`, atau `unstable_cache` di `src/` (sudah diverifikasi lewat grep).

```ts
import { revalidatePath } from "next/cache"

revalidatePath("/users") // setelah commit, di dalam action
```

Pilihan according kebutuhan:

| Kebutuhan | Operasi |
| --- | --- |
| Read-your-own-writes pada route tertentu | `revalidatePath("/users")` — yang dipakai repo |
| Invalidasi lintas banyak halaman | `revalidateTag(tag, profile)` dua argumen; pada Next.js `16.3.6` bentuk satu argumen sudah deprecated. **Belum dipakai di repo** — bila dipakai, ikutkan tag saat fetch dan jangan lupa profile |
| Mutasi yang harus langsung terlihat di cache tag | `updateTag(tag)` — hanya bisa dipanggil dari Server Action. **Belum dipakai di repo** |
| Route state berubah tanpa data cache | `refresh` dari `next/cache` |
| Navigasi ke tujuan yang butuh data fresh | `revalidatePath(...)` lalu `redirect(...)` |

Aturan:

- Revalidasi **setelah** commit, tidak sebelum.
- `revalidatePath` dengan path yang benar-benar ada di `src/app`; jangan path karangan.
- Jangan menambahkan `revalidate`/`fetchCache` segment untuk "mengatasi" badge missing — itu menutupi masalah scope cache, bukan menyelesaikannya.
- Cache key harus memuat dimensi yang memengaruhi hasil: resource id, tenant, locale, filter/sort/page, role bila hasil benar-benar beda per role. Jangan pakai session token mentah sebagai cache key.
- Jangan cache: secret/token, output yang berbeda per ownership, hasil validasi per-request, response error sensitif.

## 9. Streaming & Suspense

```tsx
import { Suspense } from "react"

export default function Page() {
  return (
    <PageShell title="…">
      <Suspense fallback={<ActivitySkeleton />}>
        <Activity />
      </Suspense>
    </PageShell>
  )
}
```

- Pakai `<Suspense>` untuk data uncached yang lambat; boundary dekat dengan data lambat lebih baik daripada satu boundary besar.
- Jangan menambah boundary jika hanya menambah kompleksitas tanpa memperbaiki loading.
- Fallback harus ringan, mempertahankan dimensi layout, dan tidak memanggil boundary server lambat sendiri.
- `loading.tsx` tidak membungkus `layout.tsx` pada segment yang sama; jika layout melakukan runtime data access, bungkus dengan `<Suspense>` eksplisit.
- File `loading.tsx` nyata: `src/app/(dashboard)/loading.tsx`, `(dashboard)/users/loading.tsx`, `(dashboard)/roles/loading.tsx`, `(dashboard)/dashboard/loading.tsx` — semuanya `Skeleton` dari `@/components/ui/skeleton`, tanpa `"use client"`.

## 10. Loading / Error Boundary

File nyata:

| Path | Isi |
| --- | --- |
| `src/app/error.tsx` | root boundary, `"use client"`, generic message + `error.digest` + tombol `reset()` |
| `src/app/(dashboard)/error.tsx` | boundary per-fitur dashboard, `role="alert"`, `error.digest`, `reset()` |
| `src/app/(dashboard)/not-found.tsx`, `src/app/not-found.tsx` | empty state 404 |
| `src/app/(dashboard)/loading.tsx` + per-route | skeleton |

Aturan:

- `error.tsx` adalah Client Component; menangkap error render pada child segment, **tidak** pada layout/template di atasnya. Root layout failure butuh `global-error.tsx` (belum ada di repo — buat hanya bila root document benar-benar gagal, dan sediakan `<html>`/`<body>` sendiri).
- Tampilkan pesan generik + aksi retry aman. Jangan tampilkan stack, query, atau `error.message` server di production. `error.digest` adalah satu-satunya korelasi yang aman ditampilkan.
- Error boundary tidak menangkap: event handler, `try/catch` di dalam action, dan error async di luar render. Untuk itu tetap `try/catch` + `logger.error`.
- Expected error dimodelkan sebagai **nilai** (envelope `success: false`), bukan `throw` yangASED ke boundary.
- `catchError` Next.js 16 untuk component-level recovery belum dipakai di repo; jangan memperkenalkan tanpa kebutuhan terukur.
- Route yang butuh maintenance/static deklaratif memakai `src/app/maintenance/page.tsx`, bukan memaksa `error.tsx`.

## 11. Jangan (anti-pattern data)

1. Jangan `fetch` dari browser untuk data yang sudah bisa diakses server (round trip bolak-balik ke API sendiri).
2. Jangan `await` berurutan untuk data independen.
3. Jangan menaruh `fetch`/service call berat di `root layout`; fatal untuk seluruh app saat gagal.
4. Jangan baca dari Client Component yang bisa dirender di server (membikin boundary client melebar).
5. Jangan membawa `src/lib/rbac.ts`, service, atau `request-context.ts` ke bundle client — semuanya server-only.
6. Jangan mengirim props lintas boundary yang tidak serializable atau melebihi field yang dipakai UI.
7. Jangan mengembalikan objek domain penuh/row database ke client; bentuk DTO di service.
8. Jangan mengandalkan cache untuk kebenaran data auth-scoped; authorization dicek ulang per operasi.
9. Jangan menjadikan `dangerouslySetInnerHTML` atau response mentah eksternal sebagai data view.
10. Jangan bypass lapisan service untuk "lebih cepat" — `service.ts` adalah satu-satunya pintu data, dan `import "server-only"` penjaganya.
11. Jangan memakai `"use client"` untuk read async server; biarkan `async` di Server Component.
12. Jangan fetch di `metadata`/generateMetadata dengan side effect; metadata adalah jalur render yang bisa dijalankan ulang.
13. Jangan mengandalkan `unstable_cache`/`revalidateTag`/`updateTag` sebagai API yang sudah tersedia — di repo ini belum ada call site; kalau menambahkan, baca ulang docs Next 16.3.6 saat itu.
