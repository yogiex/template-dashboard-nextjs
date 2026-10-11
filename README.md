# Next.js Dashboard Template

Template minimal untuk membangun dashboard Next.js berbasis App Router. Template ini menyediakan fondasi Next.js, React, TypeScript, Tailwind CSS, konfigurasi ESLint, dokumentasi arsitektur serta standar implementasi, dan fondasi autentikasi mock di server. Konfigurasi security header sudah tersedia di dokumentasi tetapi belum aktif di `next.config.ts` — lihat bagian [Keamanan](#keamanan).

> **Status saat ini:** fondasi aplikasi, UI publik, UI autentikasi, shell dashboard, dan dashboard content visual tersedia. Autentikasi sudah berjalan sebagai **mock di server** — cookie session `mock_session`, guard route `(dashboard)`, dan Server Action login/logout — tetapi autentikasi production, database, RBAC nyata, dan fitur produksi belum diimplementasikan.

## Fitur Saat Ini

- Next.js App Router dengan Server Component sebagai default.
- React dan TypeScript dengan mode `strict`.
- Tailwind CSS v4 dan PostCSS.
- ESLint 9 dengan `eslint-config-next`.
- Konfigurasi shadcn melalui `components.json`.
- Security header dasar pada seluruh route.
- Dokumentasi setup, arsitektur, konvensi, keamanan, dan performa.
- Route dasar di `src/app/`.
- Dark mode dengan `next-themes` dan pilihan Light, Dark, serta System.
- Fondasi RFC 9457 dengan taxonomy error, `problemResponse`, dan logger terstruktur.
- Autentikasi mock di server: cookie session `mock_session` (`src/features/auth/session.ts`), guard route `(dashboard)`, dan Server Action `loginAction`/`logoutAction` (`src/features/auth/actions.ts`).
- Konfigurasi aplikasi terpusat di `src/config/site.ts`.
- Notifications UI di topbar dengan unread count dan status dibaca tersimpan lokal per browser.

## Status

- [x] Setup Next.js + shadcn/ui + dokumentasi standar
- [x] Dark mode + security headers + error taxonomy (RFC 9457)
- [x] Auth UI routes (`/login`, `/register`, `/forgot-password`, `/reset-password`, `/check-email`, `/invite/[token]`, `/verify-email`), config-driven; login memakai session mock di server, bukan session production
- [x] Public pages (`/`, `/terms`, `/privacy`)
- [x] PublicHeader memakai CTA anonim yang valid ke `/login` dan `/register`; session production belum tersedia
- [x] Layout dashboard (sidebar + topbar)  ← Sprint 1
- [x] Breadcrumb dinamis + command menu Ctrl/Cmd+K  ← Sprint 2
- [x] Dashboard content: KPI cards, lazy-loaded charts, dan activity table  ← Sprint 2.5
- [x] Settings `/settings/general` dan `/settings/appearance` dengan brand color switcher  ← Sprint F1
- [x] DataTable server-driven `/users` dengan schema → service → actions  ← Sprint 3
- [x] CRUD form reference create/edit user dengan RHF + Zod + fieldErrors  ← Sprint F2
- [x] Roles UI reference dengan role summary dan matriks permission read-only  ← Sprint F3
- [x] Notifications UI di topbar dengan schema, mock service, localStorage read state, dan unread count  ← Sprint F4
- [x] Advanced theme palette dengan custom hex, skala semantic/chart, live preview, dan import/export JSON  ← Sprint F6
- [ ] Integrasi notification backend untuk delivery, sinkronisasi lintas perangkat, dan enforcement
- [ ] Fase 2: CMS settings panel (GOALS.md) — nama app, favicon, menu manager

## Stack

| Teknologi | Versi/role |
| --- | --- |
| Next.js | `16.3.6`, App Router dan React Server Components |
| React / React DOM | `19.2.8` |
| TypeScript | `^5`, strict mode dan alias `@/*` |
| Tailwind CSS | `^4`, dikonfigurasi melalui PostCSS |
| ESLint | `^9` dengan `eslint-config-next` |
| shadcn/ui | Komponen UI dasar tersedia melalui generator; primitive dapat diperluas |
| Node.js | Minimal `20.9.0` |
| npm | Rekomendasi `10` atau lebih baru |

## Prasyarat

Pastikan lingkungan lokal sudah memiliki:

- Node.js `20.9.0` atau lebih baru.
- npm yang kompatibel dengan `package-lock.json`.
- Git dan akses ke registry npm.

Periksa versi yang digunakan:

```bash
node --version
npm --version
```

## Quick Start

Clone repository, lalu jalankan perintah berikut dari root project:

```bash
git clone <repository-url>
cd template-nextjs-dashboard
npm install
cp .env.example .env.local
npm run dev
```

Buka `http://localhost:3000` di browser. Development server akan memuat ulang perubahan secara otomatis.

### Kredensial login (mock, hanya untuk pengembangan lokal)

| Field | Nilai |
| --- | --- |
| URL | `http://localhost:3000/login` |
| Email | `demo@example.com` |
| Password | `password123` |
| Logout | Menu pengguna (kanan atas) → Log out |

Kredensial ini **mock, bukan secret**, dan didefinisikan bersama DAL demo di `src/features/auth/service.ts`. Semua route `(dashboard)` butuh sesi; tanpa login Anda akan dialihkan ke `/login`. Jangan dipakai ulang di kode maupun deployment nyata — sebelum produksi, ganti dengan autentikasi sungguhan (hashing password, session terverifikasi, store durable). Sesi mock hidup di memori proses dan hilang saat server restart, serta percobaan login dibatasi 5x per 15 menit per email.

Untuk instalasi reproducible pada CI atau deployment, gunakan `npm ci`:

```bash
npm ci
```

Saat ini template belum membutuhkan environment variable untuk autentikasi atau database. Tetap gunakan `.env.local` untuk konfigurasi lokal dan jangan pernah commit file tersebut atau secret apa pun.

## Scripts

| Command | Kegunaan |
| --- | --- |
| `npm run dev` | Menjalankan development server |
| `npm run lint` | Menjalankan ESLint |
| `npm run build` | Membuat production build dan memeriksa tipe |
| `npm run start` | Menjalankan hasil production build |

Verifikasi lokal minimum:

```bash
npm run lint
npm run build
```

Jalankan `npm run start` hanya setelah build berhasil.

## Struktur Project

Struktur aktual saat ini:

```text
.
├── docs/                       # dokumentasi standar implementasi
├── public/                     # aset statik
├── src/
│   ├── app/                    # App Router, layouts, dan routes
│   ├── components/              # Layout, custom, dan UI primitives
│   ├── config/                  # Config aplikasi dan halaman
│   ├── features/                # Feature modules dan service layer
│   └── lib/                     # Error, environment, logger, dan utilities
├── components.json             # konfigurasi shadcn
├── eslint.config.mjs           # konfigurasi lint
├── next.config.ts              # konfigurasi Next.js dan security headers
├── package.json
├── postcss.config.mjs          # pipeline PostCSS
└── tsconfig.json               # TypeScript dan alias @/*
```

Folder `src/features/`, `src/components/`, dan `src/lib/` sudah dibuat. Service layer dan fitur domain berkembang sesuai kebutuhan nyata, bukan sebagai target yang harus diisi dengan data dummy.

## Dokumentasi

| Dokumen | Isi |
| --- | --- |
| [Setup](docs/SETUP.md) | Prasyarat, instalasi, environment variable, command, dan checklist setup |
| [Integration Handbook](docs/INTEGRATION.md) | **Panduan recycle: menghubungkan backend asli, checklist 30 menit** |
| [Arsitektur](docs/ARCHITECTURE.md) | Prinsip, lifecycle request, RSC, Client Component, service layer, data flow, dan cache |
| [Konvensi](docs/CONVENTIONS.md) | Naming, komponen, styling, TypeScript, route, data, API, dan Git |
| [Keamanan](docs/SECURITY.md) | Checklist OWASP, authorization, input, secret, session, logging, dan SSRF |
| [GOALS](docs/GOALS.md) | Visi, objective, fase, dan success criteria CMS-like |
| [Performa](docs/PERFORMANCE.md) | Budget performa, rendering, data fetching, cache, bundle, dan monitoring |
| [Security Presets](SECURITY_PRESETS.md) | Ringkasan baseline keamanan dan kontrol yang masih perlu ditambahkan |
| [Contributing](CONTRIBUTING.md) | Workflow kontribusi, format commit, dan checklist pull request |

## Workflow Reuse Project

Template ini dirancang untuk dijadikan fondasi aplikasi baru, bukan aplikasi dashboard siap pakai. Ikuti workflow berikut saat mengustomisasi atau mengkloning template:

1. **Buat salinan project atau repository baru.** Jangan mengubah history repository asal. Ganti nama package, metadata, branding, dan konfigurasi deployment sesuai aplikasi.
2. **Verifikasi fondasi.** Jalankan `npm ci`, `npm run lint`, dan `npm run build` sebelum menambah fitur.
3. **Tentukan kebutuhan fitur.** Tuliskan use case, actor, sumber data, aturan authorization, kebutuhan environment, dan state UI yang diperlukan.
4. **Ikuti `docs/INTEGRATION.md` untuk menghubungkan backend-mu.**
5. **Buat struktur seperlunya.** Tambahkan route di `src/app/`, komponen bersama di `src/components/`, dan logika domain di `src/features/<fitur>/` sesuai tanggung jawabnya.
6. **Tambahkan service layer di server.** Semua akses database/API internal, session, permission, dan ownership check harus berada di server, bukan di komponen client atau presentasional.
7. **Tambahkan autentikasi bila dibutuhkan.** Pilih library auth, definisikan session dan route privat, lalu lakukan guard awal sekaligus pemeriksaan ulang pada setiap boundary sensitif.
8. **Tambahkan database bila dibutuhkan.** Pilih ORM atau driver, schema, migrasi, environment server, adapter, dan transaction boundary.
9. **Tambahkan komponen UI seperlunya.** Gunakan Tailwind token yang ada. shadcn dapat digunakan melalui generator, tetapi hasil generate harus ditinjau dan dependency yang ditambahkan harus dicatat.
10. **Tambahkan validasi dan keamanan.** Validasi params, search params, form, body, cookie, dan input eksternal di server. Jangan mengirim secret, token, atau entity database mentah ke client.
11. **Tambahkan state loading, error, empty, dan not-found.** Letakkan fallback sedekat mungkin dengan segment atau bagian data yang lambat.
12. **Uji dan dokumentasikan.** Tambahkan test sesuai risiko, perbarui dokumentasi, jalankan lint/build/test, lalu catat konfigurasi environment baru di `.env.example` tanpa secret.

Contoh alur request yang diharapkan:

```text
route/component → feature service → database/API → DTO minimal → UI
```

Server Component digunakan secara default. Tambahkan `"use client"` hanya pada bagian interaktif yang membutuhkan state, event handler, browser API, atau dependency client-only.

## Keamanan

Baseline yang seharusnya sudah diterapkan:

- `X-DNS-Prefetch-Control: on`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (aktif pada deployment HTTPS)
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

**Verifikasi kondisi nyata:** `next.config.ts` saat ini **tidak mengirim satu pun** header di atas — blok `headers()` sudah tidak ada, dan pencarian `Content-Security-Policy`/`X-Frame-Options` di source, `nginx/nginx.conf`, maupun workflow CI tidak menemukan apa pun. Dulu header itu dipasang bersama `output: "export"` dan hilang bersamaan dengannya. Sampai blok `headers()` dipasang kembali, jangan menganggap list di atas sebagai baseline yang aktif; gap-nya juga sudah dicatat di `docs/ARCHITECTURE.md` §16.

Control keamanan berikut **belum diimplementasikan**:

- Autentikasi production: hashing password (DAL masih menyimpan kredensial demo sebagai string), session durable yang terverifikasi secara kriptografis, dan lockout akun.
- RBAC, permission, ownership check, dan guard route privat di luar grup `(dashboard)`.
- Database, schema, migrasi, dan parameterized query.
- Content Security Policy (CSP).
- Monitoring keamanan dan audit dependency.
- Secret manager untuk runtime production.

Fondasi yang sudah tersedia mencakup validasi input pada UI auth, rate limiting in-memory untuk auth UI, session mock di server dengan cookie `httpOnly`, guard route `(dashboard)`, logger terstruktur, dan typed environment. Session mock itu **bukan** session production: token hidup di memori proses, hilang saat restart, tidak konsisten lintas instance, dan tidak ada verifikasi signature maupun kunci server.

Jangan menganggap security header yang tersedia sebagai pengganti autentikasi, authorization, validasi input, atau threat model. Lihat [docs/SECURITY.md](docs/SECURITY.md).

## Roadmap dan Status

Status di bawah memisahkan fondasi yang sudah tersedia dari pekerjaan yang belum dilakukan.

| Area | Status | Catatan |
| --- | --- | --- |
| Next.js App Router dan route dasar | **Selesai** | `src/app/` tersedia |
| React, TypeScript strict, Tailwind CSS, ESLint | **Selesai** | Fondasi dan konfigurasi tersedia |
| Security header dasar | **Selesai** | Dikonfigurasi di `next.config.ts` |
| Dokumentasi arsitektur dan standar implementasi | **Selesai** | Tersedia di `docs/` |
| Dashboard shell, sidebar, topbar, dan navigasi | **Sebagian tersedia** | Shell, sidebar, topbar, `/dashboard`, `/users`, `/settings` tersedia; layout mobile dan detail navigasi menunggu verifikasi browser |
| Komponen shadcn/ui | **Sebagian tersedia** | Primitive UI auth dan layout dasar tersedia |
| UI autentikasi | **Sebagian tersedia** | Login/register/forgot/reset tersedia; login sudah memakai session mock di server |
| Autentikasi dan session | **Sebagian tersedia** | Session mock server-side (`src/features/auth/session.ts`, cookie `mock_session` `httpOnly`/`sameSite=lax`), guard dashboard di `(dashboard)/layout.tsx`, dan Server Action `loginAction`/`logoutAction`; session production (signature, store durable, lockout) belum ada |
| Database, ORM, schema, dan migrasi | **Belum diimplementasikan** | Belum ada koneksi atau service database |
| Service layer dan fitur domain | **Sebagian tersedia** | Feature auth dan contract service tersedia |
| Server Actions dan Route Handler | **Sebagian tersedia** | `loginAction` dan `logoutAction` (`src/features/auth/actions.ts`) sudah aktif; sisa UI auth masih memakai handler lokal dan endpoint database belum |
| Loading, error, empty state, dan not-found | **Sebagian tersedia** | Root fallback tersedia; coverage per segment belum lengkap |
| Validasi input dan rate limiting | **Sebagian tersedia** | Auth UI schema dan in-memory limiter tersedia |
| CSP, logging keamanan, audit dependency, monitoring | **Belum diimplementasikan** | Persyaratan keamanan untuk fitur produksi |
| CI/CD dan deployment | **Belum diimplementasikan** | Belum ada pipeline otomatis yang ditentukan dalam template |

Urutan yang disarankan untuk pengembangan berikutnya:

1. Finalisasi identitas, kebutuhan, dan scope aplikasi.
2. Tambahkan shell dashboard dan primitive UI seperlunya.
3. Ganti session mock dengan autentikasi serta session production (hashing password, session terverifikasi, lockout akun).
4. Tambahkan service layer, database, schema, dan migrasi.
5. Implementasikan authorization pada route, action, handler, dan service.
6. Tambahkan validasi input, error handling, loading, dan empty state.
7. Tambahkan CSP, logging keamanan, rate limiting, dan audit dependency.
8. Bangun CI/CD, test, monitoring, dan deployment produksi.

## Kontribusi

Baca [CONTRIBUTING.md](CONTRIBUTING.md) sebelum melakukan perubahan. Gunakan branch fitur/perbaikan dan Conventional Commits, misalnya `feat(auth): add protected dashboard route` atau `docs(security): document session cookie policy`. Jangan commit secret, `.env.local`, generated output, atau perubahan yang tidak terkait dalam commit yang sama.
