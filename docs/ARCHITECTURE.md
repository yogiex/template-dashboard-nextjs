# Arsitektur Aplikasi

## 1. Tujuan dan Prinsip

Dokumen ini adalah panduan arsitektur utama untuk `template-nextjs-dashboard`. Panduan ini menjelaskan batas tanggung jawab, aliran request dan data, pilihan rendering, service layer, strategi cache, fallback error/loading, serta batas keamanan.

Prinsip yang berlaku:

1. **App Router dan Server Component sebagai default.** Ambil data sedekat mungkin dengan server yang merender UI.
2. **Route adalah orchestrator.** `page.tsx`, `layout.tsx`, Server Action, dan Route Handler menyusun use case; business logic tidak boleh didorong ke komponen presentasional.
3. **Feature-first organization.** Logika yang hanya relevan untuk satu domain dikelompokkan di `src/features/<fitur>` agar tidak bocor ke seluruh aplikasi.
4. **Service layer sebagai Data Access Layer (DAL).** Database, API internal, autentikasi, dan aturan akses hanya dipanggil dari kode server melalui service terkomodialisasi.
5. **Client boundary sekecil mungkin.** Tambahkan `"use client"` hanya pada entry point subtree interaktif, bukan pada seluruh layout atau halaman.
6. **Data minimum masuk browser.** Kirim DTO serializable yang memang dibutuhkan UI, bukan objek domain atau record database mentah.
7. **Defense in depth.** Guard di `proxy.ts`/layout membantu UX, tetapi setiap operasi sensitif mengulang authentication dan authorization di server. Pada Next.js 16, `middleware` disebut **Proxy**; fungsinya tetap sama.
8. **Fallback berbeda untuk kondisi berbeda.** Expected error, uncaught render error, not found, loading, dan unauthorized/redirect tidak boleh disamakan.
9. **Konfigurasi eksplisit.** Cache, rendering, security header, dan origin allowance ditentukan berdasarkan karakter data serta deployment; jangan ditebak.

## 2. Gambaran Teknologi

Versi penting yang harus dipertimbangkan saat mengubah arsitektur:

- Next.js `16.3.6` dengan App Router.
- React `19.2.8` dan React DOM `19.2.8`.
- TypeScript strict.
- Tailwind CSS `4`.
- ESLint `9` dan `eslint-config-next`.
- App Router berbasis React Server Components (RSC), Server Actions, Server Function, streaming, dan React Suspense.

Perintah penting:

```text
npm run dev     # server pengembangan
npm run lint    # ESLint
npm run build   # production build dan type checking Next.js
npm run start   # menjalankan hasil production build
```

## 3. Struktur Folder

### 3.1 Struktur aktual repository

Struktur berikut mencerminkan file source dan konfigurasi yang ada di working tree saat dokumentasi ini diperbarui. Folder generated seperti `node_modules/`, `.next/`, dan `tsconfig.tsbuildinfo` sengaja tidak dicantumkan sebagai bagian source aplikasi.

```text
.
├── .dockerignore
├── .env.example
├── .gitignore
├── AGENTS.md
├── CLAUDE.md
├── CONTRIBUTING.md
├── Dockerfile
├── docker-compose.yml
├── components.json
├── eslint.config.mjs
├── next-env.d.ts
├── next.config.ts
├── package.json
├── package-lock.json
├── postcss.config.mjs
├── README.md
├── scripts/
│   ├── code-graph.sh
│   └── code-graph-transform.js
├── SECURITY_PRESETS.md
├── tsconfig.json
    ├── docs/
    │   ├── ARCHITECTURE.md
    │   ├── AUDIT.md
    │   ├── CONVENTIONS.md
│   ├── ERROR-HANDLING.md
│   ├── GOALS.md
│   ├── INTEGRATION.md
│   ├── PERFORMANCE.md
│   ├── SECURITY.md
│   ├── SETUP.md
│   └── SPRINT.md
├── nginx/
│   └── nginx.conf
├── public/
│   ├── .well-known/
│   │   └── security.txt
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
└── src/
    ├── app/
    │   ├── (auth)/
    │   │   ├── layout.tsx
    │   │   ├── check-email/page.tsx
    │   │   ├── forgot-password/page.tsx
    │   │   ├── invite/[token]/page.tsx
    │   │   ├── login/page.tsx
    │   │   ├── register/page.tsx
    │   │   ├── reset-password/page.tsx
    │   │   └── verify-email/page.tsx
    │   ├── (dashboard)/
    │   │   ├── layout.tsx
    │   │   ├── loading.tsx
    │   │   ├── error.tsx
    │   │   ├── not-found.tsx
    │   │   ├── dashboard/
    │   │   │   ├── page.tsx
    │   │   │   └── loading.tsx
    │   │   ├── roles/
    │   │   │   ├── page.tsx
    │   │   │   └── loading.tsx
    │   │   ├── settings/
    │   │   │   ├── layout.tsx
    │   │   │   ├── page.tsx
    │   │   │   ├── general/page.tsx
    │   │   │   ├── appearance/page.tsx
    │   │   │   ├── code-graph/page.tsx
    │   │   │   └── audit/
    │   │   └── users/
    │   │       ├── page.tsx
    │   │       ├── loading.tsx
    │   │       └── [id]/page.tsx
│   ├── (public)/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── about/page.tsx
│   │   ├── contact/page.tsx
│   │   ├── privacy/page.tsx
│   │   └── terms/page.tsx
│   ├── api/
│   │   └── health/
│   │       ├── route.ts
│   │       ├── live/route.ts
│   │       ├── metrics/route.ts
│   │       └── ready/route.ts
│   ├── error.tsx
    │   ├── favicon.ico
    │   ├── globals.css
    │   ├── layout.tsx
    │   ├── maintenance/page.tsx
    │   ├── not-found.tsx
    │   ├── robots.ts
    │   └── sitemap.ts
    ├── components/
    │   ├── custom/
    │   │   ├── command-menu.tsx
    │   │   ├── custom-color-picker.tsx
    │   │   ├── empty-state.tsx
    │   │   ├── error-state.tsx
    │   │   ├── theme-color-picker.tsx
    │   │   ├── theme-io.tsx
    │   │   ├── theme-preview.tsx
    │   │   └── theme-toggle.tsx
    │   ├── layout/
    │   │   ├── app-sidebar.tsx
    │   │   ├── app-sidebar-footer.tsx
    │   │   ├── app-sidebar-header.tsx
    │   │   ├── breadcrumb-nav.tsx
    │   │   ├── nav-main.tsx
    │   │   ├── page-shell.tsx
    │   │   ├── public-footer.tsx
    │   │   ├── public-header.tsx
    │   │   ├── settings-nav.tsx
    │   │   ├── site-header.tsx
    │   │   ├── theme-provider.tsx
    │   │   └── user-menu.tsx
    │   └── ui/
    │       ├── alert-dialog.tsx
    │       ├── alert.tsx
    │       ├── badge.tsx
    │       ├── breadcrumb.tsx
    │       ├── button.tsx
    │       ├── card.tsx
    │       ├── chart.tsx
    │       ├── checkbox.tsx
    │       ├── command.tsx
    │       ├── dialog.tsx
    │       ├── form.tsx
    │       ├── input-group.tsx
    │       ├── input.tsx
    │       ├── label.tsx
    │       ├── select.tsx
    │       ├── separator.tsx
    │       ├── sheet.tsx
    │       ├── sidebar.tsx
    │       ├── skeleton.tsx
    │       ├── sonner.tsx
    │       ├── table.tsx
    │       ├── textarea.tsx
    │       └── tooltip.tsx
    ├── config/
    │   ├── appearance.ts
    │   ├── auth-pages.ts
    │   ├── code-graph.ts
    │   ├── dashboard.ts
    │   ├── login-page.ts
    │   ├── public-pages.ts
    │   ├── register-page.ts
    │   ├── roles.ts
    │   └── site.ts
    ├── features/
    │   ├── audit/
    │   │   ├── components/
    │   │   │   ├── audit-filters.tsx
    │   │   │   ├── audit-pagination.tsx
    │   │   │   └── audit-table.tsx
    │   │   ├── lib/
    │   │   │   ├── categories.ts
    │   │   │   ├── integrity.test.ts
    │   │   │   ├── integrity.ts
    │   │   │   ├── log-audit.test.ts
    │   │   │   ├── log-audit.ts
    │   │   │   ├── severity.test.ts
    │   │   │   ├── severity.ts
    │   │   │   ├── store.test.ts
    │   │   │   └── store.ts
    │   │   ├── schema.ts
    │   │   ├── service.ts
    │   │   ├── types.ts
    │   │   └── actions.ts
    │   ├── auth/
    │   │   ├── actions.ts
    │   │   ├── schema.ts
    │   │   ├── service.ts
    │   │   └── components/
    │   │       ├── auth-info-panel.tsx
    │   │       ├── auth-shell.tsx
    │   │       ├── forgot-password-form.tsx
    │   │       ├── login-form.tsx
    │   │       ├── login-icon-map.ts
    │   │       ├── login-footer-links.tsx
    │   │       ├── password-input.tsx
    │   │       ├── password-strength-meter.tsx
    │   │       ├── register-form.tsx
    │   │       └── reset-password-form.tsx
    │   ├── code-graph/
    │   │   ├── types.ts
    │   │   └── components/
    │   │       └── code-graph.tsx
    │   ├── contact/
    │   │   ├── actions.ts
    │   │   ├── schema.ts
    │   │   └── components/contact-form.tsx
    │   ├── dashboard/
    │   │   ├── schema.ts
    │   │   ├── service.ts
    │   │   └── components/
    │   │       ├── activity-table.tsx
    │   │       ├── chart-section.tsx
    │   │       ├── kpi-section.tsx
    │   │       ├── revenue-chart.tsx
    │   │       ├── revenue-chart-client.tsx
    │   │       ├── stat-card.tsx
    │   │       ├── traffic-chart.tsx
    │   │       └── traffic-chart-client.tsx
    │   ├── landing/
    │   │   └── components/
    │   │       ├── cta-section.tsx
    │   │       ├── faq-accordion.tsx
    │   │       ├── feature-grid.tsx
    │   │       ├── hero-section.tsx
    │   │       └── step-list.tsx
    │   ├── legal/
    │   │   └── components/legal-article.tsx
    │   ├── notification/
    │   │   ├── schema.ts
    │   │   ├── service.ts
    │   │   ├── components/
    │   │   │   ├── notification-button.tsx
    │   │   │   ├── notification-item.tsx
    │   │   │   └── notification-list.tsx
    │   │   └── hooks/use-notifications.ts
    │   ├── role/
    │   │   ├── schema.ts
    │   │   ├── service.ts
    │   │   └── components/
    │   │       ├── permission-matrix.tsx
    │   │       ├── permission-toggle.tsx
    │   │       ├── role-card.tsx
    │   │       └── role-list.tsx
    │   ├── roles/
    │   │   ├── actions.ts
    │   │   ├── schema.ts
    │   │   ├── service.ts
    │   │   ├── types.ts
    │   │   └── components/
    │   │       ├── permission-matrix.tsx
    │   │       ├── permission-toggle.tsx
    │   │       ├── role-card.tsx
    │   │       ├── role-list.tsx
    │   │       └── roles-overview.tsx
    │   ├── settings/
    │   │   ├── schema.ts
    │   │   ├── service.ts
    │   │   ├── components/mode-toggle-section.tsx
    │   │   ├── hooks/use-appearance.ts
    │   │   └── lib/apply-settings.ts
    │   └── user/
    │       ├── actions.ts
    │       ├── schema.ts
    │       ├── service.ts
    │       ├── types.ts
    │       └── components/
    │           ├── create-user-button.tsx
    │           ├── data-table-pagination.tsx
    │           ├── data-table-toolbar.tsx
    │           ├── user-form-dialog.tsx
    │           ├── user-row-actions.tsx
    │           └── user-table.tsx
    ├── hooks/
    │   └── use-mobile.ts
    └── lib/
        ├── api.ts
        ├── color.ts
        ├── env.ts
        ├── error.ts
        ├── health.ts
        ├── logger.ts
        ├── logger-client.ts
        ├── parse-breadcrumb.ts
        ├── password-strength.ts
        ├── rbac.ts
        ├── rate-limit.ts
        └── search-params.ts
```

### 3.2 Catatan struktur aktual

- Route group `(public)`, `(auth)`, dan `(dashboard)` tidak menambahkan prefix pada URL.
- `src/app/` adalah routing dan composition; logic domain tetap berada di `src/features/`.
- `src/components/ui/` berisi primitive UI, sedangkan `src/components/custom/` dan `src/components/layout/` berisi komposisi aplikasi.
- `src/config/` menyimpan konfigurasi aplikasi non-secret. Jangan menyimpan credential di sini.
- `src/features/auth/`, `user/`, `roles/`, `dashboard/`, `notification/`, `settings/`, `legal/`, `landing/`, `contact/`, dan `audit/` merepresentasikan domain yang sudah memiliki route atau UI.
- Peta di §3.1 **belum lengkap** dan diperbarui bertahap per domain, bukan hasil enumerasi otomatis. Yang sudah ada di working tree tapi belum terpetakan di blok di atas: `src/features/log-management/`, `src/features/observability/`, `src/features/ueba/`, `src/features/organization/`, `src/app/(dashboard)/settings/logs/`, serta beberapa helper di `src/lib/` (`redact.ts`, `request-context.ts`, `runtime-metrics.ts`, `trace-context.ts`, `totp.ts`). Ketiadaan entry bukan bukti file tidak ada; verifikasi langsung di working tree. Karena beberapa task berjalan paralel, blok ini perlu disinkronkan sekali lagi setelah semuanya selesai.
- `src/features/audit/` adalah fondasi audit log untuk seluruh repo dan **sudah aktif dipakai**, bukan stub. Aturannya: semua penulisan wajib lewat `logAudit()` di `lib/log-audit.ts`; `appendAuditEvent()` di `lib/store.ts` tidak boleh dipanggil dari luar `logAudit()`. Nama `action` dibekukan sebagai kontrak di `lib/categories.ts` (`AUDIT_ACTIONS`), dan `lib/severity.ts` memaksa lantai severity per kategori. Jalur baca lewat `actions.ts` sudah memakai `requireSession()` → `requireRole()` → `enforceRateLimit()`, tetapi `requireSession()` masih placeholder sehingga guard itu belum menjadi security boundary. Store-nya in-memory dengan hash chain dan batas 5000 entry, jadi audit log bukan sumber kebenaran dan bukan durable. Detail kontrak, batas redaksi, dan daftar yang masih mock ada di `docs/AUDIT.md`.
- Helper redaksi yang dipakai audit **bukan** milik fitur audit: `redactTags()`, `redactEvidence()`, `hashIp()`, `maskEmail()`, dan `truncateUserAgent()` semuanya ada di `src/lib/redact.ts` karena dipakai bersama oleh `src/lib/logger.ts`, `src/lib/request-context.ts`, `features/observability/`, `features/ueba/`, dan `features/audit/`. Menaruinya di `features/audit/` akan membuat siklus import dan membuat aturan redaksi bisa berbeda antar sink.
- `src/features/code-graph/` hanya berisi `types.ts` + satu client leaf `components/code-graph.tsx`. Data statisnya dibaca build-time dari `src/features/code-graph/data/graph.json`, yang dihasilkan `scripts/code-graph.sh` (`npm run graph`, alat `madge`) lewat `scripts/code-graph-transform.js`. Tidak ada service, schema, atau action: use case-nya hanya membaca satu file output analisis statis, bukan data user. Halaman `/settings/code-graph` memvalidasi bentuk JSON dengan `zod` dan jatuh ke empty state bila file tidak ada atau tidak valid.
- `src/features/landing/` hanya dipakai oleh landing page `(public)/page.tsx`. Section landing adalah Server Component; FAQ memakai `<details>` native sehingga tidak menambah client boundary.
- `src/features/contact/` memiliki `schema.ts` + `actions.ts` (server action dengan rate limit) + satu client leaf `components/contact-form.tsx`. Tidak ada Route Handler karena use case-nya form submit dari UI.
- Config auth sudah dipisah per domain agar tidak ada dua sumber kebenaran: `config/auth-pages.ts` (branding + footer bersama untuk seluruh route auth), `config/login-page.ts` (form login), `config/register-page.ts` (form register). Service mengekspos `getAuthPageConfig()`; nama lama `getLoginPageConfig()` sudah dihapus.
- Saat ini terdapat folder `role/` dan `roles/` dengan overlap fungsi. Audit dan konsolidasikan sebelum production agar tidak ada dua sumber kebenaran untuk permission/role.
- `src/lib/` berisi helper lintas fitur. Modul yang membutuhkan server-only boundary harus menjaga import client secara eksplisit.
- `src/app/api/health/` adalah satu-satunya Route Handler di repo ini. Berisi probe operasional (§15) dan tidak punya domain feature; logika bersama ada di `src/lib/health.ts`.
- `Dockerfile`, `docker-compose.yml`, `nginx/`, dan `.dockerignore` adalah deployment support; `public/` hanya berisi aset statis.
- `docs/` adalah dokumentasi operasional dan arsitektur, bukan runtime source.

Folder generated seperti `.next/`, `node_modules/`, dan `tsconfig.tsbuildinfo` tidak masuk dalam inventaris source. Jangan commit generated output kecuali memang menjadi bagian dari strategi repository yang disepakati.

### 3.3 Tanggung jawab folder

| Area | Boleh | Tidak boleh |
| --- | --- | --- |
| `app/` | Routing, layout, metadata, Server Action entry, Route Handler, special files | Menulis query kompleks langsung di komponen atau membocorkan logic domain ke komponen |
| `components/ui/` | Primitive UI yang dapat digunakan ulang | Business logic, akses data langsung, atau menyimpan secret |
| `components/custom/` | Komposisi, variasi visual, adapter client-only | Akses database atau secret secara langsung |
| `components/layout/` | Shell, sidebar, topbar, navigasi, dan state presentasional lintas halaman | Mengambil semua data dashboard secara prematur tanpa alasan |
| `config/` | Konstanta site, navigasi, appearance, dan copy UI non-secret | Credential, token, atau data environment sensitif |
| `features/<fitur>/` | Use case, schema, service, DTO, komponen, dan action domain | Ketergantungan siklik antar fitur atau query dari komponen presentasional |
| `lib/` | Helper lintas fitur, error contract, env validation, logger, RBAC, dan utilitas murni |Secret, query database, atau modul server-only yang diimpor client |

`src/lib/logger.ts` (pino + `redactTags()`) melakukan `import "server-only"`, jadi ia hanya boleh masuk ke server. Modul yang butuh diagnostik di browser — misalnya service `localStorage` pada `features/settings` dan `features/notification`, yang diimpor oleh client component — memakai `src/lib/logger-client.ts` sebagai gantinya. `logger-client` sengaja tidak mencetak `context` apa pun, sehingga tidak ada jalur PII ke console browser; ia juga bukan pengganti audit log, hanya diagnostik.
| `hooks/` | Reusable client behavior | Akses database, secret, atau server-only module |

### 3.4 Aturan dependensi

Arah dependensi yang disarankan:

```text
route/component
  → feature service
    → repository/query adapter
      → database/API
```

Komponen hanya bergantung pada service publik fitur. Service boleh bergantung pada `lib/db`, `lib/auth`, `lib/security`, dan utilitas. Modul dalam `lib/` tidak boleh bergantung pada `app/` atau komponen fitur untuk menghindari siklus.

Gunakan alias yang sudah tersedia:

```ts
import { service } from "@/features/users/service";
```

Gunakan barrel export hanya bila tetap menjaga module graph dan bundle tetap kecil. Jangan mengekspor secret atau server-only API melalui modul umum.

## 4. Lifecycle Request

### 4.1 Props route dinamis pada Next.js 16

Pada `page.tsx` dan `layout.tsx`, prop `params` dan, bila digunakan, `searchParams` adalah **Promise** dan harus diakses dengan `await` atau React `use`. Access sinkron gaya lama tidak boleh menjadi pola baru. `searchParams` adalah plain object, bukan instance `URLSearchParams`, dan nilainya tetap perlu divalidasi sebagai input untrusted.

```tsx
export default async function UserPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ userId }, query] = await Promise.all([params, searchParams]);
  const result = await getUserView({ userId, query });
  return <UserSummary user={result} />;
}
```

`params` dan `searchParams` pada Client Component page dapat dibaca dengan React `use`, tetapi default tetap Server Component dan validasi tetap terjadi di server. Jangan mencoba mengubahnya menjadi object sinkron di service; await di route boundary, lalu teruskan DTO tervalidasi ke use case.

### 4.2 Direct visit ke halaman

```text
Browser
  → proxy.ts (jika ada; guard/rewrite awal)
  → route matching pada App Router
  → root layout
  → nested layout
  → page / Server Components
  → validasi request input
  → session dan authorization
  → service layer
  → database atau API internal
  → DTO aman
  → render HTML + RSC Payload
  → browser menampilkan HTML
  → browser menerima JavaScript Client Component
  → hydration membuat UI interaktif
```

Pada initial load:

1. Server Component dieksekusi hanya di server.
2. Client Component juga dapat dieksekusi di server untuk menghasilkan HTML, tetapi kodenya tetap dikirim dan dijalankan di browser saat hydration.
3. React membuat HTML dan **React Server Component Payload (RSC Payload)**.
4. HTML memberikan tampilan awal dengan cepat.
5. RSC Payload merekonsiliasi pohon server/client dan memuat props Client Component.
6. JavaScript Client Component di-hidrate untuk memasang event handler.

Karena RSC Payload dapat melakukan streaming, shell cepat dapat dikirim sebelum data pada suatu bagian selesai. Jika respons sudah mulai streaming, HTTP status tidak dapat lagi diubah. Untuk keputusan yang membutuhkan status 404/redirect yang presisi, lakukan sebelum boundary Suspense pertama.

### 4.3 Client-side navigation

```text
Link/Link click
  → client router memilih segment target
  → loading boundary/prerendered feedback ditampilkan bila ada
  → server mematch route dan merender segment yang berubah
  → service mengambil data
  → server mengirim Flight/RSC response
  → client router mengganti segment
  → layout yang tidak berubah dipertahankan
```

Navigasi berikutnya tidak memerlukan HTML server penuh untuk Client Component. Server mengirim RSC Payload; Client Component dirender dari payload dan reference modul client. Karena itu serialisasi props harus eksplisit dan kecil.

### 4.4 Mutation melalui Server Action

```text
User submit form
  → POST Server Action
  → frameworkOrigin/CSRF baseline
  → auth + authorization di dalam action/service
  → validasi FormData dengan schema
  → service menjalankan transaksi
  → invalidasi cache atau refresh
  → return DTO/status yang aman
  → RSC Payload terbaru dikirim dalam respons yang sama bila revalidation terjadi
  → React meng-update UI
```

Server Action bukan callback privat browser. Ekspor dengan `"use server"` tetap dapat dipanggil dengan POST oleh pihak yang mengetahui reference; pemanggilan dari UI tidak membuktikan caller. Validasi, auth, authz, dan rate limit wajib berada di boundary server.

Server Actions diproses secara sequential oleh dispatcher client. Jangan mengandalkan `Promise.all` pada beberapa action client. Jika pekerjaan independen, jalankan paralel di dalam satu action server atau pada render server.

Setelah mutasi:

- `updateTag` digunakan di Server Action bila operasi membutuhkan **read-your-own-writes**; pembacaan berikutnya menunggu data fresh.
- `revalidatePath` digunakan bila perubahan invalidate route tertentu.
- `revalidateTag(tag, profile)` menggunakan profile cache-life untuk stale-while-revalidate. Bentuk satu argumen deprecated; gunakan dua argumen, misalnya `revalidateTag("users", "max")`, atau `{ expire: 0 }` bila expiry perlu blocking.
- `refresh` untuk mengambil ulang RSC Payload ketika sumber state berubah tetapi cache data tidak di-invalidate.
- Perubahan cookie dapat memicu render ulang route.

Lakukan revalidasi sebelum `redirect` karena `redirect` merupakan control flow yang menghentikan eksekusi setelah dipanggil.

### 4.5 Route Handler

Route Handler pada `route.ts` dipilih ketika aplikasi membutuhkan endpoint HTTP eksplisit, webhook pihak ketiga, streaming khusus, atau kontrak integrasi yang bukan UI form.

Lifecycle:

```text
HTTP request
  → route.ts
  → validasi method, content type, signature, dan payload
  → auth/authz bila endpoint privat
  → schema parsing
  → service layer
  → serialisasi response minimal
```

Route Handler adalah **public endpoint** jika dapat diakses dari jaringan. Jangan bergantung pada halaman pemanggil. Jangan mengembalikan error internal, stack trace, token, atau record database mentah. Tambahkan timeout, rate limit, dan pembatasan ukuran payload untuk operasi yang mahal atau sensitif.

### 4.6 Proxy

Starting with Next.js 16, `middleware.ts` disebut **Proxy** dengan konvensi `proxy.ts`; ini perubahan terminologi, bukan security boundary baru. Hanya satu `proxy.ts` yang didukung. File harus berada di project root atau di `src` sehingga sejajar dengan folder `app/`. Karena project ini memakai `src/app/`, lokasi targetnya adalah `src/proxy.ts`, bukan `src/app/proxy.ts`.

`proxy.ts` cocok untuk guard awal, redirect berdasarkan keberadaan cookie, rewrite hostname/path, header manipulation, dan lightweight checks. Operasinya harus cepat dan tidak melakukan query database penuh.

Proxy bukan pengganti security boundary:

- Cache options `fetch` (`cache`, `next.revalidate`, atau `next.tags`) tidak berefek di dalam Proxy.
- Session harus diverifikasi secara cryptographic pada server.
- Role/permission dan ownership harus diperiksa lagi di service/action/handler.
- Route publik dan privat didaftar eksplisit dengan **default deny** untuk area privat.
- Jangan menganggap cookie yang ada sebagai bukti login.

## 5. RSC vs Client Components

### 5.1 Default: Server Component

Gunakan Server Component untuk:

- fetching data awal langsung dari database/API internal;
- akses secret server tanpa mengirimkannya ke browser;
- render layout, tabel, form, dan konten yang tidak membutuhkan state browser;
- metadata, `generateMetadata`, dan komposisi route;
- server-only business flow;
- pengurangan JavaScript dan streaming awal.

Server Component memiliki batasan penting:

- tidak dapat menggunakan `useState`, `useEffect`, event handler, `window`, `document`, `localStorage`, atau `navigator`;
- context React Client Component tidak dapat dibaca langsung;
- semua async request, service, database, dan environment server harus tetap `"server-only"`.

### 5.2 Kapan menggunakan Client Component

Gunakan Client Component hanya jika subtree membutuhkan:

- `useState`, `useEffect`, `useReducer`, atau custom hook client;
- `onClick`, `onChange`, controlled input, dan lifecycle browser;
- `window`, `document`, `localStorage`, media, canvas, geolocation, atau browser API;
- optimistic UI dan pending state yang mengendalikan browser;
- chart, editor, map, drag-and-drop, carousel, dan library client-only;
- provider pihak ketiga yang hanya berjalan di client.

`"use client"` adalah **module-graph boundary**, bukan penanda satu komponen. Semua import dan komponen yang langsung dirender oleh Client Component masuk ke client module graph. Karena itu letakkan directive pada wrapper/leaf interaktif, misalnya satu search input, bukan pada seluruh dashboard layout.

### 5.3 Bentuk interaksi server tanpa client

Tidak semua interaksi memerlukan Client Component:

- `<form action={serverAction}>` dapat memakai Server Function dari server.
- `<details>`, `<dialog>` yang dikelola browser, `<video controls>`, dan link native dapat tetap Server Component.
- Context global dibuat melalui Client Component Provider, tetapi provider ditempatkan sedalam mungkin agar static server subtree tetap optimal.

### 5.4 Props yang melewati boundary

Code melewati boundary melalui imports; data melewati melalui props. Props harus serializable.

Pola yang baik:

```tsx
type UserSummary = {
  id: string;
  name: string;
};

<FollowButton targetUserId={user.id} initialFollowing={isFollowing} />
```

Hindari:

```tsx
<UserPanel user={databaseUser} />
```

yang mengirim seluruh record, timestamp internal, email, hash, role detail, atau field yang tidak dipakai. Buat DTO di service dan lakukan projection/mapping sebelum boundary.

Server-rendered Server Component dapat dilewatkan sebagai `children` atau slot React element ke Client Component. Output-nya crossing boundary, bukan kode server-nya. Pola ini berguna untuk Client `Modal`, `Tabs`, atau `Popover` yang membungkus konten server.

### 5.5 Pola Client Component yang baik

- Satu wrapper kecil mengisolasi library client-only.
- Form client hanya menangani input, pending, error message, dan optimistic presentation.
- Action server melakukan validasi canonical, auth, authz, dan persistence.
- Hook client tidak melakukan request mutasi secara langsung bila Server Action cukup.
- Client cache hanya untuk polling/offline/interaksi real-time yang benar-benar membutuhkan; jangan menjadikan client fetching default.

## 6. Service Layer

### 6.1 Definisi

Service layer adalah DAL internal aplikasi. Service layer:

- hanya berjalan di server;
- menjadi satu-satunya pintu masuk operasi data dari route, action, dan komponen server;
- melakukan authentication dan authorization;
- memvalidasi invariant domain;
- mengakses database/API melalui adapter;
- mengembalikan DTO minimal;
- mengelola transaksi dan error domain.

Tambahkan `import "server-only"` pada service, auth helper, database adapter, dan modul yang menyimpan server secret. Ini membuat accidental import dari Client Component gagal pada build/runtime boundary.

### 6.2 Kontrak service yang disarankan

```ts
type UserSummary = {
  id: string;
  name: string;
};

type ListUsersInput = {
  cursor?: string;
  limit: number;
};

export async function listUsers(
  actor: Actor,
  input: ListUsersInput,
): Promise<{ items: UserSummary[]; nextCursor?: string }> {
  assertPermission(actor, "users:read");
  const result = await db.user.findMany(/* parameterized query */);
  return mapToUserSummaries(result);
}
```

Hal yang perlu dijaga:

1. Caller menyediakan actor/session yang sudah diverifikasi atau helper service memperolehnya langsung dari request context.
2. Service tidak bergantung pada React component.
3. Input sudah tervalidasi pada boundary; service juga dapat defensively validate invariant penting.
4. Query selalu parameterized.
5. Transaction dipakai jika beberapa write harus atomic.
6. Service tidak mengembalikan entity ORM mentah.
7. Error domain dipetakan oleh boundary; detail internal tetap di server logger.

### 6.3 Lapisan internal

Untuk fitur yang kompleks, pisahkan secara logis:

```text
route orchestration
  → application service (use case)
    → domain policy
    → repository / external API adapter
      → database / service eksternal
```

- **Route/action:** concern transport, entry auth, parsing, dan pemetaan response.
- **Application service:** workflow use case dan authorization policy yang dipakai bersama.
- **Domain:** invariant/policy murni, tidak mengetahui HTTP atau database.
- **Repository/adapter:** translasi query dan mapping antara model eksternal dan domain.

Hindari `utils.ts` yang berubah menjadi tempat seluruh business logic. Buatkan service atau module domain bernama jelas.

### 6.4 Reads dan writes

Reads:

- Validate `params`, `searchParams`, cookie-derived identity, dan query filters.
- Fetch parallel dengan `Promise.all` hanya jika tidak ada dependensi data.
- Project/paginate di server untuk mencegah payload besar.
- Cache berdasarkan staleness tolerance, tetapi auth-scoped data tidak boleh bocor antar-user.

Writes:

- Validasi ID dan perubahan, bukan menerima seluruh entity dari client.
- Ambil ownership dan invariant current state dari sumber tepercaya.
- Verifikasi permission pada operasi spesifik.
- Gunakan transaction bila multi-write.
- Revalidate setelah commit.
- Return `{ ok, fieldErrors, message }` atau DTO minimal, bukan error internal.
- Rate-limit operasi mahal seperti login, email, upload, report, atau delete massal.

## 7. Data Flow

### 7.1 Read dari database

```text
Client navigation / direct request
  → route Server Component
  → parse dan validate params
  → session
  → call feature service
      → permission dan ownership check
      → parameterized query
      → mapping ke DTO
  → render server component tree
  → stream HTML/RSC
  → hydrate client leaves
```

Auth harus berada dekat operasi, bukan hanya di root layout. Layout guard melindungi navigasi; child service tetap mencegah data bocor.

### 7.2 Data dari Client Component

Client Component tidak perlu mengambil data awal yang sudah dirender di server. Pre-render data di page lalu kirim props serializable. Fetch browser hanya jika data benar-benar bergantung pada client state, user interaction, polling, realtime, atau optimisme.

### 7.3 Mutation

```text
Client form
  → Server Action POST
  → framework checks
  → authenticate
  → validate input
  → authorize actor + resource
  → service transaction
  → commit
  → revalidate/refresh/redirect
  → return safe state
  → single-round-trip RSC update
```

Untuk operasi yang perlu konfirmasi ulang atau elevated session, delete massal, perubahan role, dan transfer ownership, gunakan kontrol yang lebih kuat.

### 7.4 External API dan SSRF

Pisahkan outbound integration ke adapter khusus. URL dari user tidak boleh dipakai langsung sebagai `fetch` target.

- allowlist scheme dan hostname;
- tolak localhost, loopback, link-local, private network, dan metadata endpoint setelah DNS resolution jika environment mengizinkan request user-defined;
- set timeout, redirect policy, request/response size limit;
- jangan teruskan session cookie atau authorization ke origin lain;
- validasi response schema;
- gunakan circuit breaker/retry hanya untuk error transient dan idempotent;
- catat metadata tanpa secret.

### 7.5 DTO, serialisasi, dan logging

DTO adalah bentuk data untuk output tertentu, bukan entity database. Tetapkan mapping field secara eksplisit. Ubah format tanggal menjadi ISO string, decimal menjadi representasi yang disepakati, dan ambil hanya field yang dibutuhkan UI.

Logger server minimum:

```text
timestamp
requestId
actorId bila sudah tervalidasi
action/useCase
resourceType
resourceId bila aman
result
latency
```

Jangan log password, token, session ID, cookie, authorization header, full FormData, atau payload sensitif. Laporan client menggunakan `digest` untuk menghubungkan error server dengan fallback UI tanpa mengirim detail internal.

## 8. Rendering, Loading, dan Streaming

Next.js dapat menghasilkan HTML pada build time, setelah build melalui ISR, atau pada setiap request melalui SSR. RSC Payload adalah konsep terpisah dari HTML: RSC menjelaskan component tree; Client Component dapat dieksekusi di server untuk HTML dan kembali di browser untuk interaksi.

Gunakan strategi berikut:

| Kebutuhan | Strategi |
| --- | --- |
| Konten publik stabil | Static generation jika aman |
| Data publik yang boleh basi | ISR/time-based atau tag revalidation |
| Data personal/session-specific | Dynamic server rendering |
| Streaming bagian lambat | Suspense pada boundary sempit |
| Interaksi browser | Client leaf sekecil mungkin |
| Mutasi | Server Action, bukan side effect saat render |

Jangan melakukan cache dengan asumsi saja. Tentukan classification data lebih dulu:

- **Public:** boleh dibagikan dan sering di-cache.
- **User-scoped:** hanya untuk actor/session yang benar dan tidak boleh shared-cache tanpa key yang benar.
- **Highly sensitive/real-time:** no-store atau TTL sangat pendek.
- **Derived aggregate:** cache hanya jika invalidation key dapat dipercaya.

### 8.1 Loading boundaries

`loading.tsx` otomatis membuat Suspense fallback untuk `page` dan nested children dalam segment; layout pada segment yang sama tidak dibungkus oleh fallback tersebut. Jika layout melakukan uncached/runtime data access, fallback `loading.tsx` mungkin belum tampil. Solusinya:

- pindahkan data yang lambat ke page atau child segment;
- bungkus runtime access layout dalam Suspense eksplisit;
- gunakan skeleton ringan yang mempertahankan dimensi layout;
- berikan `aria-live`/semantik yang sesuai untuk status loading;
- jangan membuat fallback berat yang memanggil boundary server lambat.

Gunakan Suspense manual untuk bagian independen agar data A yang lambat tidak memblokir data B. Hindari terlalu banyak boundary kecil jika fragmentasi dan status loading membingungkan.

### 8.2 Error boundaries

`error.tsx` adalah Client Component karena memerlukan retry/event lifecycle. Ia menangkap error render pada child segment, tetapi tidak menangkap error pada layout/template segment yang sama di atasnya. Root layout failure ditangani `global-error.tsx` yang harus menyediakan `<html>` dan `<body>` sendiri.

Pilih boundary berdasarkan blast radius:

- `error.tsx` per feature untuk kegagalan sebagian yang tidak perlu mengulang seluruh dashboard;
- root `global-error.tsx` hanya untuk kegagalan root document;
- `catchError` Next.js untuk component-level recovery pada Next.js 16;
- manual `try/catch` untuk event handler karena Event error tidak ditangkap error boundary.

Untuk expected errors, model sebagai nilai/return status, bukan throw. Contohnya validasi form mengembalikan `fieldErrors`, conflict mengembalikan domain result, atau response external tidak OK menghasilkan safe message. `throw` digunakan untuk uncaught exception/bug yang memang harus masuk error boundary.

`error.tsx` harus:

- menampilkan pesan generik dan aksi retry yang aman;
- mencatat error ke reporting service;
- menggunakan `error.digest` untuk korelasi server log;
- tidak menampilkan stack trace, query, atau `error.message` server di production;
- tidak melakukan mutasi otomatis saat retry tanpa kebutuhan.

## 9. Cache dan Revalidation

### 9.1 Model yang aktif

Template saat ini tidak mengaktifkan `cacheComponents` di `next.config.ts`; dengan demikian gunakan model caching Next.js sebelumnya secara eksplisit, jangan mengasumsikan semua `fetch` cached.

Pada model ini:

- `fetch` tanpa cache option **tidak cached secara default**;
- request identik dalam satu server render dapat dimemoisasi oleh Next.js;
- ORM/direct database tidak otomatis mendapat request memoization React;
- `unstable_cache` dapat membungkus non-`fetch` function dengan key parts, tags, dan TTL;
- `revalidatePath`, `revalidateTag(tag, profile)`, atau policies Next.js 16 yang sesuai dapat dipakai setelah mutation; `updateTag` hanya tersedia dalam Server Action;
- React `cache` dari React hanya untuk deduplication dalam server render, bukan shared persistent cache lintas request/user.

Jika tim mengaktifkan `cacheComponents`, model ini berubah secara fundamental. Baca ulang dokumentasi Next.js 16 pada saat perubahan, audit route dan cache boundary, lalu dokumentasikan model baru; jangan mencampur opsi tanpa keputusan eksplisit.

### 9.2 Cache key dan keamanan

Cache key harus memasukkan seluruh dimensi yang memengaruhi hasil, misalnya:

- resource ID;
- tenant/workspace ID;
- language/locale;
- filter/sort/page;
- role jika hasil benar-benar berbeda berdasarkan role.

Jangan pernah memakai session token mentah sebagai cache key yang terekspos. Jangan memakai cache bersama untuk data user-scoped jika actor identity tidak menjadi bagian eksplisit dari key atau partitioning.

Jangan cache:

- secret, token, password, raw session;
- output yang berbeda menurut ownership/permission tanpa key yang benar;
- hasil validasi/security yang berubah pada setiap request;
- response error sensitive.

### 9.3 TTL dan invalidation

Gunakan TTL pendek untuk data yang cepat berubah dan TTL panjang hanya jika eventual consistency dapat diterima. Tag invalidation lebih baik daripada hard-coded path bila data dipakai lintas banyak halaman.

Contoh kebijakan:

```text
catalog publik         → cache + tag katalog + revalidate setelah update
dashboard per-user     → no-store atau partition aman + no cross-user reuse
role/permission        → no-store, verifikasi server tiap operasi sensitif
report mahal           → cache longer-lived + Generate/refresh on demand
```

Setelah commit mutation, pilih operasi cache berdasarkan kebutuhan consistency:

- **Immediate/read-your-own-writes:** `updateTag` bila menggunakan cache model yang mendukungnya, atau `revalidatePath` untuk route yang tepat.
- **Stale-while-revalidate:** `revalidateTag(tag, profile)`; response boleh masih stale. Gunakan `{ expire: 0 }` bila request berikutnya harus memblokir sampai data fresh.
- **Route state berubah tanpa cache data:** `refresh`.
- **Navigasi ke tujuan:** `redirect` setelah revalidasi bila destination butuh data fresh.

Untuk data non-`fetch`, bila memakai `unstable_cache`, gunakan key parts dan tags yang stabil serta sempit. Jangan memasukkan object besar atau data sensitif ke key. Perubahan schema cache harus dapat ditangani dengan versioned key agar data lama tidak salah dibaca.

### 9.4 Deduplikasi

`fetch` identik di server render dapat di-memoize. Untuk database/ORM, bungkus reader dengan React `cache` bila request yang sama memang dipanggil berulang dalam satu render pass. Ini bukan cache lintas-request dan tidak boleh digunakan untuk mengabaikan permission yang berbeda antar-request.

Jika data independen, mulai fetch secara paralel:

```text
start statsPromise
start activityPromise
start accountPromise
await Promise.all([statsPromise, activityPromise, accountPromise])
```

Jangan membuat waterfall `await A; await B` jika B tidak bergantung pada A. Gunakan preloading hanya jika request dapat dimulai lebih awal tanpa masalah security/context.

## 10. Security Boundaries

### 10.1 Trust zones

```text
UNTRUSTED
  browser, form, URL, cookies, headers, searchParams, params, webhook body,
  external API response
        │ validate + authenticate
        ▼
BOUNDARY SERVER
  proxy → layout guard → action/handler/service
        │ authorize resource + operation
        ▼
CONTROLLED SERVER
  server-only services, DAL, database, secret, logger
        │ DTO/projection
        ▼
CLIENT
  HTML, RSC Payload, public env, minimal serializable props
```

Semua data crossing dari zona untrusted harus dianggap dapat dimodifikasi. Jangan menyimpan authorization decision hanya di URL, hidden input, local state, atau UI visibility.

### 10.2 Authentication dan authorization

Gunakan library auth teruji, bukan implementasi session sendiri tanpa threat model. Session cookie idealnya `HttpOnly`, `Secure` di production, dan `SameSite` eksplisit.

Terapkan dua kategori pemeriksaan:

- **Authentication:** apakah session valid dan berasal dari identitas tepercaya?
- **Authorization:** apakah actor boleh melakukan operasi tersebut pada resource tersebut?

Untuk setiap read/write sensitif:

1. Verifikasi session server-side.
2. Muat actor dan permission dari sumber tepercaya.
3. Cek permission operation-level.
4. Cek ownership/tenant scope resource.
5. Terapkan default deny.
6. Return `401`/redirect untuk unauthenticated dan `403` untuk forbidden pada API; jangan bocorkan keberadaan resource yang tidak berhak dilihat user.

Role, tenantId, ownerId, price, status, atau data authorization yang dikirim client tidak boleh dipercaya. Ambil owner/tenant dari session server jika memungkinkan. ID yang dikirim client hanya locator untuk lookup, bukan bukti hak akses.

### 10.3 Input validation

Validasi semua boundary:

- `params` dan `searchParams`;
- body Route Handler;
- `FormData` Server Action;
- header, query, dan cookie yang dipakai;
- webhook signature dan timestamp;
- response API/db adapter.

Schema harus membatasi type, required field, enum, panjang, format, range, dan business invariant. Validasi client hanya untuk UX; canonical validation tetap server. Gunakan parameterized query/ORM, bukan string interpolation untuk input.

### 10.4 Output, XSS, dan content security

React meng-escape teks secara normal, tetapi raw HTML tetap berbahaya. Jangan memakai `dangerouslySetInnerHTML` tanpa sanitiser tepercaya dan review eksplisit. URL schemes untuk link harus masuk allowlist untuk mencegah `javascript:` atau open redirect. Jika aplikasi memerlukan CSP ketat, gunakan nonce yang valid dan sesuaikan connect/font/image origins; policy harus diuji terhadap fonts, Next.js, dan integrasi pihak ketiga.

`next.config.ts` saat ini mengaktifkan:

- `X-DNS-Prefetch-Control: on`;
- `X-Frame-Options: DENY`;
- `X-Content-Type-Options: nosniff`;
- `Referrer-Policy: strict-origin-when-cross-origin`;
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`;
- `X-Permitted-Cross-Domain-Policies: none`, `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin`, `Strict-Transport-Security`;
- `Content-Security-Policy` statis, dengan `'unsafe-inline'` untuk script/style (nonce akan mematikan static generation di App Router) dan `'unsafe-eval'` hanya di development.

Header adalah defense tambahan, bukan pengganti escaping, auth, atau validasi. CSP yang aktif sengaja longgar pada script/style; pola nonce di `proxy.ts` adalah upgrade berikutnya setelah kebutuhan production diketahui, dan harus diuji terhadap fonts, Next.js, dan integrasi pihak ketiga.

### 10.5 Server-only boundary

Tambahkan `import "server-only"` ke:

- `features/*/service.ts` yang menyentuh database/secret;
- database adapter;
- auth/session helper;
- server environment parser;
- privileged authorization helper yang bukan pure policy.

Hanya environment variables berprefix `NEXT_PUBLIC_` yang dikirim browser dan semuanya harus dianggap publik. Jangan mengakses `process.env` dari komponen atau modul client. Validasi environment server sekali di startup/request boundary dan gagal cepat dengan pesan yang tidak membocorkan nilai secret.

### 10.6 Server Actions dan CSRF

Next.js memberi baseline Origin-vs-Host, POST dispatch, encrypted action IDs, dead-code elimination, dan body-size limit. Tetap gunakan:

- auth dan authz internal action;
- schema validasi;
- ownership check;
- return value DTO;
- rate limiting;
- `SameSite` cookie;
- `serverActions.allowedOrigins` hanya dengan allowlist origin production yang benar.

Di self-host multi-instance, gunakan `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` yang stabil dan aman jika dokumentasi deployment diwajibkan. Jangan mengandalkan ID terenkripsi untuk otorisasi.

### 10.7 Logging dan privacy

Log event auth success/failure, perubahan role, export/download, dan akses data sensitif. Gunakan request ID, actor ID, resource ID, timestamp, dan hasil. Redact password, token, cookie, authorization, full payload, dan PII yang tidak diperlukan. Jangan log raw exception response dari database jika dapat mengandung query/value; simpan correlation ID dan detail terklasifikasi di secure log sink.

Implementasi requirements tersebut di repo ini sudah ada di `src/features/audit/`: satu pintu tulis `logAudit()` yang tidak pernah melempar exception, redaksi `metadata` melalui `redactTags()` yang sama dengan metrik, dan hash chain SHA-256 per entry dengan verifikasi `verifyChain()`. Yang **belum** ada adalah durability, guard authz saat baca, dan alerting. Baca `docs/AUDIT.md` sebelum menambah call site atau mengandalkan audit log sebagai bukti.

## 11. Route dan Feature Organization

Contoh feature `users` yang baik:

```text
src/features/users/
├── components/
│   ├── user-table.tsx
│   └── user-filters.tsx
├── schemas.ts
├── service.ts
├── service.test.ts
└── types.ts

src/app/(dashboard)/users/
├── page.tsx
├── loading.tsx
├── error.tsx
├── [userId]/
│   ├── page.tsx
│   └── not-found.tsx
└── actions.ts
```

Aturan:

- route handler mengoordinasikan concerns HTTP/UI;
- `service.ts` memiliki use case, authz, dan query;
- komponen user table tidak querying database;
- `loading.tsx` hanya untuk segment route, bukan untuk setiap request;
- `error.tsx` client karena retry, tetapi logging detail dilakukan server-safe;
- route `[userId]` selalu melakukan validasi dan ownership check.

Route groups `(public)`, `(auth)`, dan `(dashboard)` membantu organisasi tanpa mengubah URL. Jangan menyamakan route-group dengan security boundary; security tetap berasal dari server checks.

## 12. Testing dan Observability

### 12.1 Test pyramid

- **Unit test:** schema, domain policy, mapper DTO, helper pure.
- **Service test:** query/adapter dengan test database atau fake yang meniru perilaku; test unauthorized, forbidden, not found, conflict, invalid input, dan duplicate mutation.
- **Route/action integration test:** render dengan request/session context; pastikan server action melakukan authz sendiri dan error fallback aman.
- **Browser/E2E test:** alur login, CRUD, upload/export yang berisiko, keyboard/focus, dan loading/error state.
- **Security test:** IDOR, role escalation, malformed payload, open redirect, SSRF, XSS, cookie flags.

Mock data harus memaksa DTO hanya memiliki field public yang diharapkan. Jangan menggunakan object database penuh pada Client Component test fixture jika test tidak membatasi response boundary.

### 12.2 Observability minimum

- request ID dari edge/proxy ke server logger;
- latency, status, route template, dan error class;
- dependency/database latency;
- render/cache hit/miss jika tersedia;
- auth dan sensitive action audit;
- client error digest dan unhandled rejection tanpa secret.

Log harus aman dari privacy dan dapat dicari berdasarkan request ID. Error monitoring production diberi environment label agar tidak mencampur development error.

Yang sudah ada di template: `src/lib/logger.ts` (pino + `redactTags()`), event store in-memory di `src/features/observability/`, audit trail berantai hash di `src/features/audit/` (lihat `docs/AUDIT.md`), dan tiga probe pada `src/app/api/health/` (§15). Yang belum ada: exporter ke sink eksternal, counter request HTTP, durasi render, dan cache hit/miss. Seluruh angka metrik **dan seluruh histori audit** saat ini hilang setiap restart, jadi jangan menjadikannya sumber alerting produksi sebelum store digantikan.

## 13. Checklist Arsitektur Fitur Baru

### Struktur dan boundary

- [ ] Route berada pada struktur segment yang benar.
- [ ] Folder feature hanya berisi concern yang relevan.
- [ ] Service layer menjadi satu-satunya pintu database/API internal.
- [ ] Server-only module ditandai dan tidak masuk client bundle.
- [ ] Client boundary berada pada subtree terkecil yang membutuhkannya.

### Read flow

- [ ] Params, search params, dan filter divalidasi.
- [ ] Session diverifikasi pada server.
- [ ] Permission dan ownership diperiksa pada resource.
- [ ] Query parameterized dan tidak melakukan N+1 tanpa alasan.
- [ ] Hanya DTO serializable dan minimal yang dikirim client.
- [ ] Data independen diambil paralel; data lambat memiliki boundary yang sesuai.

### Mutation flow

- [ ] Action/handler merupakan entry point publik yang diasumsikan reachable.
- [ ] Input canonical divalidasi server.
- [ ] Auth dan authz diulang, bukan mengandalkan page/layout.
- [ ] Mutasi atomic bila dibutuhkan.
- [ ] Rate limit dan error handling sesuai risiko.
- [ ] Cache/path/tag/refresh dipilih sesuai consistency requirement.
- [ ] Tidak ada side effect saat render.

### Reliability dan security

- [ ] Expected error dan uncaught exception dibedakan.
- [ ] Loading fallback ringan dan tidak membocorkan data.
- [ ] Error UI generik, retry aman, dan digest dapat dikorelasikan.
- [ ] No secret/PII/stack trace di props, response, atau log.
- [ ] SSRF, open redirect, raw HTML, dan dangerous URL telah ditinjau.
- [ ] Security header, CSP, cookie, dan deployment config sesuai environment.
- [ ] Lint, type/build, test, dan observability diperiksa sebelum merge.

## 14. Konvensi Implementasi di Project Ini

Bagian ini menerjemahkan prinsip di atas menjadi aturan yang sudah terbukti dipakai di working tree. Ikuti sebelum menulis atau me-review kode baru.

### 14.1 Stack UI: Base UI, bukan Radix `asChild`

Primitive di `src/components/ui/` dibungkus dari `@base-ui/react`. Karena itu tombol yang berisi link memakai prop `render`, bukan `asChild`:

```tsx
import { Button } from "@/components/ui/button";

<Button size="sm" render={<Link href="/login" />}>
  Masuk
</Button>
```

Jangan menulis `<Button asChild><Link …></Button>`; pola itu milik Radix dan tidak bekerja di sini. Bandingkan `src/components/layout/public-header.tsx` sebagai referensi.

### 14.2 Form: spacing dan tinggi input

`FormItem` di `src/components/ui/form.tsx:60` **tidak memiliki class default**. Akibatnya setiap pemanggil wajib memberi spacing sendiri, dan tanpa itu label, input, dan pesan error akan menempel:

```tsx
<FormItem className="space-y-2">
  <FormLabel>…</FormLabel>
  <FormControl>
    <Input className="h-10" … />
  </FormControl>
  <FormMessage />
</FormItem>
```

Aturan turunan yang sudah diseragamkan:

- jarak antar field di level form: `space-y-5`;
- jarak label → input → pesan di dalam satu field: `space-y-2`;
- tinggi input form auth/kontak: `h-10` agar sama dengan tinggi tombol submit (`Input` default `h-8`, lihat `src/components/ui/input.tsx:11`).

Pola ini sudah diterapkan di `login-form.tsx`, `register-form.tsx`, `forgot-password-form.tsx`, `reset-password-form.tsx`, dan `contact-form.tsx`. Ikuti, jangan improvisasi ukuran per form.

### 14.3 Error handling di form client

Semua form client mengikuti satu pola yang berasal dari `login-form.tsx`:

```tsx
const error = actionError && !actionError.success ? actionError.error : null;
const hasFieldErrors = Object.keys(error?.fieldErrors ?? {}).length > 0;
const showGeneralError = error !== null && !hasFieldErrors;
```

- Jangan memakai `!actionError.error.fieldErrors` untuk mendeteksi "tidak ada field error": objek `{}` bersifat truthy sehingga alert umum justru tidak pernah tampil.
- Iterasi `Object.entries(errors)` harus memakai `messages?.[0]`.
- Every submit dibungkus `try/catch` dan melakukan `console.error("[<nama-form>] submit failed", error)`, karena error event handler tidak ditangkap error boundary (lihat §8.2).
- Kirim error per-field dengan tipe yang sudah narrowed oleh type guard (`isLoginField`, `FIELDS.includes`), bukan `as keyof Values` tanpa narrowing.

### 14.4 Schema: assertion bukan cara menutup tipe

Dilarang memakai assertion seperti `false as true` untuk membuat compiler lulus. Wenn sebuah field bertipe literal (`z.literal(true)`), ubah schema-nya agar tipe widenable:

```ts
acceptTerms: z.boolean().refine((value) => value === true, {
  message: "Anda harus menyetujui syarat & ketentuan",
});
```

Dengan begitu `defaultValues` memakai `false` tanpa casting, dan validasi server tetap sama ketatnya.

### 14.5 TypeScript

- `strict` aktif; hindari `any` dan non-null assertion pada data yang bisa `undefined`.
- Gunakan `z.input<typeof schema>` untuk nilai form dan `z.infer` untuk hasil server ketika schema punya `default()` atau transform.
- Union error memakai tipe yang valid dari `ERROR_CODES` di `src/lib/error.ts`. `INTERNAL_ERROR` adalah kode generic yang benar untuk kegagalan tak terduga; jangan mengarang kode baru di client.

### 14.6 Ownership landmark `<main>`

`PageShell` (`src/components/layout/page-shell.tsx:21`) sudah merender `<main>` sendiri dan hanya boleh dipakai di dalam `(dashboard)`. `AuthShell` juga merender `<main>`. Sebaliknya, `(public)/layout.tsx` sudah memiliki `<main>`, sehingga halaman di `(public)` **tidak boleh** memakai `PageShell` maupun membungkus kontennya dengan `<main>` tambahan.

### 14.7 Copywriting: config-driven

Seluruh teks user-facing yang ditampilkan oleh komponen di `src/features/` diambil dari `src/config/`, bukan ditulis inline:

| Config | Isi | Dipakai oleh |
| --- | --- | --- |
| `config/site.ts` | nama, URL, nav sidebar, `publicNavConfig`, `publicHeaderConfig` | header/footer publik, sidebar dashboard |
| `config/auth-pages.ts` | branding + footer bersama (semua route auth) | `AuthShell`, `AuthInfoPanel`, 7 route `(auth)` |
| `config/login-page.ts` | copy form login | `LoginForm` |
| `config/register-page.ts` | copy form register | `RegisterForm` |
| `config/public-pages.ts` | copy landing, `aboutConfig`, `contactConfig`, `footerConfig` | `(public)/*` |
| `config/dashboard.ts`, `config/roles.ts`, `config/appearance.ts` | data dashboard, katalog role, token tema | fitur dashboard/roles/settings |
| `config/cookie-consent.ts` | copy banner persetujuan cookie + label privacy | `components/custom/cookie-consent.tsx` |
| `config/audit-page.ts` | copy halaman `/settings/audit` (judul, label kolom/filter/paginasi, `basePath`, `filterKeys`) | `features/audit/components/audit-filters.tsx`, `audit-table.tsx`, `audit-pagination.tsx`, `audit-badge.tsx`, `audit-detail-sheet.tsx`, dan page-nya |

Konsekuensinya: menambah halaman atau mengganti brand berarti menambah key di config, bukan menyunting komponen.

### 14.8 Design token dan tema

- Warna didefinisikan sebagai token semantic shadcn di `src/app/globals.css` (`:root` untuk light warm-ivory, `.dark` untuk dark). Nilai primary/chart/sideral_primary dalam satu keluarga emerald agar konsisten.
- Hook `@theme inline` memetakan token ke `--color-*`; utility tekstual (`bg-primary`, `text-muted-foreground`, `border-border`) selalu dipakai, bukan warna hex langsung.
- Light theme sengaja memakai ivory hangat, bukan `oklch(1 0 0)`, agar tidak menyilaukan. Ubah melalui token, bukan melalui arbitrary value.
- `@utility bg-noise`, `bg-grid`, dan `bg-panel-grid` hanya untuk layer dekoratif; semua diberi `aria-hidden` dan `pointer-events-none`.
- Animasi reveal memakai `animate-reveal*` di `globals.css` dan selalu prepping `motion-reduce:`.
- Font: `Plus_Jakarta_Sans` (`--font-jakarta`) dan `Geist_Mono` (`--font-geist-mono`), dimuat di `src/app/layout.tsx` dan dipetakan lewat `--font-sans`/`--font-mono`.

### 14.9 Halaman publik

- Halaman dalam `(public)` adalah Server Component, static, dan compose seksi dari `src/features/landing/components/` atau config langsung. Tidak ada chart, editor, atau library client di route publik.
- Header publik memuat nav utama (desktop saja, `hidden md:flex`), theme toggle, dan CTA akun. `ThemeToggle` adalah satu-satunya client leaf di header.
- Footer publik digenerate dari `footerConfig` dan **hanya memuat link yang benar-benar ada**; jangan menambahkan placeholder `href="#"`.
- Metadata: `title`, `description`, `alternates.canonical`, dan `openGraph`. Route `(auth)` tidak perlu canonical dan tetap `noindex` lewat `(auth)/layout.tsx`.
- `sitemap.ts` memakai konstanta `LAST_MODIFIED`, bukan `new Date()`, agar crawler tidak menganggap semua halaman berubah tiap request. Tambahkan route baru ke sitemap saat dibuat.

### 14.10 Link anchor

Section yang menjadi tujuan navigasi harus punya `id` stabil (`#features`, `#faq`) supaya `href="/#features"` bekerja. Saat menambah section baru yang dirujuk footer atau nav, tambahkan `id` tersebut.

### 14.11 Client leaf generik: `CopyButton` dan `useRecentPages`

- `src/components/custom/copy-button.tsx` adalah client leaf yang membungkus `Button` (Base UI, tanpa `asChild`). Ia hanya menyalin teks: `navigator.clipboard.writeText` dengan fallback `document.execCommand("copy")` untuk konteks non-secure, feedback berupa tukar ikon + `role="status"`, reset ±2 detik, dan timeout dibersihkan saat unmount. Nilai yang disalin tidak masuk `aria-label` dan tidak pernah di-log; semua copy ada di `config/copy-button.ts`.
- `src/hooks/use-recent-pages.ts` menyimpan "terbaru dikunjungi" di `localStorage` untuk `CommandMenu`. Penulisan hanya menerima path yang ada di `sidebarNav` (persis atau segmen turunannya), dedupe by href, most-recent-first, maks 8 entri, payload dibatasi, dan payload dari storage divalidasi ulang dengan Zod. Pembacaan memakai `useSyncExternalStore` dengan snapshot ter-cache, sehingga tidak ada `setState` sinkron di dalam effect.
- Rekaman kunjungan dilakukan oleh `CommandMenu` sendiri lewat `usePathname()`, jadi tidak ada client component per halaman dan tidak ada provider tree baru. Jangan menambah boundary client baru hanya untuk fitur ini.

### 14.12 Banner persetujuan cookie

- `src/components/custom/cookie-consent.tsx` adalah client leaf yang di-mount di root `src/app/layout.tsx` (bukan di `(public)`), sehingga consent terkumpul sebelum route mana pun dirender dan tidak perlu diduplikasi per route group. Tradeoff: banner juga muncul di `(auth)` dan `(dashboard)`; secara hukum route tersebut tidak dikecualikan hanya karena berada di balik login.
- Root layout tetap Server Component; jangan tambahkan `"use client"` di sana. Leaf ini tidak memakai `<main>`, jadi landmark §14.6 tidak berubah.
- `localStorage` dibaca sebagai external store lewat `useSyncExternalStore` dengan server snapshot `null` (pola yang sama dengan `useRecentPages`, §14.11). Jangan menggantinya dengan `setState` sinkron di dalam effect: itu memicu hydration mismatch dan lint error `react-hooks/set-state-in-effect`.
- Bentuk data dan key berversi ada di `src/features/cookie-consent/schema.ts`, validasi di `service.ts` (Zod, `try/catch`). Naikkan versi key saat format berubah agar user diminta memilih ulang.
- Banner tidak memblokir halaman: `fixed`, tanpa overlay, tanpa focus trap, `aria-modal="false"`, dapat ditutup dengan Escape, dan menghormati `prefers-reduced-motion` lewat `animate-reveal motion-reduce:animate-none`.
- Ini consent *mekanisme*, bukan analytics. Jangan menambahkan skrip pelacak ke repo ini; integrator analytics cukup listen ke `CustomEvent` `cookie-consent:change` dan wajib default memblokir skrip sampai `accepted`. Lihat `docs/SECURITY.md` §Cookie consent.

## 15. Peta Route, Fitur, dan Entry Point

| Route | Render | Config | Client leaf | Data |
| --- | --- | --- | --- | --- |
| `/` | `(public)/page.tsx` | `landingConfig` | tidak ada | statis |
| `/about` | `(public)/about/page.tsx` | `aboutConfig` | tidak ada | statis |
| `/contact` | `(public)/contact/page.tsx` | `contactConfig` | `features/contact/components/contact-form.tsx` | server action `sendContactMessage` |
| `/privacy`, `/terms` | `(public)/*/page.tsx` | `legalDocuments` | tidak ada | statis |
| `/login` | `(auth)/login/page.tsx` | `getAuthPageConfig()` + `LOGIN_PAGE_FORM_CONFIG` | `login-form.tsx` | `loginAction` |
| `/register` | `(auth)/register/page.tsx` | `getAuthPageConfig()` + `REGISTER_PAGE_CONFIG` | `register-form.tsx` | `registerAction` |
| `/forgot-password` | `(auth)/forgot-password/page.tsx` | `getAuthPageConfig()` | `forgot-password-form.tsx` | `forgotPasswordAction` |
| `/reset-password` | `(auth)/reset-password/page.tsx` | `getAuthPageConfig()` | `reset-password-form.tsx` | `verifyResetToken` + `resetPasswordAction` |
| `/check-email`, `/verify-email`, `/invite/[token]` | `(auth)/*` | `getAuthPageConfig()` | sesuai kebutuhan | server |
| `/dashboard`, `/users`, `/roles`, `/settings` | `(dashboard)/*` | `config/dashboard.ts`, `config/roles.ts` | tabel/chart client | service per fitur |
| `/settings/code-graph` | `(dashboard)/settings/code-graph/page.tsx` | `codeGraphConfig` | `features/code-graph/components/code-graph.tsx` | build-time read `src/features/code-graph/data/graph.json` |
| `/settings/logs` | `(dashboard)/settings/logs/page.tsx` | `LOG_MANAGEMENT_PAGE_CONFIG` | tidak ada | `getLogOverview()` + `verifyAuditIntegrity()`, `force-dynamic` |
| `/settings/audit` | `(dashboard)/settings/audit/page.tsx` | `AUDIT_PAGE_CONFIG` | `audit-filters.tsx` (URL-driven), `audit-pagination.tsx` | `queryAuditEvents()`, `force-dynamic` |
| `/maintenance` | `app/maintenance/page.tsx` | — | tidak ada | statis |
| `/api/health` | `app/api/health/route.ts` | — | tidak ada | `src/lib/health.ts`, force-dynamic, no-store |
| `/api/health/live` | `app/api/health/live/route.ts` | — | tidak ada | idem; liveness, selalu 200 selama proses hidup |
| `/api/health/ready` | `app/api/health/ready/route.ts` | — | tidak ada | idem; readiness, 503 bila invariant lokal gagal |
| `/api/health/metrics` | `app/api/health/metrics/route.ts` | — | tidak ada | idem; 404 kecuali `HEALTH_METRICS_ENABLED=true` |
| `/.well-known/security.txt` | `public/.well-known/security.txt` | `securityTxtConfig` | tidak ada | statis (RFC 9116) |

Aturan saat menambah route: satu table row per route, dan semua entry harus benar-benar ada di working tree.

Catatan `/api/health*`: ketiga probe adalah endpoint publik tanpa autentikasi secara desain, karena load balancer, uptime monitor, dan scraper melakukan polling dari luar aplikasi dan tidak membawa credential. Konsekuensinya, response hanya berisi boolean/angka agregat — tidak ada secret, nilai environment, path file, pesan exception, atau stack trace (§4.5, §10.4). `GET` mengembalikan `200` saat `ok` dan `503` saat `degraded`, dengan `Cache-Control: no-store`; `HEAD` mengembalikan status yang sama tanpa body. Helper bersama ada di `src/lib/health.ts`, dan versi aplikasi dibaca dari `package.json`, bukan string yang ditulis tangan. Yang diperiksa hanya invarian lokal yang benar-benar ada di repo (logger terpasang, `NEXT_PUBLIC_APP_URL` valid, store metrik terbaca, dan keberadaan `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` di production). Tidak ada probe database, cache, atau layanan eksternal karena aplikasi ini frontend-only. `security.txt` dilayani sebagai aset statis dari `public/`, bukan Route Handler; field-nya harus disalin manual dari `securityTxtConfig` di `src/config/site.ts` dan masih berisi placeholder.

Catatan `/settings/logs`: ini satu-satunya route yang membaca audit store, dan render-nya `force-dynamic` karena semua angka berasal dari store in-memory yang berubah tiap request. `verifyAuditIntegrity()` dipanggil langsung dari page sehingga report integritas dihitung ulang di server, bukan diambil dari teks statis; `IntegrityPanel` juga menampilkan jejak `lastVerifiedAt` dari `features/log-management/lib/schedule.ts`, yang **sengaja NOOP di production** (`NODE_ENV === "production"` mengembalikan state lama tanpa memverifikasi), jadi di production panel itu akan permanen menampilkan "belum pernah diverifikasi". Route ini juga **belum punya guard authz** di page maupun di `features/audit/service.ts`. Detailnya di `docs/AUDIT.md`.

Catatan `/settings/audit`: route pembaca event audit yang bisa difilter. Halaman hanya menormalisasi `searchParams` mentah (array diratakan ke string pertama) lalu menyerahkan objek itu ke `queryAuditEvents()`; validasi, coercion `page`/`pageSize`, dan batas nilainya tetap milik `auditQuerySchema`, jadi query rusak tidak melempar dan hanya menghasilkan halaman kosong. `baseQuery` yang dikirim ke `AuditPagination` berisi kunci filter aktif **tanpa** `page` (§4.1). Route ini `force-dynamic` karena membaca store in-memory, tidak memakai `PageShell` (§14.6), tidak punya stat row dari `getAuditSummary()` (belum ada copy di config, §14.7), dan **belum punya guard authz** — sama seperti `/settings/logs`, termasuk di `features/audit/service.ts`. Copy seluruhnya dari `AUDIT_PAGE_CONFIG`; `AuditFilters` hanya client leaf di halaman ini dan menulis state ke URL, bukan ke server.

Catatan output `npm run build`: `/login` dan `/reset-password` dirender dynamic (`ƒ`) karena membaca `searchParams` (`?reset=success` dan `?token=`). Route publik lain tetap static (`○`). Jangan memaksa `searchParams` itu dibaca di client hanya demi mengembalikan route ke static — dynamic di sini memang dibutuhkan untuk state UI yang benar.

## 16. Gap yang Diketahui (status per 2026-09)

Verifier terhadap kode, bukan klaim dokumentasi lain:

1. **Tidak ada backend.** `loginAction` memakai kredensial mock (`demo@example.com` / `password123`); `registerUser` dan `resetPassword` belum menyimpan apa pun. `src/features/auth/service.ts` masih memakai store in-memory untuk reset token.
2. **Tidak ada session nyata.** `ThemeProvider` ada, tetapi autentikasi dan RBAC enforcement belum diimplementasikan; `src/lib/rbac.ts` dan `src/features/roles/` belum dipanggil dari boundary server.
3. **Tidak ada automated test.** `package.json` hanya memiliki `dev`, `build`, `start`, `lint`. Test runner perlu ditambahkan sebelum template dianggap production-ready.
4. **`role/` dan `roles/` tumpang tindih** dan belum dikonsolidasikan.
5. **CSP masih statis dan longgar.** `next.config.ts` sudah mengirim CSP, tetapi `script-src`/`style-src` memakai `'unsafe-inline'` demi static generation. Pola nonce di `proxy.ts` belum dipakai.
6. **Teks legal masih placeholder** bertanggal 2025 di `src/config/public-pages.ts`.
7. **Kontak belum punya kanal nyata.** `sendContactMessage` hanya memvalidasi, me-rate-limit, dan mencatat log (`delivery: "log-only"`).
8. **Health check hanya bersifat lokal.** `/api/health`, `/api/health/live`, dan `/api/health/ready` memeriksa invarian lokal, bukan dependensi eksternal, karena memang tidak ada dependensi seperti itu (§15). `/api/health/metrics` masih membaca store in-memory dan mati secara default. `public/.well-known/security.txt` sudah ada, tetapi `Contact` masih `security@example.com` (placeholder) dan README/CONTRIBUTING belum punya kanal pelaporan.
8. **Consent cookie baru berupa mekanisme.** `CookieConsent` menyimpan dan memublikasikan pilihan, tetapi repo ini tidak punya analytics, jadi belum ada yang benar-benar tunduk pada pilihan itu. Integrator yang menambah tracker wajib mengimplementasikan pemblokiran default sebelum `accepted`.
9. **Audit log ada dan dipakai, tetapi tidak durable dan tidak dijaga.** `src/features/audit/` sudah aktif: `logAudit()` dipakai di `features/auth/`, `features/user/`, `features/contact/`, `features/organization/`, dan `features/log-management/`, dan `/settings/logs` sudah menampilkannya. Yang belum ada: persistence (store in-memory 5000 entry, hilang saat restart/deploy, tidak konsisten multi-replica), authz nyata saat baca (`requireSession()` di `src/lib/rbac.ts` masih placeholder sehingga guard di `features/audit/actions.ts` tidak menolak siapa pun; `features/audit/service.ts` dan route `/settings/logs` tidak punya guard sama sekali), alerting atas rantai hash yang rusak, dan test untuk `actions.ts`/`service.ts`. Selain itu `verifyChain()` melaporkan `brokenAtIndex: 0` secara permanen setelah store overflow karena entry pertama yang tersisa masih memegang `previousHash` yang sudah tidak ada. Rinciannya di `docs/AUDIT.md`.

Setiap gap di atas harus dihapus dari daftar ini ketika sudah terimplementasi, dan dokumentasinya diperbarui pada commit yang sama.
