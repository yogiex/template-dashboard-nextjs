# 02 — Konvensi Kode

Status: aturan ini diverifikasi terhadap kode repo pada 2026-09 (Next.js 16.3.6, React 19.2.8, TypeScript strict, Tailwind v4).

Dokumen acuan yang lebih panjang: `docs/CONVENTIONS.md`, `docs/ARCHITECTURE.md`, `docs/PERFORMANCE.md`.

> Koreksi penting: `docs/CONVENTIONS.md` masih menyebut repo "belum memiliki komponen UI shadcn, service layer, atau fitur". Itu **tidak benar lagi**. Repo sudah punya `@base-ui/react` sebagai primitive, `src/components/ui/` (23 file), `src/features/*` dengan `service.ts`/`schema.ts`/`actions.ts`, dan `src/config/`. Ikuti kondisi nyata repo yang diringkas di bawah, bukan kalimat lama di dokumen tersebut.

## Naming

| Jenis | Format | Contoh nyata di repo |
| --- | --- | --- |
| Folder di `src/components/**` | `kebab-case` | `page-shell/`, `command-menu/`, `theme-color-picker/` |
| File komponen/hook/service | `kebab-case.tsx` / `.ts` | `login-form.tsx`, `page-shell.tsx`, `empty-state.tsx`, `data-table-pagination.tsx`, `use-mobile.ts` |
| Nama komponen (export) | `PascalCase` | `LoginForm`, `PageShell`, `EmptyState`, `UserTable` |
| Hook | `useXxx`, file `kebab-case.ts` | `use-mobile.ts` → `useIsMobile`-style export |
| Consta config | `UPPER_SNAKE_CASE` | `LOGIN_PAGE_FORM_CONFIG`, `MFA_RATE_LIMIT`, `UEBA_PAGE_CONFIG` |
| Consta lokal / nilai | `camelCase` | `formConfig`, `isSubmitting`, `hasFieldErrors` |
| Fungsi, parameter, property | `camelCase` | `buildListUrl`, `setActionError`, `fieldErrors` |
| Route segment | `kebab-case`, lowercase | `/reset-password`, `/check-email`, `/settings/ueba/[actorId]` |
| Route group | `(nama-tanpa-spasi)` | `(auth)`, `(dashboard)`, `(public)` |
| Tipe props | `type`/`interface` + nama komponen | `PageShellProps`, `EmptyStateProps`, `LoginFormProps` |

Aturan tambahan:

- Semua nama file, komponen, dan identifier berbahasa Inggris; copy user-facing berbahasa Indonesia dan datang dari `src/config/`.
- Hindari nama generik (`utils.ts`, `data.ts`, `helper.ts`) di dalam `features/`; repo memakai nama spesifik (`search-params.ts`, `rate-limit.ts`, `password-strength.ts`, `redact.ts`).
- Idiom: satu file satu tanggung jawab. Jangan mencampur service, schema, dan komponen dalam satu file.

## Import Order

Tidak ada ESLint rule ordering di `eslint.config.mjs`, tetapi urutan berikut konsisten dipakai di repo dan harus diikuti:

1. Directive paling atas: `"use client"` atau `"use server"` (blank line setelahnya).
2. Import `type` dari React/Next lebih dulu bila ada: `import type { Metadata } from "next"`, `import type { ReactNode } from "react"`.
3. Import `next/*` (`next/link`, `next/navigation`, `next/image`, `next/font`).
4. Import React (`react`).
5. Library pihak ketiga (`react-hook-form`, `@hookform/resolvers/zod`, `zod`, `lucide-react`, `next-themes`).
6. Baris kosong, lalu alias internal:
   - `@/components/ui/*` dan `@/components/custom/*`
   - `@/config/*`
   - `@/features/*`
   - `@/lib/*` (termasuk `cn` yang diimpor sebagai `import { cn } from "cn"`).

Contoh pola nyata (`src/app/(dashboard)/settings/ueba/[actorId]/page.tsx`):

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UEBA_PAGE_CONFIG } from "@/config/observability";
import { RiskBadge } from "@/features/ueba/components/risk-badge";
import { getUserRiskProfile } from "@/features/ueba/service";
```

Aturan tambahan:

- Import **nama secara spesifik**, jangan wildcard. `import { AlertTriangle, RotateCcw } from "lucide-react"`, bukan `import * as Icons`.
- `cn` datang dari package `cn` (`import { cn } from "cn"`), **bukan** `@/lib/utils`. `components.json` masih menunjuk `utils: "@/lib/utils"` dan itu stale; file tersebut tidak ada. Ikuti kode: `from "cn"`.
- Gunakan `import type` untuk type-only import; `isolatedModules` aktif.
- Jangan mengimpor `src/features/*/service.ts` dari Client Component (file itu `import "server-only"`).

## Props Pattern

- Repo memakai `type` untuk props, bukan `interface`, di majority file baru (`PageShellProps`, `EmptyStateProps`, `ErrorStateProps`, `MfaActionState<T>`). `interface` masih dipakai di sebagian form lama (`LoginFormProps`). Pilih `type` untuk kode baru; konsisten dengan file terdekat.
- Props opsional selalu `?`. Default value di destructure, bukan di tipe:

```tsx
type EmptyStateProps = {
  title: string
  description?: ReactNode
  icon?: LucideIcon
  action?: ReactNode
  className?: string
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className,
}: EmptyStateProps) { /* ... */ }

export type { EmptyStateProps }
```

- Props list bulat boleh inline (`{ result, query }: { result: UserListResult; query: UserQuery }` di `user-table.tsx`) untuk komponen lokal; props yang diekspor lintas file tetap named type.
- Rename saat destructure untuk member yang valid sebagai identifier JSX: `icon: Icon = Inbox`.
- Union discriminated untuk state hasil server action (lihat `03-components.md` bagian Form).
- Props lintas batas Server → Client harus serializable. Jangan kirim function, token, atau entity database. Function `onRetry` hanya boleh di dalam subtree client.

## File Placement Rules

```
src/
├── app/                      # route saja: page, layout, loading, error, not-found, metadata
│   ├── (auth)/               # login, register, mfa, reset-password, verify-email, invite
│   ├── (dashboard)/          # /dashboard, /users, /roles, /settings + error/loading/not-found
│   ├── (public)/             # /, /about, /contact, /privacy, /terms
│   └── maintenance/
├── components/
│   ├── ui/                   # primitive upstream (Base UI + cva). TANPA logika bisnis
│   ├── layout/               # shell, sidebar, header, navigasi lintas halaman
│   └── custom/               # komposisi aplikasi: empty-state, error-state, theme-*
├── config/                   # konstanta non-secret + copy (UPPER_SNAKE_CASE)
├── features/<domain>/        # actions.ts, service.ts, schema.ts, components/, lib/
├── hooks/                    # use-mobile.ts
└── lib/                      # utilitas murni: logger, error, rate-limit, rbac, redact
```

Aturan penempatan yang ditegakkan di review:

| Kode | Taruh di | Bukan di |
| --- | --- | --- |
| Route, `metadata`, `layout`, `loading`, `error`, `not-found` | `src/app/` | `src/components/` |
| Navigasi, sidebar, topbar, `<main>` shell | `src/components/layout/` | features |
| Primitive tanpa domain (button, input, card, dialog, ...) | `src/components/ui/` | features |
| Komposisi yang memakai domain/app state | `src/components/custom/` atau `src/features/<d>/components/` | `ui/` |
| Copy/teks user-facing | `src/config/` | inline di komponen |
| Akses data | `src/features/<d>/service.ts` | komponen, action UI |
| Validasi boundary | `src/features/<d>/schema.ts` | di dalam komponen |
| Utilitas tanpa React | `src/lib/` | komponen |
| Logger, taxonomy error, rate limit, RBAC | `src/lib/` | features |

Tambahan:

- `PageShell` hanya untuk segment `(dashboard)`. `(public)/layout.tsx` dan `AuthShell` sudah memiliki `<main>` masing-masing — jangan nest `PageShell` di sana (akan jadi `<main>` ganda).
- `src/features/*/service.ts` harus diawali `import "server-only"`.
- Jangan membuat folder kosong hanya untuk memenuhi struktur.

## Config-Driven

Semua teks yang dilihat pengguna (label, judul, pesan error, nama tombol, link CTA, label badge) diambil dari `src/config/*.ts` dan diteruskan sebagai props `config` ke komponen. Ini pola yang dipakai `LoginPageFormConfig`, `UEBA_PAGE_CONFIG`, `siteConfig`.

```ts
// src/config/login-page.ts
import type { LoginPageFormConfig } from "@/features/auth/schema";

export const LOGIN_PAGE_FORM_CONFIG: LoginPageFormConfig = {
  title: "Selamat Datang Kembali",
  submitLabel: "Masuk",
  emailLabel: "Email",
  emailPlaceholder: "nama@email.com",
  showForgotPassword: true,
  forgotPasswordLabel: "Lupa kata sandi?",
  forgotPasswordHref: "/forgot-password",
  footerText: "Belum punya akun?",
  signUpLabel: "Daftar sekarang",
  signUpHref: "/register",
};
```

```tsx
// Server Component: ambil config, kirim sebagai props serializable
export default function LoginPage() {
  return <LoginForm config={LOGIN_PAGE_FORM_CONFIG} />;
}
```

```tsx
// Client Component: typed props, tanpa string inline
type LoginFormProps = {
  config: LoginPageFormConfig
}

export function LoginForm({ config }: LoginFormProps) {
  const formConfig = config
  // ...
  return <Button type="submit">{formConfig.submitLabel}</Button>
}
```

Aturan:

- `src/config/` hanya berisi konstanta non-secret. Jangan menaruh API key, password, atau credential mock (`demo@example.com` / `password123` hanya untuk demo di data mock, jangan dipakai ulang di kode baru).
- Tipe config didefinisikan di `schema.ts` milik feature, bukan di dalam file config (menghindari import siklik).
- Link header/footer hanya menuju route yang benar-benar ada. Tidak ada `href="#"` placeholder.

## Barrel Export

- Repo **tidak** memakai barrel file (`index.ts`). Semua import langsung ke file nyata:

```tsx
import { EmptyState } from "@/components/custom/empty-state";
import { Button } from "@/components/ui/button";
```

- Jangan membuat `src/components/ui/index.ts` atau `src/features/<d>/index.ts`. Barrel menarik modul besar ke client graph dan merusak code splitting (lihat `docs/PERFORMANCE.md` §10.3).
- Pattern yang dipakai repo untuk tipe: definisi `type` di atas, lalu re-export di baris terakhir file tersebut (`export type { EmptyStateProps }`). Untuk komponen + cva, `export { Button, buttonVariants }` di `button.tsx`.
- Ikuti struktur ini; jangan mengimpor dari path yang tidak ada.

## Comments (WHY bukan WHAT)

Repo nyaris tanpa komentar. Yang ada hanya komentar yang menjelaskan alasan (lihat `login-form.tsx` dan `actions.ts`):

```tsx
// Step 2: kredensial benar tapi MFA aktif. Token sudah disimpan di cookie
// httpOnly oleh server action, jadi tidak ada token yang lewat URL.
if (result.mfaRequired) {
  router.push(result.nextPath);
  return;
}
```

```ts
/**
 * Limit auth yang diperketat dari default (5/menit) ke 5 per 15 menit.
 * Alasannya: brute force kredensial, kode OTP, dan backup code semuanya punya
 * entropy rendah dan sering diulang; jendela 15 menit bluntasi percobaan otomatis
 * tanpa mengganggu pengguna sah yang salah ketik beberapa kali.
 */
const MFA_RATE_LIMIT = { maxAttempts: 5, windowMs: 15 * 60 * 1000 } as const;
```

Aturan:

- Tulis komentar hanya untuk **alasan**, trade-off, constraint, atau kontrak yang tidak terlihat dari kode. JANGAN mengulang apa yang sudah tertulis kode.
- Inline `//` 1–3 baris untuk keputusan lokal; JSDoc `/** */` untuk konstanta/fungsi yang trade-off-nya perlu dibaca semua orang.
- Jangan pernah tinggalkan `TODO` tanpa pemilik dan kriteria selesai; lebih baik buat issue.
- Jangan pernah menulis komentar yang membocorkan secret, nama environment internal, atau detail keamanan sensitif (yang dilakukan `src/lib/logger.ts` + `redact.ts`).
- Dari `AGENTS.md`: jangan menambahkan kode komentar apa pun kecuali diminta. Efeknya: defaultnya nol komentar; tulis komentar hanya jika memang menjelaskan WHY.

## TypeScript Strict

`tsconfig.json`: `strict: true`, `noEmit: true`, `isolatedModules: true`, `moduleResolution: "bundler"`, alias `@/*` → `src/*`. `target: ES2017`.

- Dilarang `any` sebagai default. Input yang belum tervalidasi → `unknown`, lalu persempit dengan type guard atau Zod.
- Dilarang type assertion untuk "menjinakkan" compiler (`as any`, `x as true`, `as SomeInterface` tanpa dasar). Assertion hanya sah bila dibenarkan validasi, type guard, atau batas integrasi yang diketahui. Kalau schema tidak bisaquées accommodate bentuk data, **ubah schema**.
- Hindari `enum` untuk data runtime; pakai union type atau object constant.
- Union untuk state yang tidak boleh bercampur:

```ts
export type ActionState =
  | { success: true }
  | { success: false; error: ActionError }

export type MfaActionState<T> =
  | { success: true; data: T }
  | { success: false; error: ActionError }
```

- Type untuk narrowing field dari `Object.keys(...)`: gunakan type predicate, bukan assertion.

```ts
function isLoginField(field: string): field is keyof LoginFormValues {
  return field === "email" || field === "password" || field === "rememberMe"
}
```

- Exported component/public API wajib typed eksplisit; internal boleh rely on inferensi.
- Validasi selalu di boundary (`schema.ts` dengan Zod) untuk body, form, `params`, `searchParams`, cookie, dan hasil fetch yang memengaruhi aplikasi.
- Formatting: repo tidak punya konfigurasi Prettier/format (`npm run lint` = ESLint saja). Gaya penulisan repo terbagi dua — `src/components/**` dan `src/features/user/**` tanpa titik koma di akhir baris; `src/features/auth/**` dan sebagian `src/app/**` memakai titik kama. **Ikuti style file yang kamu sentuh**; jangan memformat ulang file yang tidak terkait dalam diff.

## Async/Await

- Server Component boleh `async`. Client Component yang perlu server interaction tidak boleh memanggil data langsung — terima action/data lewat props.
- `params` dan `searchParams` adalah **Promise** dan wajib di-`await`:

```tsx
type UebaActorPageProps = {
  params: Promise<{ actorId: string }>
}

export default async function UebaActorPage({ params }: UebaActorPageProps) {
  const { actorId } = await params
  const profile = getUserRiskProfile(actorId)

  if (!profile) {
    notFound()
  }
  // ...
}
```

- Request independen diparalelkan dengan `Promise.all` / `Promise.allSettled`; hindari sequential `await` yang tidak punya dependency.
- `<Suspense>`/`loading.tsx` untuk data lambat; `error.tsx` untuk failure, dengan tombol `reset()`.
- Cache model aktif di repo: `cacheComponents` **tidak** diaktifkan (`docs/PERFORMANCE.md` §5.2). `fetch` tidak di-cache default; pakai `cache: "force-cache"` atau `next: { revalidate, tags }` bila scope-nya aman. Untuk invalidasi: `revalidateTag("x", "max")` (dua argumen) dari server, `updateTag("x")` dari Server Action, `revalidatePath(path)` hanya jika path penuh memang perlu diinvalidasi.
- Mutation harus dalam urutan: validasi server → otorisasi → mutation → invalidasi cache → (opsional) update UI optimistic → jangan serius sebelum server konfirmasi.
- Jangan `await` di dalam `render` loop atau di dalam komponen presentasional; hitung sebelum return.
