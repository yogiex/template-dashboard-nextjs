# Setup

Dokumen ini menjelaskan cara menjalankan template secara lokal dan mengubahnya menjadi fondasi aplikasi dashboard. Template saat ini berada pada tahap dasar: App Router Next.js, React, Tailwind CSS, dan konfigurasi ESLint sudah tersedia, tetapi autentikasi dan database belum diimplementasikan.

## Prasyarat

Pastikan lingkungan lokal sudah memiliki:

- Node.js `20.9.0` atau lebih baru. Ini adalah requirement Next.js `16.3.6`.
- npm `10` atau lebih baru sebagai rekomendasi untuk workflow modern Node.js. Repository belum menetapkan versi npm minimum secara eksplisit melalui `engines`.
- Git.
- Akses ke registry npm untuk mengunduh dependency.

Periksa versi yang digunakan:

```bash
node --version
npm --version
```

Jika Node.js atau npm belum sesuai, gunakan version manager seperti `nvm`, `fnm`, atau alat yang digunakan tim sebelum menjalankan perintah instalasi. Pastikan command di atas menunjuk ke versi yang benar agar dependency dan build Next.js memakai runtime yang sesuai.

## Menjalankan Template secara Lokal

Clone repository, lalu jalankan perintah berikut dari root project:

```bash
git clone <repository-url>
cd template-nextjs-dashboard
npm install
cp .env.example .env.local
npm run dev
```

Buka `http://localhost:3000` di browser. Development server akan memuat ulang perubahan secara otomatis selama proses server tetap berjalan.

Login di situs ini masih **stub klien**: submit tidak memverifikasi kredensial dan tidak menerbitkan sesi, karena target deploy GitHub Pages (`output: "export"`) tidak mendukung Server Action maupun cookie. Kredensial mock `demo@example.com` / `password123` di `src/features/auth/service.ts` (DAL demo, jangan dipakai ulang di kode lain) hanya berlaku lagi setelah auth server-side di-wire kembali di host Node. Route di grup `(dashboard)` bisa dibuka tanpa sesi; hanya `/settings/security` yang butuh id sesi untuk `getMfaStatus()` dan karena itu ter-export sebagai redirect ke `/login` — di lokal halaman itu bisa dibuka penuh dengan `DEV_AUTH_BYPASS=1`.

`npm install` cocok untuk pengembangan lokal. Untuk CI, deployment, atau situasi yang membutuhkan instalasi reproducible, gunakan `npm ci`. Perintah tersebut memasang dependency sesuai `package-lock.json` dan lebih ketat terhadap perbedaan antara lockfile dengan `package.json`.

```bash
npm ci
npm run dev
```

Jangan menghapus atau mengubah `package-lock.json` hanya untuk menyelesaikan masalah instalasi. Jika dependency memang berubah, perbarui lockfile secara sengaja dan tinjau diff-nya.

## Environment Variables

Salin `.env.example` ke `.env.local` bila membutuhkan konfigurasi lokal:

```bash
cp .env.example .env.local
```

Saat ini `.env.example` tidak memiliki variabel yang wajib diisi agar template bisa jalan. Untuk autentikasi, template tidak memakai variabel environment untuk session: yang ada hanya `DEV_AUTH_BYPASS` (opsional, sengaja dibiarkan ter-comment di `.env.example`) sebagai affordance pengembangan lokal untuk `requireSessionForDev()` di `src/lib/rbac.ts`. Flag itu hanya berlaku bernilai `"1"` **dan** `NODE_ENV` bukan `production`, dan satu-satunya pemakainya adalah fungsi dev itu — `requireSession()` sengaja tidak pernah membacanya. Jangan pernah mengaktifkannya di environment yang ter-deploy.

`.env.local` hanya untuk konfigurasi lokal dan tidak boleh di-commit. Saat menambah environment variable untuk fitur baru, tambahkan nama variabel dan contoh nilai yang aman ke `.env.example`, lalu dokumentasikan kegunaan, format, dan apakah nilai tersebut wajib ada di environment deployment.

Variabel dengan prefix `NEXT_PUBLIC_` dikirim ke browser dan harus dianggap publik. Jangan menaruh password, token, private key, connection string database, atau secret lain pada variabel tersebut. Secret server harus dibaca dari environment server atau secret manager deployment, bukan dari Client Component.

Contoh pola untuk environment lokal:

```dotenv
DATABASE_URL="..."
FEATURE_API_URL="..."
```

Contoh di atas hanya menggambarkan format konfigurasi; keduanya bukan variabel yang diperlukan oleh template saat ini. Jangan menyalin nilai placeholder ke production dan jangan menambahkan secret ke `.env.example`.

## Commands

Command yang tersedia di `package.json` adalah:

```bash
npm run dev
npm run lint
npm run build
npm run start
```

Alur verifikasi lokal yang disarankan:

```bash
npm run lint
npm run build
```

Jalankan `npm run start` hanya setelah `npm run build` berhasil. Untuk menguji perubahan terhadap hasil build yang lebih mendekati production, gunakan `npm run start` pada terminal terpisah dari `npm run dev`.

## Monitoring

Aplikasi menyediakan tiga probe operasional di `src/app/api/health/`. Semuanya publik tanpa autentikasi karena load balancer, uptime monitor, dan scraper melakukan polling dari luar aplikasi; response hanya berisi boolean dan angka agregat, tidak pernah nilai environment, path file, atau pesan exception. Helper bersama ada di `src/lib/health.ts`.

Jalankan server lebih dulu (`npm run dev` atau `npm run start`), lalu:

```bash
# Health check agregat: 200 saat ok, 503 saat degraded
curl -i http://localhost:3000/api/health

# Liveness: selalu 200 selama proses hidup
curl -i http://localhost:3000/api/health/live

# Readiness: 503 bila invariant lokal gagal
curl -i http://localhost:3000/api/health/ready

# Metrik Prometheus: 404 kecuali HEALTH_METRICS_ENABLED=true
HEALTH_METRICS_ENABLED=true npm run dev
curl -i http://localhost:3000/api/health/metrics

# security.txt (RFC 9116), dilayani sebagai aset statis
curl -i http://localhost:3000/.well-known/security.txt
```

`/api/health`, `/api/health/live`, dan `/api/health/ready` selalu mengirim `Cache-Control: no-store`. `HEAD` tersedia pada ketiganya dan mengembalikan status yang sama tanpa body.

`/api/health/metrics` mati secara default. Aktifkan dengan `HEALTH_METRICS_ENABLED=true` di `.env.local` bila memang perlu discrap; jangan mengubah default tersebut pada deployment publik. Angka metrik saat ini berasal dari store in-memory (`src/features/observability/`) dan hilang setiap restart, jadi jangan menjadikannya sumber alerting produksi.

`NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` hanya wajib ada di production multi-instance, jadi hanya di environment production `serverActionsEncryptionKeyPresent` memengaruhi status readiness. Nilai kuncinya tidak pernah dikembalikan; endpoint hanya melaporkan `true` atau `false`.

`public/.well-known/security.txt` masih memakai kontak placeholder. Salin nilainya dari `securityTxtConfig` di `src/config/site.ts` dan ganti dengan kontak keamanan Anda sendiri sebelum deploy, lalu perbarui juga `Expires` satu tahun ke depan.

## Develop Next.js App Router

Gunakan App Router di `src/app/` untuk route, layout, metadata, dan state boundary seperti loading, error, dan not found. Server Component menjadi default. Tambahkan directive `"use client"` hanya pada komponen yang benar-benar membutuhkan state, event handler, browser API, atau dependency client-only.

```tsx
export default function HomePage() {
  return <main>Dashboard</main>
}
```

Batas client component harus tetap kecil. Ambil data awal di server bila memungkinkan, lalu kirim hanya data serializable ke Client Component. Jangan menjadikan `src/app/` sebagai tempat untuk logika domain atau query database; tempatkan service layer di struktur fitur yang disepakati ketika fitur tersebut dibuat.

## Menambah Komponen shadcn

Project sudah memiliki konfigurasi shadcn di `components.json`, tetapi belum memiliki komponen UI yang di-generate. Jika sebuah fitur membutuhkan komponen shadcn, gunakan command generator sesuai dokumentasi versi yang dipakai tim:

```bash
npx shadcn@latest add <nama-komponen>
```

Jika command memerlukan inisialisasi ulang atau migrasi konfigurasi, tinjau `components.json` dan dokumentasi shadcn terlebih dahulu. Komponen hasil generate ditempatkan di `src/components/ui/`. Jangan mengedit hasil generate secara langsung jika dokumentasi tim melarang perubahan manual; buat wrapper atau komposisi di `src/components/custom/` untuk variasi aplikasi.

## Menambahkan Fitur

Jangan menganggap struktur berikut sudah ada di template karena struktur tersebut merupakan rencana arsitektur. Buat folder yang diperlukan ketika fitur pertama benar-benar diimplementasikan:

```text
src/
├── app/                 # route, layouts, metadata, loading, dan error
├── components/
│   ├── ui/              # komponen shadcn hasil generate, jika digunakan
│   ├── layout/          # shell, sidebar, topbar, dan navigasi
│   └── custom/          # komposisi komponen aplikasi
├── config/              # konstanta aplikasi
├── features/<fitur>/    # service, komponen, schema, dan test domain
├── hooks/               # reusable hooks
└── lib/                 # utilitas murni tanpa React
```

Fondasi autentikasi ada di repo tetapi **diparkir** untuk static export: `src/features/auth/session.ts` (cookie session in-memory), `src/features/auth/actions.ts` (`loginAction` + `logoutAction`, tanpa pemanggil di app tree), `src/features/auth/require-page-session.ts` (guard halaman), dan guard `(dashboard)/layout.tsx` yang sudah dicabut. Untuk menyalakannya kembali: pasang host Node, hapus `output: "export"` dari `next.config.ts`, lalu wire `loginAction`/`logoutAction` di `login-form.tsx` dan `user-menu.tsx` serta `requirePageSession()` di layout — instruksi lengkapnya ada di komentar atas `actions.ts`. Setelah itu lanjutkan dengan mengganti isi `session.ts` pembacaan record dari store nyata plus verifikasi signature token dengan kunci server; kontrak tiga fungsi ekspornya (`createSession`, `readSession`, `destroySession`) sengaja dibiarkan supaya `rbac.ts` tidak perlu ikut berubah. Untuk fitur yang membutuhkan database, pilih ORM atau driver, definisikan schema dan migrasi, konfigurasi environment server, dan letakkan akses database di service layer. Jangan mendokumentasikan auth atau database sebagai fitur production sebelum implementasi dan validasinya selesai — session mock bukan session production.

Ikuti standar arsitektur, konvensi, keamanan, dan performa di:

- `docs/ARCHITECTURE.md`
- `docs/CONVENTIONS.md`
- `docs/SECURITY.md`
- `docs/PERFORMANCE.md`

## Checklist Setup

- [ ] Node.js minimal `20.9.0` terpasang.
- [ ] npm yang digunakan dapat mengakses registry dan kompatibel dengan lockfile.
- [ ] `npm install` atau `npm ci` selesai tanpa error.
- [ ] `.env.local` tidak mengandung secret yang akan di-commit.
- [ ] Environment variable baru didokumentasikan di `.env.example` bila diperlukan.
- [ ] `npm run lint` berhasil.
- [ ] `npm run build` berhasil.
- [ ] Route dan fitur baru sesuai arsitektur serta standar keamanan yang berlaku.

## Solusi Masalah

### Port `3000` sudah digunakan

Jalankan development server dengan port lain:

```bash
npm run dev -- --port 3001
```

Lalu buka `http://localhost:3001`.

### Dependency tidak sinkron dengan lockfile

Untuk instalasi bersih dan reproducible:

```bash
npm ci
```

Jika `npm ci` gagal karena lockfile tidak sinkron, jangan mengabaikannya. Tinjau perubahan dependency yang memang diperlukan, perbarui lockfile dengan `npm install`, dan periksa diff sebelum commit.

### Environment variable tidak terbaca

Pastikan file bernama `.env.local` berada di root project, bukan di dalam `src/`. Restart development server setelah mengubah environment variable. Untuk nilai server-only, jangan gunakan prefix `NEXT_PUBLIC_`; nilai tersebut tidak boleh dianggap rahasia.
