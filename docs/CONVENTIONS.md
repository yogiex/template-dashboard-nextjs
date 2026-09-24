# Conventions

Dokumen ini menetapkan konvensi penulisan kode untuk Next.js Dashboard Template. Struktur yang dijelaskan di bawah adalah arah arsitektur untuk fitur baru; repository saat ini baru memiliki route dasar di `src/app/` dan belum memiliki database, autentikasi, service layer, atau komponen UI shadcn yang dapat dianggap sudah tersedia.

## Naming

- Folder komponen dan fitur umumnya menggunakan `kebab-case`, misalnya `user-menu/` dan `user-management/`.
- Komponen React dan filename komponen menggunakan `PascalCase`, misalnya `UserMenu.tsx`.
- Hook harus bernama setelah fungsi yang di-call, misalnya `useDebounce`, bukan `use-debounce`. File hook biasanya mengikuti nama hook dengan `PascalCase`, misalnya `useDebounce.ts`.
- Util, variabel lokal, function, dan property object menggunakan `camelCase`, misalnya `formatUserName` dan `isLoading`.
- Konstanta global atau konstanta konfigurasi dapat menggunakan `UPPER_SNAKE_CASE`, misalnya `DEFAULT_PAGE_SIZE`. Konstanta lokal juga boleh memakai `camelCase` apabila lebih konsisten dengan konteksnya.
- Route segment dan folder route menggunakan nama lowercase; gunakan `kebab-case` bila nama memiliki lebih dari satu kata, misalnya `user-settings/`.
- Nama file dan folder menggunakan bahasa Inggris dan konsisten dalam import, route, dan dokumentasi.
- Hindari nama yang terlalu umum atau tidak menjelaskan intent, seperti `utils.ts` atau `data.ts`, jika nama yang lebih spesifik dapat memperjelas tanggung jawab file.

## Komponen

- Repository dikonfigurasi untuk shadcn melalui `components.json`, dengan alias komponen di `@/components`. Komponen shadcn yang sudah di-generate di `src/components/ui/` sebaiknya diperlakukan sebagai kode upstream: hindari perubahan manual yang tidak diperlukan dan buat wrapper atau komposisi di `src/components/custom/` untuk variasi aplikasi. Jika folder tersebut belum ada, tidak perlu membuatnya hanya untuk dokumentasi atau perubahan kecil.
- Server Component adalah default pada App Router. Tambahkan `"use client"` hanya ketika komponen benar-benar membutuhkan state, event handler, browser API, form interaktif, optimistic UI, atau client-only dependency.
- Optimalkan batas Client Component. Letakkan `"use client"` pada komponen daun yang membutuhkan interaksi, bukan otomatis pada layout besar. Komponen yang hanya menerima `children` dan merender struktur biasanya tetap dapat menjadi Server Component.
- Props komponen menggunakan interface bernama `<NamaKomponen>Props`, misalnya `UserMenuProps` atau `DashboardLayoutProps`. Gunakan `type` bila tipe non-primitive atau union lebih jelas; primitive tunggal tidak memerlukan interface baru.
- Client Component hanya menerima data serializable dari Server Component. Jangan mengirim secret, token, object database, atau callback server yang tidak dapat diserialisasi.
- Komponen presentasional tidak melakukan query database atau menentukan access control secara langsung. Komponen menerima data dan action yang sudah dipercaya, sedangkan query, autentikasi, dan otorisasi ditangani di boundary server.
- Validasi input di boundary server, bukan hanya di UI. Validasi client dapat digunakan untuk memberikan feedback cepat, tetapi tidak menggantikan validasi server.
- Jangan menggunakan `dangerouslySetInnerHTML` tanpa sanitasi yang ketat dan review keamanan. Utamakan `children`, React element, atau renderer yang aman.
- Gunakan `next/link` untuk navigasi internal dan `next/image` untuk gambar yang dioptimasi Next.js. Untuk URL eksternal, pastikan konfigurasi image yang diperlukan dan selalu berikan `alt` yang sesuai.
- Gunakan elemen HTML semantik yang sesuai. Pastikan interaksi keyboard, fokus, label form, dan aksesibilitas tetap bekerja pada komponen interaktif.

## Styling

- Gunakan Tailwind CSS dan token/theme yang sudah dikonfigurasi di `src/app/globals.css`.
- Repository memakai Tailwind CSS v4 dengan konfigurasi melalui `@import "tailwindcss"` dan blok `@theme`; tidak ada `tailwind.config.js` yang aktif saat ini.
- Gunakan class utilities dan semantic token yang sudah ada dalam codebase sebelum menambahkan CSS baru. Jangan membuat sistem warna atau spacing kedua yang tidak terdokumentasi.
- Jangan menyimpan nilai visual yang reusable sebagai magic number di banyak komponen. Gunakan token CSS, konstanta yang bernama jelas, atau komponen komposisi yang sesuai.
- Untuk warna, prefer token semantic seperti `background` dan `foreground` ketika token tersebut tersedia. Prefix `NEXT_PUBLIC_` hanya berkaitan dengan environment variable yang dikirim ke browser, bukan styling.
- Pastikan tampilan memiliki state fokus, disabled, loading, hover, empty, dan error yang jelas sesuai konteks komponen.
- Jangan menambahkan inline style untuk token visual yang dapat diekspresikan melalui Tailwind atau CSS variable. Inline style tetap dapat digunakan untuk nilai dinamis yang tidak diketahui saat build.
- Jangan mengubah style global hanya untuk menyelesaikan satu komponen. Gunakan variant, wrapper, atau class component yang terisolasi bila perubahan tersebut lokal.

## File Placement

Struktur target untuk aplikasi yang berkembang adalah:

```text
src/
├── app/                 # route, layout, metadata, loading, dan error
├── components/
│   ├── ui/              # komponen shadcn hasil generate
│   ├── layout/          # shell, sidebar, topbar, dan navigasi
│   └── custom/          # komposisi dan variasi aplikasi
├── config/              # konstanta aplikasi
├── features/<fitur>/    # service, komponen, schema, dan test domain
├── hooks/               # reusable hooks
└── lib/                 # utilitas murni tanpa React
```

- `src/app/` — route, layout, `loading`, `error`, `not-found`, route handler, dan metadata Next.js. Route segment hanya dibuat ketika memang membutuhkan route.
- `src/components/ui/` — lokasi komponen shadcn yang di-generate. Komponen di sini tidak boleh dianggap sebagai komposisi business logic.
- `src/components/layout/` — sidebar, topbar, shell, dan struktur navigasi lintas halaman.
- `src/components/custom/` — komposisi shadcn dan variasi milik aplikasi. Letakkan variasi yang menggunakan domain atau state aplikasi di sini atau di feature terkait, bukan di `ui/`.
- `src/lib/` — utilitas murni tanpa React, seperti formatter, konversi, dan helper yang tidak memiliki side effect.
- `src/features/<fitur>/` — logic, service, schema, komponen, dan test spesifik domain. Feature sebaiknya tetap terisolasi agar tidak menyebabkan ketergantungan silang yang tidak perlu.
- `src/config/` — konstanta aplikasi seperti navigasi, site config, dan opsi yang dipakai lintas fitur.
- `src/hooks/` — hook reusable yang tidak spesifik pada satu route saja.
- `docs/` — dokumentasi standar, setup, dan keputusan arsitektur.

Jangan membuat folder kosong hanya untuk memenuhi struktur di atas. Struktur aktual repository saat ini berada di bawah `src/app/`, `public/`, dan `docs/`; folder fitur dan service dibuat ketika kebutuhan nyata muncul.

## Data dan API

- Akses database, jika ditambahkan, harus melalui service layer pada `src/features/<fitur>/service.ts` atau struktur service yang disepakati untuk fitur tersebut. Jangan melakukan query langsung dari komponen presentasional atau client component.
- Gunakan parameterized query atau ORM. Jangan menggabungkan input user ke SQL atau URL secara manual.
- `params`, `searchParams`, body request, form data, cookie, dan data dari sumber eksternal dianggap tidak tepercaya. Pada App Router modern, `params` dan `searchParams` umumnya Promise dan diakses dengan `await` pada component async.
- Validasi semua boundary input menggunakan Zod atau validator yang disetujui. Validasi mencakup body, form, route params, search params, cookie, dan hasil fetch bila data tersebut memengaruhi aplikasi.
- Batasi panjang, format, enum, dan nilai yang diperbolehkan. Jangan hanya mengandalkan validasi client atau regex tanpa konteks.
- Jangan mengembalikan detail internal error, stack trace, query, password, atau token kepada client. Tampilkan pesan generik dan catat detail yang aman di server.
- Middleware atau proxy hanya melakukan guard awal. Verifikasi session, role, permission, dan kepemilikan resource tetap dilakukan di Server Action, Route Handler, atau service pada server.
- Jangan memakai input user untuk membentuk URL, redirect, atau nama file tanpa allowlist. Batasi outbound request untuk mencegah SSRF dan gunakan timeout serta batas ukuran response yang wajar.
- Client Component menerima data serializable dari Server Component. Jangan kirim secret atau data internal yang tidak diperlukan.
- Gunakan cache dan revalidation Next.js secara sadar. Jangan menandai data pengguna sebagai shared cache jika datanya spesifik pengguna.

## TypeScript

- Repository menggunakan TypeScript dengan `strict: true`, `isolatedModules`, dan path alias `@/*` yang menunjuk ke `src/*`.
- Infer types dari library dan definisi yang tersedia. Tambahkan type eksplisit pada boundary publik, service, dan komponen yang exporting API.
- Gunakan `import type` untuk type-only import agar intent jelas dan runtime import yang tidak diperlukan tidak terbawa.
- Jangan menggunakan `any` sebagai default. Pilih `unknown` pada input yang belum divalidasi, lalu persempit dengan type guard atau schema validator.
- Jangan menambahkan type assertion hanya untuk membuat compiler lulus. Assertion harus dibenarkan oleh validasi, type guard, atau batas integrasi yang memang sudah diketahui.
- Gunakan union type atau discriminated union bila state memiliki beberapa kondisi yang tidak boleh bercampur, misalnya `{ status: "idle" } | { status: "loading" } | { status: "error"; message: string }`.
- Untuk props event handler, gunakan tipe React yang sesuai dan jangan menduplikasi definisi event secara manual jika tipe resmi sudah tersedia.
- Jangan menggunakan `enum` untuk data runtime yang sering berubah; gunakan union type atau object constant. Pilih enum hanya jika penggunaannya jelas dan membutuhkan pola enum yang kompatibel dengan codebase.
- Pastikan function yang dipanggil dari server tidak menerima client-only object atau logic secara tidak sengaja. Gunakan `server-only` bila proyek membutuhkan pemisahan runtime.

## Server Component, Client Component, dan Route

- Server Component menjadi default. Gunakannya untuk pengambilan data awal, layout, konten statis, metadata, dan kode server-only.
- Gunakan Client Component hanya untuk state lokal, event handler, browser API, form interaktif, optimistic UI, chart, editor, drag-and-drop, atau integrasi client-only.
- Jangan menambahkan `"use client"` pada `src/app/layout.tsx` hanya untuk kebutuhan satu child. Pecah Client Component ke leaf interaktif.
- Halaman dan layout berfungsi sebagai orchestrator; komponen menerima data atau aksi melalui props.
- Letakkan `loading.tsx`, `error.tsx`, dan `not-found.tsx` pada segment route yang membutuhkan fallback. Gunakan `Suspense` di sekitar boundary yang lambat bila diperlukan.
- Metadata route didefinisikan melalui API metadata Next.js, bukan dengan membuat `<head>` manual.
- Route handler dan Server Action melakukan validasi, otorisasi, dan pemanggilan service pada server sebelum menyentuh data.

## Git

- Gunakan Conventional Commits: `feat`, `fix`, `chore`, `docs`, `refactor`, `perf`, atau tipe lain yang disepakati tim.
- Format commit: `type(scope): description`, misalnya `docs(security): add security checklist`.
- Satu commit memiliki satu tujuan. Jangan menggabungkan perubahan tidak terkait hanya karena berada di branch yang sama.
- Branch fitur: `feat/nama-fitur`; branch perbaikan: `fix/nama-bug`. Ikuti naming yang sudah digunakan repository atau tim bila ada konflik.
- Jangan commit secret, file `.env.local`, generated output, atau dependency yang belum ditentukan. `package-lock.json` sebaiknya di-commit sebagai bagian dari perubahan dependency.
- Jangan menggunakan `--no-verify` untuk melewati hook, kecuali instruksi tim menyatakannya secara eksplisit.

## Review Checklist

- Apakah perubahan mengikuti struktur folder dan naming di dokumen ini?
- Apakah input eksternal tervalidasi dan, jika ada, akses database tetap melalui service layer?
- Apakah client boundary seminimal mungkin dan data yang dikirim ke client serializable?
- Apakah Server Action, Route Handler, atau query data sensitif melakukan pemeriksaan auth dan otorisasi di server?
- Apakah error production tidak membocorkan detail internal?
- Apakah komponen memiliki state fokus, disabled, loading, empty, dan error yang sesuai?
- Apakah perubahan menggunakan Tailwind/token yang sudah dikonfigurasi tanpa magic number berulang?
- Apakah test, dokumentasi, atau pembaruan `.env.example` diperlukan?
- Apakah `npm run lint` dan build atau typecheck yang relevan berhasil dijalankan?
- Apakah tidak ada secret atau data sensitif dalam source, log, response, screenshot, dan dokumentasi?
