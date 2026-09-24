# Panduan Performance Next.js

Dokumen ini adalah standar kerja performa untuk dashboard berbasis Next.js App Router. Fokusnya adalah pengalaman pengguna, waktu muat, ukuran JavaScript, efisiensi server, asset, loading state, serta deteksi regresi yang konsisten.

## 1. Prinsip dan prioritas

Gunakan urutan prioritas berikut ketika terjadi konflik:

1. Pastikan aplikasi benar, aman, aksesibel, dan dapat digunakan.
2. Jaga LCP, INP, CLS, serta responsivitas pada perangkat target.
3. Kurangi JavaScript, waktu parsing, dan pekerjaan di main thread.
4. Optimalkan query, rendering server, cache, dan transfer data.
5. Hapus resource, request, dan komponen yang tidak diperlukan.

Optimasi tidak boleh mengorbankan kebenaran data, keamanan, atau navigasi. Data dashboard boleh basi hanya jika kebijakan kesegaran dan staleness telah disetujui.

## 2. Budget performa

### 2.1 Target utama

Target berikut berlaku untuk route dashboard dalam build produksi dengan cache cold, kecuali dinyatakan lain.

| Metrik | Target | Catatan |
| --- | ---: | --- |
| LCP | `< 2,5 detik` | Gunakan p75 untuk data RUM. |
| INP | `< 200 ms` | Gunakan p75 untuk data RUM. |
| CLS | `< 0,10` | Gunakan p75 untuk data RUM. |
| FCP | `< 1,8 detik` | Target diagnosis tambahan. |
| TTFB | `< 800 ms` | Target server, bukan pengganti RUM. |
| JavaScript initial route | `< 200 KB gzip` | Gabungan JavaScript untuk first load. |
| Incremental client chunk | `< 50 KB gzip` | Target per chunk navigasi atau interaksi. |
| Gambar hero di atas fold | `< 200 KB` | Sesuaikan dengan kualitas visual. |
| Font per family | `< 100 KB` | Optimalkan subset, format, dan weight. |
| Render/update list utama | `< 100 ms` | Target lokal setelah profiling. |

Budget adalah guardrail, bukan alasan untuk mengurangi kebenaran atau kegunaan data. Jika budget terlampaui, dokumentasikan route, nilai sebelum dan sesudah, kondisi pengukuran, dampak pengguna, alasan, persetujuan, dan rencana optimasi.

### 2.2 Komponen budget

Pisahkan pengukuran menjadi:

- **Initial JS**: JavaScript untuk kunjungan langsung pertama.
- **Route JS**: JavaScript tambahan ketika route dibuka.
- **Shared JS**: Bundle bersama; penggunaan bersama mengurangi duplikasi, tetapi tidak menghapus responsibility bundle.
- **Lazy chunk**: Bundle yang dimuat setelah klik, navigasi, scroll, atau masuk viewport.
- **CSS, font, gambar, dan media**: Resource yang memengaruhi render awal.

Gunakan ukuran transfer gzip atau Brotli sesuai hosting. Ukuran file dan ukuran transfer dapat menunjukkan masalah yang berbeda. Terapkan budget per route, bukan hanya total repository.

### 2.3 Release gate

Sebelum merge atau release:

```bash
npm run lint
npm run build
```

Bandingkan First Load JS dan route affected dengan baseline. Untuk perubahan UI besar, jalankan pengukuran production Lighthouse atau tool ekuivalen. Jangan menyimpulkan bundle dari development server karena optimasi build dapat berbeda.

## 3. RSC dan batas Client Component

### 3.1 Server Component sebagai default

Pada App Router, komponen tanpa `"use client"` adalah Server Component. Gunakan Server Component untuk:

- mengambil data dari database, ORM, API, atau sumber server;
- mengakses kredensial, token, dan konfigurasi privat;
- membuat markup statis, tabel read-only, layout, dan heading;
- formatting, parsing, syntax highlighting, atau komputasi yang tidak membutuhkan browser.

Server fetching mengurangi JavaScript browser, menjaga secret di server, dan memungkinkan HTML serta RSC Payload dikirim langsung. Jangan menjadikan komponen client hanya karena komponen tersebut melakukan `async` fetch.

### 3.2 Kapan diperlukan Client Component

Gunakan Client Component untuk:

- state dan event handler seperti `onClick` dan `onChange`;
- `useState`, `useEffect`, `useReducer`, dan lifecycle React;
- browser API seperti `window`, `document`, `localStorage`, dan `navigator`;
- library yang hanya berjalan di browser;
- optimistic UI, polling, dan client navigation state yang memang diperlukan.

`"use client"` adalah batas modul. Import dan komponen yang dirender langsung oleh file tersebut dapat masuk ke client bundle. Jangan memasang directive pada layout, provider, atau subtree besar hanya untuk satu interaksi kecil.

### 3.3 Pecah interaksi pada leaf

```tsx
import SearchBox from "./search-box";

export default async function DashboardPage() {
  const summary = await getDashboardSummary();

  return (
    <main>
      <h1>Dashboard</h1>
      <SearchBox />
      <Summary summary={summary} />
    </main>
  );
}
```

```tsx
"use client";

import { useState } from "react";

export function SearchBox() {
  const [value, setValue] = useState("");

  return (
    <input
      value={value}
      onChange={(event) => setValue(event.currentTarget.value)}
      placeholder="Cari data"
    />
  );
}
```

Untuk client component yang hanya memerlukan shell interaktif, teruskan Server Component melalui `children` sehingga subtree server tidak menjadi client:

```tsx
"use client";

export function Modal({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}
```

```tsx
<Modal>
  <ServerRenderedContent />
</Modal>
```

### 3.4 Props lintas boundary

Props lintas Client Component harus serializable. Kirim hanya field yang digunakan client dan lakukan selection serta shaping di server. Jangan mengirim function, token, database handle, class instance, atau seluruh entity database. Nilai `NEXT_PUBLIC_*` menjadi bagian bundle publik dan tidak boleh digunakan untuk secret.

### 3.5 Provider, context, dan review boundary

Theme, session, dan toast provider dapat menjadi Client Component, tetapi letakkan sedekat mungkin dengan subtree yang membutuhkannya. Jangan menjadikan seluruh root layout client hanya untuk satu provider kecil.

Periksa pada setiap review:

- apakah boundary dapat dipindahkan ke leaf;
- apakah hook browser membuat subtree server menjadi client;
- apakah library yang diimport benar-benar client-only;
- apakah context menyebabkan render besar;
- apakah props lintas boundary terlalu besar;
- apakah state global benar-benar diperlukan.

## 4. Data fetching

### 4.1 Ambil data di server

Ambil data sedekat mungkin dengan sumbernya. Gunakan query database langsung di server bila memungkinkan. Jangan membuat request browser ke API yang hanya mengembalikan data yang sudah dapat diakses server. Tetap lakukan authorization di server untuk setiap sumber data.

Untuk data independen, jalankan I/O secara paralel:

```tsx
const [summary, activity, alerts] = await Promise.all([
  getSummary(),
  getRecentActivity(),
  getAlerts(),
]);
```

Gunakan `Promise.allSettled` jika satu bagian boleh gagal tanpa menggagalkan bagian lain. Jangan mengawait request independen secara sequential. Jika B membutuhkan hasil A, hubungan itu adalah dependency; gunakan batch atau API agregat bila mengurangi round trip.

### 4.2 Hindari waterfall

Waterfall terjadi ketika request kedua baru dimulai setelah request pertama selesai. Untuk mengurangi waterfall:

1. kelompokkan data independen dalam satu query atau request;
2. mulai semua promise independen sebelum melakukan `await` penting;
3. letakkan fetching dekat dengan bagian UI yang membutuhkannya;
4. gunakan cache hanya bila freshness dan scope-nya aman;
5. stream bagian lambat tanpa memblokir shell penting.

Untuk database atau ORM, `fetch` yang identik dalam satu React render di-memoisasi Next.js. Accessor non-`fetch` dapat memakai React `cache` untuk deduplikasi dalam satu render, tetapi itu bukan cache lintas request. Preload data dengan memanggil fungsi accessor tanpa `await` sebelum pekerjaan blocking, lalu panggil fungsi yang sama di komponen konsumen.

### 4.3 Batasi payload

- select hanya kolom yang diperlukan;
- paginasikan di server dan database;
- gunakan default page size yang aman;
- batasi filter, sort, dan aggregate;
- kirim tanggal dalam format ringkas;
- hindari metadata internal, relasi, dan HTML besar;
- agregasikan chart di server, misalnya bucket per jam;
- gunakan format kompak hanya bila pengukuran menunjukkan perlu.

Untuk pencarian, gunakan debounce atau abort request lama. Pastikan pagination berada di URL bila state tersebut perlu dibagikan atau dipulihkan saat navigasi.

### 4.4 Client fetching hanya bila perlu

Client fetching relevan untuk polling, refresh setelah action, optimistic update, infinite scroll, dan filter yang responsif. SWR atau TanStack Query bukan default untuk seluruh request dan tidak terpasang di repository ini; package tersebut hanya direkomendasikan bila kebutuhan client fetching terukur. Jika memilih salah satu, batasi query aktif, atur stale time, abort query yang tidak relevan, dan jangan mengambil ulang data server tanpa alasan.

### 4.5 Streaming dan Suspense

```tsx
import { Suspense } from "react";

export default function Page() {
  return (
    <main>
      <DashboardHeader />
      <Suspense fallback={<ActivitySkeleton />}>
        <Activity />
      </Suspense>
    </main>
  );
}
```

Gunakan `<Suspense>` untuk data uncached yang lambat agar bagian penting dapat tampil lebih dahulu. `loading.tsx` dapat membungkus seluruh route segment, tetapi boundary dekat dengan data lambat biasanya lebih baik. Hindari boundary jika hanya menambah kompleksitas tanpa memperbaiki loading.

## 5. Caching dan revalidasi

### 5.1 Pilih strategi berdasarkan data

| Jenis data | Strategi awal |
| --- | --- |
| Konten publik yang jarang berubah | Cache dengan lifetime dan invalidasi jelas. |
| Konfigurasi atau build asset | Baca sekali di server atau cache sangat panjang. |
| Data dashboard yang boleh basi | Cache pendek dengan revalidasi. |
| Data personal | Jangan bagikan antar-user; gunakan cache privat bila aman. |
| Saldo, harga, atau status mutation | Fresh atau invalidasi segera setelah mutation. |
| Polling live | Client fetching dengan interval yang sesuai. |

Cache yang salah dapat menampilkan data yang keliru, membocorkan antar-user, atau menghasilkan dashboard terlalu basi. Cache key harus memasukkan semua input yang memengaruhi hasil.

### 5.2 Model yang aktif di repository ini

`cacheComponents` **tidak aktif** di `next.config.ts`. Repository memakai model caching sebelumnya Next.js 16:

- `fetch` tidak di-cache secara default;
- `fetch` dapat di-cache dengan `cache: "force-cache"` atau `next: { revalidate, tags }` bila sumber dan scope-nya aman;
- `unstable_cache` dapat digunakan untuk accessor non-`fetch` pada model lama;
- route segment `dynamic`, `revalidate`, dan `fetchCache` masih relevan pada model ini;
- jangan mengaktifkan `cacheComponents` hanya untuk performa tanpa migrasi route dan uji kebenaran data.

### 5.3 Jika mengaktifkan Cache Components

Aktifkan hanya sebagai migrasi yang diuji:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
};

export default nextConfig;
```

Dengan `cacheComponents: true` pada Next.js 16.3.6:

- data fetching menjadi dynamic secara default dan hanya di-cache pada scope `use cache`;
- `"use cache"` dapat dipakai pada async function atau komponen;
- `cacheLife()` menentukan lifetime dan stale behavior;
- `cacheTag()` mendukung invalidasi berbasis tag;
- PPR menjadi perilaku default; flag `experimental.ppr` dan `experimental_ppr` sudah dihapus;
- data uncached dapat di-stream dalam `<Suspense>`;
- `cookies()`, `headers()`, `params`, dan `searchParams` harus ditangani eksplisit, biasanya di subtree `<Suspense>`;
- route segment `dynamic`, `revalidate`, dan `fetchCache` perlu dimigrasikan;
- `generateStaticParams` harus mengembalikan minimal satu param dan `dynamicParams` tidak didukung;
- Cache Components membutuhkan Node.js runtime dan mengubah state navigation melalui React `<Activity>`.

Contoh cached function:

```ts
import { cacheLife, cacheTag } from "next/cache";

export async function getPublicReport() {
  "use cache";
  cacheLife("hours");
  cacheTag("report");

  return db.report.findMany({
    select: { id: true, name: true, updatedAt: true },
  });
}
```

Cache Components menggunakan penyimpanan in-memory secara default dan entry dapat hilang saat instance dimatikan. Jika diperlukan durability lintas instance, gunakan remote cache atau `cacheHandlers` yang sesuai.

### 5.4 Revalidasi dan mutation

Gunakan time-based revalidation untuk data yang boleh basi setelah TTL dan on-demand invalidasi setelah mutation:

- `revalidateTag("report", "max")` untuk stale-while-revalidate; pada Next.js 16.3.6, bentuk satu argumen sudah deprecated dan profile kedua wajib;
- `updateTag("report")` dari Server Action bila pengguna harus melihat hasil mutation segera;
- `revalidatePath("/dashboard")` hanya jika seluruh path memang perlu diinvalidasi;
- tag spesifik lebih aman daripada tag global.

Pastikan invalidasi HTML dan RSC Payload konsisten. Pada deployment multi-instance, default in-memory handler tidak mengoordinasikan invalidasi antar-instance. Gunakan shared cache, handler, dan mekanisme koordinasi bila konsistensi lintas instance diperlukan.

Urutan mutation yang aman:

1. validasi input di server;
2. otorisasi tindakan;
3. jalankan mutation pada sumber data;
4. invalidasi cache yang relevan;
5. perbarui UI secara optimistic bila rollback dan error state tersedia;
6. jangan menyatakan sukses sebelum server mengonfirmasi.

Optimistic update harus memiliki error state, rollback, dan perilaku retry yang jelas. Untuk data personal, boundary cache privat yang aman lebih baik daripada menyimpan objek pengguna di cache bersama.

## 6. Asset: image, SVG, dan media

### 6.1 Gunakan `next/image`

Untuk gambar lokal dan remote, gunakan `Image` dari `next/image`:

- local image yang static import umumnya memperoleh dimensi dan metadata otomatis;
- remote image memerlukan `width` dan `height`, atau `fill` dengan parent yang berukuran;
- `sizes` harus sesuai layout responsif;
- `alt` harus informatif atau kosong untuk gambar dekoratif;
- `remotePatterns` harus spesifik dan menggunakan HTTPS.

```tsx
<Image
  src={profile.avatarUrl}
  alt={`Foto ${profile.name}`}
  width={96}
  height={96}
  sizes="96px"
/>
```

### 6.2 Prioritas dan lazy loading

Pada Next.js 16, `priority` deprecated. Untuk gambar LCP yang benar-benar Above the Fold gunakan `preload` atau `fetchPriority="high"` sesuai kebutuhan. Jangan memberi prioritas tinggi ke semua gambar. Biarkan lazy loading bekerja untuk gambar di bawah fold.

Periksa aspect ratio, ukuran viewport, `sizes`, format modern, placeholder, `alt`, dan allowlist origin. Parent untuk `fill` harus memiliki ukuran yang ditentukan agar tidak terjadi layout shift.

### 6.3 SVG, icon, dan media berat

SVG besar dan ilustrasi dapat dirender sebagai Server Component bila tidak membutuhkan browser. Import icon secara spesifik dan hindari wildcard import yang menarik runtime besar.

Untuk video, audio, embed, dan iframe:

- jangan muat pada first load tanpa alasan;
- gunakan lazy load, poster, dan dimensi tetap;
- pertimbangkan konsumsi data, autoplay policy, dan mobile;
- batasi third-party script sampai benar-benar diperlukan.

## 7. Font

Gunakan `next/font/google` atau `next/font/local` agar font diproses dan di-self-host. Pilih subset yang sesuai, gunakan variable font bila tersedia, dan batasi weight. Jangan mengunduh semua family atau weight jika hanya satu yang dipakai.

```ts
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});
```

Pastikan fallback memiliki metrics yang dekat. `swap` dapat mengurangi FOIT, tetapi fallback yang terlalu berbeda dapat meningkatkan layout shift. Evaluasi font loading, subset, weight, fallback, cache, dan perilaku offline setiap kali typography berubah.

## 8. List dan table

### 8.1 Pagination dan windowing

Jangan merender list besar tanpa batas. Pilih:

- **pagination** untuk daftar dengan navigasi dan URL state;
- **infinite scroll** jika pengguna benar-benar membutuhkan daftar panjang;
- **virtualization/windowing** untuk ratusan atau ribuan row yang tetap dapat di-scroll;
- **aggregate atau grouped rows** bila detail per item tidak diperlukan.

Threshold awal: 50–100 item dapat memakai render biasa; di atas 100 item, ukur dengan profiling. List sangat besar atau sering berubah-update sebaiknya divirtualisasi. Virtualisasi tidak menggantikan pagination atau batas query di server.

### 8.2 Render efficiency

- gunakan stable key berbasis ID, bukan index;
- hindari membuat object, formatter, callback, atau component type di loop tanpa alasan;
- memoize component yang mahal dan sering rerender;
- jangan menyalin seluruh list ke client state;
- virtualisasi row yang mahal;
- gunakan `content-visibility` hanya setelah memeriksa browser, visual, dan aksesibilitas.

`React.memo` bukan solusi universal. State parent, key baru, dan object baru sering membuat memo tidak membantu. Profiling lebih baik daripada menebak.

Untuk tabel interaktif, pisahkan header, filter, bulk action, dan baris data. Gunakan selection state yang stabil. Hindari controlled input yang merender seluruh tabel pada setiap keystroke bila input dapat berada di luar tabel atau state lokal yang lebih kecil.

## 9. Dynamic imports dan code splitting

Server Component otomatis di-code-split. Lazy loading secara eksplisit terutama berguna untuk Client Component dan library browser yang belum diperlukan pada first load. Kandidat yang umum:

- chart dan graph renderer;
- map dan geospatial library;
- editor, markdown renderer, atau syntax highlighter;
- date picker atau calendar kompleks;
- modal besar yang baru dibuka saat interaksi;
- library browser-only seperti editor atau drag-and-drop.

```tsx
"use client";

import dynamic from "next/dynamic";

const Chart = dynamic(() => import("./chart"), {
  loading: () => <ChartSkeleton />,
});

export function DashboardChart() {
  return <Chart />;
}
```

`next/dynamic` adalah komposisi `React.lazy` dan Suspense. Panggil di top level modul Client Component, gunakan path eksplisit, dan berikan fallback dengan dimensi stabil. `ssr: false` hanya boleh digunakan di Client Component. Lazy loading menunda kode dan browser work; lazy loading tidak memperbaiki server latency atau request lambat.

## 10. Bundle checks

### 10.1 Build produksi

Jalankan:

```bash
npm run build
```

Catat First Load JS per route dan simpan baseline. Perubahan kecil yang berulang tetap dapat menghasilkan regresi besar.

### 10.2 Analisis dependency bawaan Next.js 16.3.6

Next.js menyediakan analyzer Turbopack melalui CLI dan tidak memerlukan package analyzer tambahan:

```bash
npx next experimental-analyze
```

CLI ini hanya kompatibel dengan Turbopack, menganalisis hasil bundle production, dan dapat menampilkan UI interaktif. Gunakan `-o` untuk hanya menulis hasil analisis ke disk:

```bash
npx next experimental-analyze --output
```

Filter module berdasarkan route, client/server, dan tipe asset. Gunakan import chain untuk mengetahui siapa yang menarik dependency.

`@next/bundle-analyzer` tidak terpasang. Package tersebut hanya merupakan opsi masa depan bila workflow Webpack membutuhkannya, dan penambahan dependency harus melalui review. Lighthouse, RUM vendor, Sentry, SWR, TanStack Query, dan tool cache handler juga bukan dependency yang terpasang; perlakukan sebagai pilihan tooling setelah kebutuhan, privasi, dan biaya dievaluasi.

### 10.3 Penyebab bundle besar

- layout atau provider besar ditandai client;
- import package dengan banyak export;
- wildcard icon atau utility import;
- chart, map, editor, date library, atau syntax highlighter pada route yang tidak membutuhkan;
- barrel file yang menarik modul besar;
- asset atau helper yang masuk client graph tanpa sengaja;
- formatting, parsing, atau rendering berat di browser;
- duplikasi library dari entry point berbeda.

Tindakan yang biasanya efektif:

- pindahkan `"use client"` ke leaf;
- import member spesifik;
- pindahkan komputasi pure ke Server Component;
- dynamic import fitur berat;
- gunakan `optimizePackageImports` hanya untuk library yang didukung;
- gunakan `serverExternalPackages` hanya jika benar-benar diperlukan dan memahami konsekuensinya.

### 10.4 Profiling

Gunakan React DevTools Profiler untuk render, Chrome Performance untuk main thread dan long task, serta Network panel untuk request, cache, dan transfer. Bundle besar belum tentu bottleneck, dan render lambat belum tentu disebabkan bundle.

## 11. Loading, monitoring, dan observability

### 11.1 Local baseline

Untuk perubahan penting:

1. gunakan production build;
2. jalankan `npm run start`;
3. buka route pada cold dan warm cache;
4. catat perangkat, browser, jaringan, lokasi, dan status login;
5. catat LCP, INP, CLS, FCP, TTFB, request count, transfer size, dan console error;
6. ulangi beberapa kali untuk membedakan noise dari regresi.

Skeleton harus mencerminkan struktur final, memiliki ukuran yang stabil, dan tidak menampilkan data basi seolah-olah data baru sudah tersedia. Sediakan error state agar fallback tidak membuat pengguna mengira request masih berjalan.

Lighthouse berguna untuk regresi kasar, tetapi tidak menggantikan RUM. Lab test terkontrol tidak mewakili semua kondisi pengguna.

### 11.2 RUM Web Vitals

RUM vendor belum terpasang. Untuk implementasi internal, tambahkan Client Component kecil yang menggunakan `useReportWebVitals` dari `next/web-vitals`:

```tsx
"use client";

import { useReportWebVitals } from "next/web-vitals";

export function WebVitals() {
  useReportWebVitals((metric) => {
    if (metric.name === "LCP") {
      navigator.sendBeacon("/api/vitals", JSON.stringify(metric));
    }
  });

  return null;
}
```

Mount komponen ini dari root layout tanpa menjadikan layout besar sebagai Client Component. Pastikan endpoint receiving tersedia, rate-limited, dan tidak menyimpan data personal.

Sebelum mengirim data ke vendor:

- pastikan ada privacy policy, retention policy, dan DPA;
- jangan mengirim query string atau payload sensitif;
- gunakan `navigator.sendBeacon` atau `fetch` dengan `keepalive` sesuai kebutuhan;
- gunakan sampling jika volume tinggi;
- segmentasikan berdasarkan route, device, browser, koneksi, dan release.

Pantau LCP, INP, CLS, FCP, dan TTFB dengan p75. RUM menunjukkan pengalaman nyata; synthetic test menguji skenario yang dibuat sendiri.

### 11.3 Error dan dependency monitoring

Pantau:

- JavaScript error dan unhandled rejection;
- error rate dan request failure;
- API/database latency dan timeout;
- Web Vitals per route;
- First Load JS dan bundle per release;
- slow query, cache hit ratio, dan revalidation error;
- metrik pada sesi baru, bukan hanya synthetic test.

Gunakan correlation ID pada request, trace, dan log. Jangan log secret atau payload sensitif. Alert harus berdasarkan error rate dan user impact, bukan satu request lambat.

### 11.4 Incidente template

```text
Tanggal:
Release/build:
Route:
Perangkat/jaringan:
Metric sebelum:
Metric sesudah:
Bundle/asset terkait:
Dampak pengguna:
Bukti profiler/network:
Akar masalah sementara:
Rencana perbaikan:
Budget yang dilanggar:
```

Jika regresi tidak dapat direproduksi, tetap catat kondisi, waktu, dan hasilnya. Pisahkan penyebab server latency, client JavaScript, rendering, image/font, cache miss, dan user-specific state agar investigasi tidak salah fokus.

## 12. Checklist merge

### Arsitektur

- [ ] Server Component menjadi default.
- [ ] `"use client"` hanya pada boundary interaktif yang diperlukan.
- [ ] Props lintas boundary serializable dan minimal.
- [ ] Secret tidak masuk client bundle.
- [ ] Client provider sedekat mungkin dengan subtree yang membutuhkannya.

### Data dan cache

- [ ] Query dan authorization dilakukan di server.
- [ ] Request independen diparalelkan.
- [ ] Waterfall yang tidak perlu dieliminasi.
- [ ] Payload diseleksi, dipaginasi, dan dibatasi.
- [ ] Input pencarian didebounce atau request lama dibatalkan.
- [ ] Cache key, TTL, tag, dan invalidasi terdokumentasi.
- [ ] Data kritis memiliki freshness yang benar.
- [ ] Model caching sesuai konfigurasi repository Next.js 16.3.6.
- [ ] Cache personal tidak dibagikan antar-user.
- [ ] Multi-instance cache coordination dipertimbangkan bila perlu.

### Media dan UI

- [ ] `next/image` digunakan dengan dimensi dan aspect ratio yang benar.
- [ ] `sizes` dan prioritas `preload`/`fetchPriority` sesuai kebutuhan.
- [ ] `priority` tidak digunakan sebagai default di Next.js 16.
- [ ] Remote image allowlist sempit dan aman.
- [ ] Font self-hosted, disubset, dan dibatasi.
- [ ] List besar dipaginate atau di-windowing berdasarkan profiling.
- [ ] Key list stabil dan render loop efisien.
- [ ] Loading state memiliki dimensi stabil dan error state yang jelas.

### Bundle dan verifikasi

- [ ] Chart, map, editor, dan library berat lazy-loaded.
- [ ] Import spesifik dan tree-shakeable.
- [ ] First Load JS tetap dalam budget atau pengecualian terdokumentasi.
- [ ] `npm run lint` berhasil.
- [ ] `npm run build` berhasil.
- [ ] Bundle output dibandingkan dengan baseline.
- [ ] `npx next experimental-analyze` dijalankan bila investigasi bundle diperlukan.
- [ ] Lighthouse/production check dijalankan untuk perubahan UI besar.
- [ ] RUM dan error monitoring diperiksa setelah deploy.
