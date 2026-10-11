# 01 — Arsitektur

> Companion `00-overview.md`. Semua contoh kode disalin/diturunkan dari file nyata
> di repo (Next `16.3.6`). Kalau sebuah API tidak dipakai di repo ini, jangan
> diciptakan.

## 1. Prinsip Utama

### 1.1 Server Component sebagai default

Semua `page.tsx`, `layout.tsx`, dan komponen data adalah **Server Component**
kecuali ada alasan kuat untuk `"use client"`. Repo ini punya 30 file `"use client"`
dan semuanya berada di `components/ui/`, `components/custom/`, `components/layout/`
(interaktif), atau form/leaf di `features/*/components/`.

Server Component dipakai untuk: ambil data di server, baca secret tanpa mengirimnya
ke browser, render layout/tabel/form tanpa state browser, metadata, dan streaming.

Batasannya: tidak bisa `useState`/`useEffect`/event handler/`window`/`document`/
`localStorage`. Abstract prop `description` boleh `ReactNode` karena node React
boleh melewati boundary sebagai `children`.

### 1.2 Feature-First

Logika domain dikelompokkan di `src/features/<fitur>`, bukan di `app/` atau
`components/`. `src/app/` hanya routing dan komposisi. Konsekuensi: menambah fitur
= menambah satu folder di `src/features/`, bukan menyentuh file global.

Struktur per fitur yang dipakai di repo:

```text
src/features/<fitur>/
├── actions.ts     # Server Action ("use server") — hanya untuk fitur yang butuh mutasi
├── schema.ts      # Zod schema + tipe turunan
├── service.ts     # DAL server-only
├── types.ts       # tipe DTO/domain bila perlu
├── components/    # komponen domain (client leaf seperlunya)
├── lib/           # helper internal fitur (server-only)
└── hooks/         # hook client
```

Tidak semua file wajib ada: `landing/`, `legal/`, `notification/` tidak punya
`actions.ts`; `audit/` tidak punya `components/`.

### 1.3 Client Boundary sekecil mungkin

`"use client"` adalah **module-graph boundary**, bukan penanda satu komponen.
Semua yang di-import Client Component ikut masuk client graph. Karena itu letakkan
directive pada leaf interaktif, bukan pada layout/halaman.

Pola yang benar di repo — server page, satu client leaf:

```tsx
// src/app/(public)/about/page.tsx — Server Component
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { aboutConfig } from "@/config/public-pages";

export default function AboutPage() {
  return (
    <Button
      size="lg"
      render={<Link href={aboutConfig.cta.href} />}
    >
      {aboutConfig.cta.label}
    </Button>
  );
}
```

Pola salah: menempelkan `"use client"` ke `layout.tsx` dashboard hanya karena
satu komponen di dalamnya interaktif.

Karena primitive-nya **Base UI**, tombol berisi link memakai prop `render`,
bukan `asChild` Radix:

```tsx
// benar (src/components/layout/public-header.tsx:41)
<Button render={<Link href={link.href} />}>{link.label}</Button>
```

`grep -rn "asChild" src` → kosong. Jangan pernah menulisnya.

### 1.4 Data Minimum ke Browser

Props harus serializable, dan hanya berisi field yang dipakai UI. Buat DTO/projection
di service, jangan kirim record mentah. Tanggal Crossing boundary harus berupa
string ISO atau `Date` yang memang serializable — formatting tampilan dilakukan
di komponen client.

```tsx
// salah: mengirim seluruh objek database
<UserPanel user={databaseUser} />

// benar: DTO minimal
type UserSummary = { id: string; name: string };
<FollowButton targetUserId={user.id} initialFollowing={isFollowing} />
```

Server-rendered subtree boleh dikirim ke Client Component sebagai `children`
(mis. konten server di dalam `Dialog` client) — yang crossing boundary adalah
*output*-nya, bukan kodenya.

### 1.5 Defense in Depth

Guard di layout protects UX; **setiap operasi sensitif mengulang auth + authz di
Server Action/service**. Repo ini belum punya `proxy.ts`, jadi lapisan pertama
sebenarnya ada di action/service (`requireSession()` + `requireRole()`).

Yang wajib dijaga:

- Session cookie bukan bukti login → verifikasi ulang di server.
- `role`/`tenantId`/`ownerId` yang dikirim client hanya locator, bukan bukti hak akses.
- Default deny untuk area privat.
- Header keamanan (`next.config.ts`) adalah lapisan tambahan, bukan pengganti auth.
- `error.tsx` menampilkan pesan generik + `error.digest`; tidak pernah menampilkan
  `error.message` server atau stack trace.

## 2. Arah Dependensi

```text
route / action / Server Component
  → features/<fitur>/service.ts        (server-only, satu-satunya pintu data)
    → features/<fitur>/lib/* atau lib/  (helper internal, adapter)
      → sumber data (saat ini: in-memory / future DB atau API)
  → features/<fitur>/schema.ts         (validasi, boleh dipanggil dari route)
  → components/ui | components/custom | components/layout   (presentasi)
  → config/                            (konstanta non-secret)
```

Aturan arah:

- `lib/` **tidak boleh** mengimpor `app/` atau komponen fitur (hindari siklus).
- `components/**` **tidak boleh** mengimpor `features/*/service.ts` yang menyentuh
  server-only data; komponen presentasional menerima data lewat props.
- `config/` hanya konstanta non-secret — tidak ada credential.
- `hooks/` tidak boleh menyentuh server-only module.
- Alias yang tersedia: `@/*` → `./src/*`. Merge class pakai paket `cn`
  (`import { cn } from "cn"`), bukan `@/lib/utils` (folder `utils` tidak ada).

## 3. Route Groups

Tiga group organizing di `src/app/`, **tanpa mengubah URL**:

| Group | Layout | `<main>` dimiliki oleh | Catatan |
| --- | --- | --- | --- |
| `(public)` | `(public)/layout.tsx` | layout itu sendiri (`<main className="flex-1">`) | Route statis; halaman **tidak boleh** memakai `PageShell` atau `<main>` tambahan |
| `(auth)` | `(auth)/layout.tsx` (hanya robots metadata, fragment) | `AuthShell` (`features/auth/components/auth-shell.tsx`) | `noindex` lewat metadata layout |
| `(dashboard)` | `(dashboard)/layout.tsx` (`SidebarProvider` + `AppSidebar` + `SiteHeader`) | `PageShell` (`components/layout/page-shell.tsx`) | `noindex`; halaman tanpa `PageShell` **wajib** managing `<main>` sendiri |

Route group **bukan** security boundary. `noindex` pada `(auth)` dan `(dashboard)`
dilakukan lewat `metadata.robots` (`index: false, follow: false`) di masing-masing layout.

Contoh pemakaian di `(dashboard)`. `PageShell` boleh dipakai di `page.tsx` **atau**
di-provide sekali oleh `layout.tsx` segment — jangan dua-duanya (karena `<main>`
menjadi ganda). Yang dipakai repo: `(dashboard)/settings/layout.tsx` yang
memakai `PageShell`, sehingga halaman settings **tidak** memakainya lagi.

```tsx
// src/app/(dashboard)/settings/layout.tsx
import { PageShell } from "@/components/layout/page-shell";
import { SettingsNav } from "@/components/layout/settings-nav";

export default function SettingsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <PageShell title="Settings" description="Konfigurasi tampilan dan identitas aplikasi.">
      <SettingsNav />
      <div className="pt-2">{children}</div>
    </PageShell>
  );
}
```

`/maintenance` berada di luar ketiga group dan tidak memakai shell mana pun.

## 4. Tabel File Tanggung Jawab

| File / folder | Tanggung jawab | Larangan |
| --- | --- | --- |
| `src/app/**/page.tsx` | Route segment: validasi `params`/`searchParams`, panggil service, render | Query/filter kompleks inline, mutasi saat render |
| `src/app/**/layout.tsx` | Shell, metadata, provider segment | `<main>` ganda, pengambilan data berat yang memblokir child |
| `src/app/**/loading.tsx` | Skeleton Suspense fallback untuk segment | Fallback yang memanggil boundary server lambat |
| `src/app/**/error.tsx` | Client Component: pesan generik + `reset()` | Tampilkan `error.message`/stack, mutasi saat retry |
| `src/app/**/not-found.tsx` | Shell 404 yang konsisten per group | Guard auth tambahan di sini |
| `src/app/(public)/**` | Halaman statis dari `config/public-pages.ts` | Client library, `href="#"` placeholder |
| `src/app/(auth)/**` | Auth UI dari `config/auth-pages.ts` + config per form | Menyimpan session/credential |
| `src/app/(dashboard)/**` | Halaman dashboard, `force-dynamic` bila perlu | Static export data user |
| `src/app/sitemap.ts`, `robots.ts` | Metadata route; `LAST_MODIFIED` konstanta | `new Date()` per request |
| `src/components/ui/**` | Primitive Base UI + Tailwind | Business logic, akses data, secret |
| `src/components/custom/**` | Komposisi, adapter client-only, `theme-*` | Akses server-only module |
| `src/components/layout/**` | `PageShell`, sidebar, header, footer, breadcrumb | `<main>` di luar `(dashboard)` |
| `src/features/<f>/actions.ts` | Server Action: rate limit → session → role → service → `revalidatePath` | Callback privat, bocorkan exception |
| `src/features/<f>/service.ts` | Use case + authz + mapping DTO, `import "server-only"` | React, komponen, return entity mentah |
| `src/features/<f>/schema.ts` | Zod schema + tipe (`z.infer`/`z.input`) | Type assertion untuk menjinakkan compiler |
| `src/features/<f>/types.ts` | Tipe domain/DTO | Menggantikan `schema.ts` sebagai validasi |
| `src/features/<f>/components/**` | Komponen domain; client hanya bila interaktif | Query langsung ke sumber data |
| `src/config/**` | Copy UI, navigasi, token tema, katalog role | Secret, credential, data env sensitif |
| `src/lib/error.ts` | `ERROR_CODES`, `AppError`, mapping HTTP + pesan user | Menulis kode error baru di client |
| `src/lib/logger.ts` | Log terstruktur (pino) tanpa PII | Log password/token/cookie/payload penuh |
| `src/lib/rate-limit.ts` | `enforceRateLimit(bucket, purpose)`, sliding window in-memory | State global yang bocor antar-instance |
| `src/lib/rbac.ts` | `requireSession()`, `requireRole()`, `SessionUser` | Anggap placeholder session sebagai auth nyata |
| `src/lib/env.ts` | Validasi env Zod sekali | Akses `process.env` dari client |
| `src/lib/search-params.ts` | Parser `q`/`page`/`pageSize` dengan batas aman | `throw` pada input user |
| `src/lib/redact.ts` | Redaksi field sensitif, `import "server-only"` | Diimpor dari client |
| `src/hooks/**` | Perilaku client reusable (`use-mobile`) | Akses server-only module |
| `next.config.ts` | Security header, CSP statis, `output: "standalone"` | CSP berbasis nonce (memaksa dynamic rendering) |

## 5. Props Route Dinamis

Pada Next 16, `params` dan `searchParams` adalah **Promise** dan wajib di-`await`
di Server Component. Tipe eksplisit dipakai di repo:

```tsx
// src/app/(dashboard)/users/[id]/page.tsx
import { notFound } from "next/navigation";

type UserDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function UserDetailPage({ params }: UserDetailPageProps) {
  const { id } = await params; // await wajib

  if (id === "0") {
    notFound(); // keputusan 404 sebelum streaming dimulai
  }

  return <div className="p-6">Detail user: {id}</div>;
}
```

Ketika keduanya dipakai, destructure paralel:

```tsx
type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Page({ params, searchParams }: PageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  // validasi `query` sebagai untrusted input sebelum ke service
}
```

Aturan:

- Jangan mengubah `params`/`searchParams` menjadi object sinkron di service;
  `await` di route boundary, lalu teruskan DTO tervalidasi.
- `searchParams` adalah plain object, bukan `URLSearchParams`; nilainya tetap untrusted.
- Jangan baca `searchParams` di client Component hanya demi membuat route static —
  `/login` dan `/reset-password` memang dynamic karena butuh state UI dari query.
- Validasi id/filter sebelum query; `notFound()` netral untuk detail page
  (jangan bocorkan keberadaan resource).

## 6. Service Layer

Service adalah **DAL internal**: satu-satunya pintu data dari route, action, dan
Server Component. Wajib `import "server-only"` di baris pertama (terverifikasi pada
`features/user/service.ts`, `features/role/service.ts`, `features/roles/service.ts`,
`features/log-management/service.ts`, `features/observability/service.ts`, dan
`lib/totp.ts`, `lib/request-context.ts`, `lib/redact.ts`).

Kontrak yang dipakai repo: fungsi async eksplisit, input tervalidasi, output DTO
sederhana, error lewat `AppError`.

```ts
// src/features/user/service.ts (pola, disederhanakan)
import "server-only";

import {
  createUserSchema,
  type User,
  type UserListResult,
  type UserQuery,
} from "@/features/user/schema";
import { AppError } from "@/lib/error";

export async function getUsers(query: UserQuery): Promise<UserListResult> {
  // query sudah tervalidasi di boundary; service boleh defensively re-check
  const data = users.filter(/* … */);
  return { data, total, page: query.page, pageSize: query.pageSize, totalPages };
}

export async function createUser(input: unknown): Promise<User> {
  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) {
    // mapping ke taxonomy error, bukan Error bebas
    throw new AppError("VALIDATION_ERROR", { fieldErrors: /* … */ });
  }
  ensureUniqueEmail(parsed.data.email);
  // …
}
```

Aturan:

1. Kalau butuh session, service boleh mengambil sendiri lewat `requireSession()`
   (`src/lib/rbac.ts`); kalau tidak, caller wajib menyediakan actor/session.
2. Query selalu parameterized; projection ke DTO di dalam service.
3. Jangan return entity mentah/ORM object ke client.
4. Mutasi yang multi-write harus atomic (belum relevan karena store in-memory).
5. Error domain dipetakan di boundary; detail internal ke `logger`.
6. **Jangan** mengembalikan exception mentah dari action. Lihat §7.
7. Saat ini service memakai store in-memory (mis. `MOCK_USERS` di
   `features/user/service.ts`) — ini mock, bukan persistence.

## 7. Mutation Flow

Server Action adalah **entry point publik** yang bisa dipanggil siapa pun yang
mengetahui reference-nya. Urutan wajib di repo (terlihat di
`src/features/user/actions.ts`):

```ts
"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { createUser } from "@/features/user/service";
import { AppError, getErrorMessage, type ErrorCode, type FieldErrors } from "@/lib/error";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/rate-limit";
import { requireRole, requireSession } from "@/lib/rbac";

type UserActionResult =
  | { success: true }
  | {
      success: false;
      error: { code: ErrorCode; message: string; traceId: string; fieldErrors?: FieldErrors };
    };

function failure(error: unknown, traceId: string, event: string): UserActionResult {
  if (error instanceof AppError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.userMessage,
        traceId,
        fieldErrors: error.fieldErrors,
      },
    };
  }
  logger.error(event, error, { traceId }); // detail internal hanya ke server log
  return {
    success: false,
    error: { code: "INTERNAL_ERROR", message: getErrorMessage("INTERNAL_ERROR"), traceId },
  };
}

export async function createUserAction(input: unknown): Promise<UserActionResult> {
  const traceId = randomUUID();
  try {
    enforceRateLimit("global", "create-user"); // 1. rate limit
    const session = await requireSession();     // 2. auth (ulang, jangan percaya layout)
    requireRole(session, "admin");               // 3. authz
    await createUser(input);                     // 4. validasi + service (schema di service)
    revalidatePath("/users");                    // 5. revalidasi setelah mutasi
    logger.info("user.created", { actorId: session.id, traceId });
    return { success: true };
  } catch (error) {
    if (error instanceof AppError) {
      logger.info("user.create.rejected", { code: error.code, traceId });
    }
    return failure(error, traceId, "user.create.unexpected_error");
  }
}
```

Wajib:

- `traceId` (UUID) sebagai korelasi client ↔ server log; detail internal ke logger.
- Pesan user dari `getErrorMessage(code)`/`AppError.userMessage`, kode dari
  `ERROR_CODES` di `src/lib/error.ts` — jangan mengarang kode di client.
- Revalidasi **sebelum** `redirect`, karena `redirect` menghentikan eksekusi.
- Server Actions diproses sequential oleh dispatcher client; jangan `Promise.all`
  beberapa action dari client. Paralelkan di dalam satu action server bila perlu.
- Di sisi client: `router.refresh()` dipakai setelah aksi yang mengubah state
  server tanpa invalidasi data cache (lihat `features/auth/components/mfa-login-form.tsx:59`).

Form client (pola dari `login-form.tsx`):

```tsx
const error = actionError && !actionError.success ? actionError.error : null;
const hasFieldErrors = Object.keys(error?.fieldErrors ?? {}).length > 0;
const showGeneralError = error !== null && !hasFieldErrors;
```

- Semua submit dibungkus `try/catch` + `console.error("[nama-form] submit failed", error)`;
  error boundary tidak menangkap error event handler.
- `FormItem` wajib diberi `space-y-2`, input form `h-10`, jarak antar field `space-y-5`.

## 8. Cache Model

**Fakta terverifikasi: `cacheComponents` tidak aktif di `next.config.ts`.** Repo ini
pakai model caching Next.js sebelumnya:

- `fetch` tanpa opsi cache **tidak cached secara default**.
- Tidak ada `unstable_cache`, `"use cache"`, `cacheLife`, atau `updateTag` di repo
  (satu-satunya import `next/cache` adalah `revalidatePath` di `features/user/actions.ts`).
- Reaksi terhadap perubahan state setelah mutasi yang benar-benar ada di repo:
  - `revalidatePath("/users")` setelah create/update/delete user.
  - `router.refresh()` untuk ambil ulang RSC Payload (MFA, log disposal, integrity, seed demo).
  - `export const dynamic = "force-dynamic"` pada route settings yang perlu
    data runtime (`observability`, `ueba`, `ueba/[actorId]`, `logs/*`).
  - `export const metadata` statis untuk route `(auth)` dan `(dashboard)`.
- Halaman `(public)` dan `/maintenance` static; `/login` dan `/reset-password`
  dynamic karena membaca `searchParams`.

Kebijakan praktis di repo ini:

| Data | Model |
| --- | --- |
| Copy & landing page | Static generation, sumber `src/config/` |
| Session/placeholder user | Jangan shared-cache; verifikasi server tiap operasi |
| Role/permission | Jangan cache lintas user tanpa key yang benar |
| Route settings/observability/logs | `force-dynamic` |

Jangan menambahkan API cache yang belum dipakai (`revalidateTag` dua argumen,
`updateTag`, `"use cache"`) kecuali task itu secara eksplisit meminta migrasi cache
model — dan saat itu dokumentasikan model barunya.

## 9. Boundary Server/Client

Trust zone:

```text
UNTRUSTED  browser, form, URL, cookies, headers, params, searchParams
   │ validate + authenticate
   ▼
BOUNDARY SERVER  Server Action / page / (proxy belum ada) / service
   │ authorize + DTO/projection
   ▼
CLIENT  HTML, RSC Payload, env NEXT_PUBLIC_*, props serializable minimal
```

Aturan praktis:

- Server-only secret hanya lewat `import "server-only"`. Hanya `NEXT_PUBLIC_*` yang
  dikirim browser, dan semuanya harus dianggap publik. Akses env lewat
  `src/lib/env.ts` (validasi Zod), jangan `process.env` langsung di komponen.
- `useSearchParams`/client hook hanya untuk state presentasional; sumber kebenaran
  tetap server.
- Client Component tidak melakukan request mutasi bila Server Action cukup.
- Client cache hanya untuk polling/offline yang benar-benar butuh
  (contoh: `features/notification/service.ts` menyimpan state "read" di
  `window.localStorage` dan dibaca oleh `features/notification/hooks/use-notifications.ts`).
- Preferensi appearance disimpan di localStorage dengan whitelist
  `ALLOWED_THEME_VARS` dari `config/appearance.ts` dan dipratinjau lewat
  anti-flash script di `src/app/layout.tsx` — ini bukan persistence production.
- Semua input memakai default `autoComplete="off"` dari primitive
  `src/components/ui/input.tsx` / `textarea.tsx`, dan setiap `<form>` memakai
  `autoComplete="off"` — riwayat isian browser tidak disimpan. Hacking
  (`readOnly`/`onFocus`, menyuntik `one-time-code` per-field) tetap dilarang.
