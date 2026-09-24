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

### 3.1 Struktur aktual saat ini

Repository masih berupa template awal, sehingga kode aplikasi yang benar-benar ada saat penulisan dokumen ini adalah:

```text
.
├── docs/
│   ├── ARCHITECTURE.md       # panduan ini
│   ├── CONVENTIONS.md        # naming dan aturan implementasi
│   ├── PERFORMANCE.md        # budget dan aturan performa
│   ├── SECURITY.md           # kontrol keamanan detail
│   └── SETUP.md              # prasyarat, environment, dan commands
├── public/
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg            # aset statik yang dapat diakses melalui URL publik
├── src/
│   └── app/
│       ├── favicon.ico       # metadata aset App Router
│       ├── globals.css       # global stylesheet dan token
│       ├── layout.tsx        # root layout, fonts, dan metadata
│       └── page.tsx          # route /
├── components.json           # konfigurasi generator shadcn
├── eslint.config.mjs         # konfigurasi lint
├── next.config.ts            # konfigurasi Next.js dan security headers
├── package.json
├── postcss.config.mjs        # pipeline PostCSS
└── tsconfig.json             # TypeScript dan alias @/*
```

Folder di bawah ini adalah struktur target yang belum seluruhnya dibuat. Dokumentasi tidak boleh menyatakan folder tersebut sudah terimplementasi.

### 3.2 Struktur target

```text
src/
├── app/                       # entry point routing dan framework
│   ├── (public)/              # segment route publik; parentheses tidak masuk URL
│   ├── (auth)/                # login, register, reset password
│   ├── (dashboard)/           # shell dashboard dan route privat
│   │   ├── layout.tsx         # shell, sidebar, topbar, guard server
│   │   ├── loading.tsx        # fallback saat seluruh segment dimuat
│   │   ├── error.tsx          # error boundary segment dashboard
│   │   ├── not-found.tsx      # fallback 404 dalam segment
│   │   ├── page.tsx           # dashboard overview
│   │   └── users/
│   │       ├── page.tsx       # list users
│   │       ├── loading.tsx
│   │       ├── error.tsx
│   │       ├── [userId]/      # params dinamis selalu untrusted
│   │       │   ├── page.tsx
│   │       │   ├── not-found.tsx
│   │       │   └── loading.tsx
│   │       └── actions.ts     # Server Actions segment/user
│   ├── api/                   # Route Handler untuk kontrak HTTP eksplisit
│   │   └── health/route.ts
│   ├── favicon.ico
│   ├── global-error.tsx       # kegagalan root layout; harus punya html/body
│   ├── globals.css
│   ├── layout.tsx             # document root, providers, metadata
│   ├── not-found.tsx          # fallback root 404
│   └── page.tsx               # landing page
├── components/
│   ├── custom/                # komposisi aplikasi di atas komponen UI
│   ├── layout/                # sidebar, topbar, navigation shell
│   └── ui/                    # komponen shadcn hasil generator
├── config/                    # konstanta navigasi, site, dan environment non-secret
├── features/
│   └── <fitur>/
│       ├── components/        # komponen khusus domain
│       ├── hooks/             # hook khusus domain
│       ├── schemas.ts         # validator input/output boundary
│       ├── service.ts         # server-only DAL untuk use case domain
│       ├── service.test.ts
│       └── types.ts           # tipe internal/DTO yang aman
├── hooks/                     # hook React generik yang reusable
├── proxy.ts                   # opsional; sejajar dengan app/ karena project memakai src/
└── lib/
    ├── auth/                  # konfigurasi library auth dan helper server
    ├── db/                    # koneksi/query adapter; tidak diimpor client
    ├── env.ts                 # validasi environment server
    ├── logger.ts              # logger terstruktur server
    ├── security/              # authorization/RBAC/ownership helpers
    └── utils.ts               # utilitas murni tanpa React
```

**Seluruh pohon pada 3.2 adalah struktur target yang belum dibuat.** Komentar, guard, feature, dan folder di dalamnya adalah rancangan implementasi, bukan klaim bahwa file tersebut sudah tersedia. Hanya struktur pada 3.1 yang menggambarkan kondisi repository saat ini.

Struktur aktual dapat lebih sederhana sampai ada kebutuhan. Tambahkan folder hanya ketika memiliki tanggung jawab yang jelas; jangan membuat direktori kosong sebagai arsitektur teoretis.

### 3.3 Tanggung jawab folder

| Area | Boleh | Tidak boleh |
| --- | --- | --- |
| `app/` | Routing, layout, metadata, Server Action entry, Route Handler, special files | Menulis query kompleks langsung di komponen atau membocorkan logic domain ke komponen |
| `components/ui/` | Primitive shadcn yang dihasilkan generator | Edit manual dan business logic |
| `components/custom/` | Komposisi, variasi visual, adapter client-only | Akses database langsung |
| `components/layout/` | Shell dan navigasi lintas halaman | Mengambil semua data dashboard secara prematur tanpa alasan |
| `features/<fitur>/` | Use case, schema, service, DTO, komponen, dan test domain | Ketergantungan siklik antar fitur |
| `lib/db/` | Koneksi, ORM adapter, transaksi | Diekspor ke client bundle |
| `lib/security/` | Auth context, RBAC, ownership policy | Menyimpan secret di source |
| `lib/utils.ts` | Fungsi murni lintas fitur | Query, I/O, secret access, atau state global mutable |
| `hooks/` | Reusable client behavior | Akses database atau server-only module |

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
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`.

Header adalah defense tambahan, bukan pengganti escaping, auth, atau validasi. CSP belum aktif pada template dan harus ditambahkan setelah kebutuhan production diketahui serta diuji.

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
