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

Saat ini `.env.example` tidak memiliki variabel yang wajib diisi. Template belum menggunakan environment variable untuk autentikasi atau database, sehingga dashboard dapat dijalankan tanpa menambahkan konfigurasi rahasia terlebih dahulu.

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

Untuk fitur yang membutuhkan autentikasi, tambahkan library auth yang telah dipilih dan terdokumentasikan, lalu implementasikan session, guard route, serta pemeriksaan authorization di setiap server boundary yang sensitif. Untuk fitur yang membutuhkan database, pilih ORM atau driver, definisikan schema dan migrasi, konfigurasi environment server, dan letakkan akses database di service layer. Jangan mendokumentasikan auth atau database sebagai fitur yang sudah tersedia sebelum implementasi dan validasinya selesai.

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
