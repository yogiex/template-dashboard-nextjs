# Next.js Dashboard Template

Template minimal untuk membangun dashboard Next.js berbasis App Router. Template ini menyediakan fondasi Next.js, React, TypeScript, Tailwind CSS, konfigurasi ESLint, security header dasar, dan dokumentasi arsitektur serta standar implementasi.

> **Status saat ini:** proyek masih berada pada tahap fondasi. Autentikasi, database, service layer, dashboard UI, dan fitur produksi belum diimplementasikan.

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
- Konfigurasi aplikasi terpusat di `src/config/site.ts`.

## Status Sprint

- [x] Dark mode
- [ ] Layout dashboard (sidebar + topbar) — Sprint 1 berikutnya

## Stack

| Teknologi | Versi/role |
| --- | --- |
| Next.js | `16.3.6`, App Router dan React Server Components |
| React / React DOM | `19.2.8` |
| TypeScript | `^5`, strict mode dan alias `@/*` |
| Tailwind CSS | `^4`, dikonfigurasi melalui PostCSS |
| ESLint | `^9` dengan `eslint-config-next` |
| shadcn/ui | Konfigurasi generator tersedia; komponen belum diimplementasikan |
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
│   └── app/                    # App Router, layout, dan route dasar
├── components.json             # konfigurasi shadcn
├── eslint.config.mjs           # konfigurasi lint
├── next.config.ts              # konfigurasi Next.js dan security headers
├── package.json
├── postcss.config.mjs          # pipeline PostCSS
└── tsconfig.json               # TypeScript dan alias @/*
```

Struktur target seperti `src/features/`, `src/components/`, `src/lib/`, dan service layer **belum dibuat**. Folder tersebut hanya boleh dibuat ketika ada fitur nyata yang membutuhkan tanggung jawab tersebut.

## Dokumentasi

| Dokumen | Isi |
| --- | --- |
| [Setup](docs/SETUP.md) | Prasyarat, instalasi, environment variable, command, dan checklist setup |
| [Arsitektur](docs/ARCHITECTURE.md) | Prinsip, lifecycle request, RSC, Client Component, service layer, data flow, dan cache |
| [Konvensi](docs/CONVENTIONS.md) | Naming, komponen, styling, TypeScript, route, data, API, dan Git |
| [Keamanan](docs/SECURITY.md) | Checklist OWASP, authorization, input, secret, session, logging, dan SSRF |
| [Performa](docs/PERFORMANCE.md) | Budget performa, rendering, data fetching, cache, bundle, dan monitoring |
| [Security Presets](SECURITY_PRESETS.md) | Ringkasan baseline keamanan dan kontrol yang masih perlu ditambahkan |
| [Contributing](CONTRIBUTING.md) | Workflow kontribusi, format commit, dan checklist pull request |

## Workflow Reuse Project

Template ini dirancang untuk dijadikan fondasi aplikasi baru, bukan aplikasi dashboard siap pakai. Ikuti workflow berikut saat mengustomisasi atau mengkloning template:

1. **Buat salinan project atau repository baru.** Jangan mengubah history repository asal. Ganti nama package, metadata, branding, dan konfigurasi deployment sesuai aplikasi.
2. **Verifikasi fondasi.** Jalankan `npm ci`, `npm run lint`, dan `npm run build` sebelum menambah fitur.
3. **Tentukan kebutuhan fitur.** Tuliskan use case, actor, sumber data, aturan authorization, kebutuhan environment, dan state UI yang diperlukan.
4. **Buat struktur seperlunya.** Tambahkan route di `src/app/`, komponen bersama di `src/components/`, dan logika domain di `src/features/<fitur>/` sesuai tanggung jawabnya.
5. **Tambahkan service layer di server.** Semua akses database/API internal, session, permission, dan ownership check harus berada di server, bukan di komponen client atau presentasional.
6. **Tambahkan autentikasi bila dibutuhkan.** Pilih library auth, definisikan session dan route privat, lalu lakukan guard awal sekaligus pemeriksaan ulang pada setiap boundary sensitif.
7. **Tambahkan database bila dibutuhkan.** Pilih ORM atau driver, schema, migrasi, environment server, adapter, dan transaction boundary.
8. **Tambahkan komponen UI seperlunya.** Gunakan Tailwind token yang ada. shadcn dapat digunakan melalui generator, tetapi hasil generate harus ditinjau dan dependency yang ditambahkan harus dicatat.
9. **Tambahkan validasi dan keamanan.** Validasi params, search params, form, body, cookie, dan input eksternal di server. Jangan mengirim secret, token, atau entity database mentah ke client.
10. **Tambahkan state loading, error, empty, dan not-found.** Letakkan fallback sedekat mungkin dengan segment atau bagian data yang lambat.
11. **Uji dan dokumentasikan.** Tambahkan test sesuai risiko, perbarui dokumentasi, jalankan lint/build/test, lalu catat konfigurasi environment baru di `.env.example` tanpa secret.

Contoh alur request yang diharapkan:

```text
route/component → feature service → database/API → DTO minimal → UI
```

Server Component digunakan secara default. Tambahkan `"use client"` hanya pada bagian interaktif yang membutuhkan state, event handler, browser API, atau dependency client-only.

## Keamanan

Baseline yang sudah diterapkan:

- `X-DNS-Prefetch-Control: on`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

Control keamanan berikut **belum diimplementasikan**:

- Autentikasi dan session.
- RBAC, permission, ownership check, dan guard route privat.
- Database, schema, migrasi, dan parameterized query.
- Validasi input boundary dan rate limiting.
- Content Security Policy (CSP).
- Logging keamanan terstruktur dan monitoring.
- Secret manager serta validator environment server.
- Dependency audit pipeline dan update otomatis.

Jangan menganggap security header yang tersedia sebagai pengganti autentikasi, authorization, validasi input, atau threat model. Lihat [docs/SECURITY.md](docs/SECURITY.md).

## Roadmap dan Status

Status di bawah memisahkan fondasi yang sudah tersedia dari pekerjaan yang belum dilakukan.

| Area | Status | Catatan |
| --- | --- | --- |
| Next.js App Router dan route dasar | **Selesai** | `src/app/` tersedia |
| React, TypeScript strict, Tailwind CSS, ESLint | **Selesai** | Fondasi dan konfigurasi tersedia |
| Security header dasar | **Selesai** | Dikonfigurasi di `next.config.ts` |
| Dokumentasi arsitektur dan standar implementasi | **Selesai** | Tersedia di `docs/` |
| Dashboard shell, sidebar, topbar, dan navigasi | **Belum diimplementasikan** | Struktur target bukan bagian yang sudah tersedia |
| Komponen shadcn/ui | **Belum diimplementasikan** | `components.json` tersedia, tetapi komponen belum di-generate |
| Autentikasi dan session | **Belum diimplementasikan** | Library, guard, cookie, dan authorization belum ada |
| Database, ORM, schema, dan migrasi | **Belum diimplementasikan** | Belum ada koneksi atau service database |
| Service layer dan fitur domain | **Belum diimplementasikan** | Folder fitur/service dibuat saat kebutuhan nyata muncul |
| Server Actions dan Route Handler | **Belum diimplementasikan** | Endpoint dan mutasi belum tersedia |
| Loading, error, empty state, dan not-found | **Belum diimplementasikan** | Hanya fallback bawaan yang mungkin tersedia dari framework |
| Validasi input dan rate limiting | **Belum diimplementasikan** | Wajib ditambahkan pada boundary sensitif |
| CSP, logging keamanan, audit dependency, monitoring | **Belum diimplementasikan** | Persyaratan keamanan untuk fitur produksi |
| CI/CD dan deployment | **Belum diimplementasikan** | Belum ada pipeline otomatis yang ditentukan dalam template |

Urutan yang disarankan untuk pengembangan berikutnya:

1. Finalisasi identitas, kebutuhan, dan scope aplikasi.
2. Tambahkan shell dashboard dan primitive UI seperlunya.
3. Pilih dan implementasikan autentikasi serta session.
4. Tambahkan service layer, database, schema, dan migrasi.
5. Implementasikan authorization pada route, action, handler, dan service.
6. Tambahkan validasi input, error handling, loading, dan empty state.
7. Tambahkan CSP, logging keamanan, rate limiting, dan audit dependency.
8. Bangun CI/CD, test, monitoring, dan deployment produksi.

## Kontribusi

Baca [CONTRIBUTING.md](CONTRIBUTING.md) sebelum melakukan perubahan. Gunakan branch fitur/perbaikan dan Conventional Commits, misalnya `feat(auth): add protected dashboard route` atau `docs(security): document session cookie policy`. Jangan commit secret, `.env.local`, generated output, atau perubahan yang tidak terkait dalam commit yang sama.
