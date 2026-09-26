# 11 — Workflows

Resep langkah demi langkah untuk perubahan yang sering terjadi. Semua nama path, nama file, dan nama perintah di dokumen ini sudah diverifikasi terhadap working tree (2026-09).

## Peta Repo yang Digunakan Workflow Ini

Route group (`src/app/`):

| Group | Layout | Sifat |
| --- | --- | --- |
| `(auth)/` | `layout.tsx` → `AuthShell` (punya `<main>` sendiri) | `noindex` |
| `(dashboard)/` | `layout.tsx` → `PageShell` (punya `<main>`) | auth guard |
| `(public)/` | `layout.tsx` (punya `<main>`) | statis, masuk sitemap |
| `maintenance/` | sendiri | tanpa shell |

Route nyata yang ada: `(auth)/login`, `(auth)/register`, `(auth)/forgot-password`, `(auth)/reset-password`, `(auth)/verify-email`, `(auth)/check-email`, `(auth)/invite`, `(auth)/login/mfa`, `(dashboard)/dashboard`, `(dashboard)/users`, `(dashboard)/users/[id]`, `(dashboard)/roles`, `(dashboard)/settings/*`, `(public)/` + `about`, `contact`, `privacy`, `terms`. Plus `src/app/sitemap.ts`, `src/app/robots.ts`, `src/app/error.tsx`, `src/app/not-found.tsx`.

Feature (`src/features/`): `audit`, `auth`, `contact`, `dashboard`, `landing`, `legal`, `log-management`, `notification`, `observability`, `role`, `roles`, `settings`, `ueba`, `user`.

Perhatikan: **`role/` dan `roles/` masih duplikat dan belum dikonsolidasikan** — jangan menambah fitur role/permission baru sebelum duplikat itu diputuskan.

Komponen layout (`src/components/layout/`): `page-shell.tsx`, `app-sidebar.tsx`, `app-sidebar-header.tsx`, `app-sidebar-footer.tsx`, `nav-main.tsx`, `site-header.tsx`, `user-menu.tsx`, `breadcrumb-nav.tsx`, `settings-nav.tsx`, `public-header.tsx`, `public-footer.tsx`, `theme-provider.tsx`.

Config (`src/config/`): `site.ts`, `appearance.ts`, `dashboard.ts`, `public-pages.ts`, `auth-pages.ts`, `login-page.ts`, `register-page.ts`, `mfa-pages.ts`, `log-management.ts`, `observability.ts`, `roles.ts`.

Perintah: `npm run dev`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm run start`.

---

## Menambah Halaman Baru

1. **Tentukan group.** `(public)` untuk halaman statis yang bisa di-index; `(dashboard)` untuk data user; `(auth)` untuk alur autentikasi. Jangan membuat route group baru tanpa alasan kuat.
2. **Baca acuan** `docs/ARCHITECTURE.md` §4, §5, §8, §11, §15.
3. **Buat folder route** dengan `kebab-case` Bahasa Inggris, contoh: `src/app/(dashboard)/reports/`.
4. **Buat `page.tsx`** sebagai Server Component. Jangan tambahkan `"use client"` di sini kecuali halaman benar-benar interaktif penuh.
5. **`params` dan `searchParams` adalah Promise** pada App Router modern:
   ```tsx
   export default async function Page(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
     const { page } = await props.searchParams;
   }
   ```
6. **Tambahkan `<main>`?** Jangan. `PageShell` (dashboard) dan layout `(public)`/`AuthShell` sudah memilikinya. `<main>` ganda adalah bug layout.
7. **Validasi input** dengan Zod sebelum dipakai: `searchParams` dan route param adalah input tidak tepercaya. Lihat `src/lib/search-params.ts` untuk helper yang sudah ada.
8. **Data fetching** lewat `src/features/<fitur>/service.ts`, bukan langsung di komponen.
9. **Tambahkan `loading.tsx`** kalau data fetching bisa lambat; **`error.tsx`** kalau ada failure yang mungkin; **`not-found.tsx`** kalau resource bisa hilang.
10. **Metadata** lewat API `metadata` Next.js, bukan `<head>` manual. Copy user-facing dari `src/config/`, bukan inline.
11. **Sitemap/robots:** kalau halaman publik, tambahkan ke `src/app/sitemap.ts` dan perbarui `LAST_MODIFIED` di file itu. Kalau auth, pastikan tetap `noindex`.
12. **Navigasi:** tambahkan entry di `src/config/site.ts` (atau config relevant) supaya muncul di sidebar/header. **Jangan** nav entry-nya inline di komponen.
13. **Link** selalu `next/link` dan harus menuju route yang benar-benar ada. Tidak ada `href="#"`.
14. **A11y & state:** heading berurutan, ada empty state, error state, loading state, focus state.
15. Verifikasi: `npm run lint` && `npx tsc --noEmit` && `npm run build`, lalu cek manual di `npm run dev`.

## Menambah Server Action

1. **Baca acuan** `docs/ARCHITECTURE.md` §4.4, §10.6 dan `docs/SECURITY.md`. Lihat `src/features/contact/actions.ts` sebagai contoh referensi.
2. **Lokasi:** `src/features/<fitur>/actions.ts`. File wajib diawali `"use server";` di baris pertama.
3. **Fungsi menerima `unknown`**, bukan tipe trust. Contoh repo:
   ```ts
   export async function sendContactMessage(input: unknown): Promise<ContactActionState>
   ```
4. **Rate limit duluan** untuk endpoint sensitif (login, reset password, contact), sebelum validasi mahal:
   ```ts
   enforceRateLimit(getEmailHint(input), "contact");
   enforceRateLimit("global", "contact");
   ```
   Identifier harus di-hash/dipotong, **jangan** log email mentah.
5. **Validasi dengan Zod** di server: `schema.safeParse(input)`. Map `result.error.issues` ke `FieldErrors` per field. Jangan pernahesophageal skip validasi karena client sudah validating.
6. **Authorization:** `requireSession()` lalu `requireRole(session, "editor")` (`src/lib/rbac.ts`). Default deny.
7. **IDOR:** verifikasi kepemilikan resource, bukan hanya authentication. Resource milik orang lain sebaiknya dibalas `NOT_FOUND`, bukan `FORBIDDEN`, supaya ID tidak bisa dipetakan.
8. **Panggil `service.ts`**, bukan query langsung. Service adalah satu-satunya pintu data.
9. **Return typed state**, bukan `throw` ke client:
   ```ts
   type ActionState =
     | { success: true }
     | { success: false; error: { code: ErrorCode; message: string; fieldErrors?: FieldErrors } };
   ```
   Pesan untuk user diambil dari `AppError.userMessage`.
10. **`try/catch` di seluruh body**, dengan `catch` terakhir yang `logger.error(...)` lalu return error generik. Jangan biarkan exception mentah bocor ke client.
11. **JANGAN** mengembalikan stack trace, query, nilai env, atau pesan internal.
12. **Audit + metric** untuk aksi sensitif: `appendAuditEvent` / `logAuditEvent` (`src/features/audit/lib/`) dan `trackMetric` (`src/features/observability/lib/track.ts`).
13. Kalau dipanggil dari form, komponen pemanggil harus handle `try/catch` juga — error boundary **tidak** menangkap event handler.

## Menambah Komponen UI

1. **Tentukan tempatnya:**
   - `src/components/ui/` — primitive shadcn/Base UI hasil generate. Perlakukan sebagai **kode upstream**: jangan ubah manual tanpa alasan kuat.
   - `src/components/custom/` — komposisi/variasi aplikasi, boleh berisi domain state.
   - `src/components/layout/` — shell, sidebar, topbar, navigasi lintas halaman.
   - `src/features/<fitur>/components/` — komponen yang spesifik domain.
2. **Baca** `docs/CONVENTIONS.md` (komponen, styling, TypeScript).
3. **Server Component adalah default.** `"use client"` hanya untuk state, event handler, browser API, form, chart, editor, client-only lib. Taruh di **leaf** interaktif, jangan di layout besar.
4. **Props** pakai interface bernama `<Nama>Props`. Data yang dikirim ke Client Component harus serializable — tanpa callback server, tanpa object database.
5. **Button memakai `render={<Link … />}`**, bukan `asChild` (Base UI API).
6. **`FormItem` wajib `space-y-2`**, input form `h-10`, jarak antar field `space-y-5`.
7. **Warna lewat token semantic** (`bg-background`, `text-muted-foreground`, `border-primary`). Jangan hex, jangan arbitrary value, jangan hardcode `emerald` di komponen.
8. **Jangan diubah style global** untuk satu komponen. Pakai variant atau wrapper.
9. **State wajib:** focus, hover, disabled, loading, empty, error — sesuai konteks.
10. **A11y:** elemen semantik, `alt` pada gambar, label form terhubung, navigasi keyboard berfungsi, `aria-*` hanya bila perlu.
11. **Aksi dari parent** dikirim sebagai prop atau `action`, bukan dibuat di dalam komponen presentasional. Jangan taruh query database atau access control di komponen.
12. Jangan pakai `dangerouslySetInnerHTML` tanpa sanitasi ketat.

## Menambah Config

1. **Baca** `docs/ARCHITECTURE.md` §14.7.
2. **Tentukan domain.** `src/config/` adalah satu sumber kebenaran per domain. Jangan membuat `config-umum.ts` yang mencampur beberapa domain.
3. **Nama file** mengikuti domain yang di-config: `observability.ts`, `roles.ts`, `login-page.ts`. `kebab-case`, Bahasa Inggris.
4. **Isi hanya konstanta non-secret.** Tidak ada API key, token, atau credential. Secret hanya di environment.
5. **Hanya konstanta.** Kalau butuh komputasi atau I/O, itu bukan config — taruh di `src/lib/` atau `src/features/<fitur>/`.
6. **Struktur:**Keluar object yang di-`as const` bila readonly desirable, supaya tipe narrow dan typo ketahuan di compile.
7. **Consumer mengimpor dari config**, tidak menyalin nilainya. Jangan duplikasi string di komponen.
8. **Bila menambah route/entry navigasi**, update juga `src/app/sitemap.ts` kalau relevan.
9. Verifikasi `npx tsc --noEmit` — perubahan config biasanyamenyentuh banyak consumer sekaligus.

## Menambah Dependency

**WAJIB tanya user lebih dulu. Tidak ada pengecualian.**

1. **Cek apakah memang perlu.** Repo ini sudah punya `zod`, `react-hook-form`, `@hookform/resolvers`, `lucide-react`, `sonner`, `recharts`, `next-themes`, `class-variance-authority`, `pino`, `server-only`. Kemungkinan besar solver sudah ada.
2. **Cek apakah bisa ditulis sendiri.** Untuk util kecil, tulis di `src/lib/`. Untuk primitive UI, pakai yang ada di `src/components/ui/`.
3. **Jika tetap perlu**, tanyakan user dengan menyebut: nama paket, versi, alasan,lisensi, ukuran, dan alternatif yang dipertimbangkan.
4. **Jangan jalankan `npm install <paket>` tanpa jawaban.** Perintah itu mengubah `package.json` + `package-lock.json`, menjalankan lifecycle script, dan bisa menarik transitive dependency rentan. Auditing di CI (`npm audit --audit-level=high`) bisa gagal karena itu.
5. **Setelah disetujui:**
   ```bash
   npm install <paket>@<versi>
   npm run lint && npx tsc --noEmit && npm run build
   ```
6. **Commit `package-lock.json` bersama** perubahan dependency (lihat `10-git.md`). Ini diwajibkan `docs/SECURITY.md` A08 dan CI memakai `npm ci`.
7. **Catat di laporan** paket apa yang ditambahkan dan mengapa. Kalau replace, catat yang dihapus.
8. Jangan menambahkan test runner, linter, atau formatter baru tanpa persetujuan terpisah — itu mengubah alur kerja seluruh repo.

## Refactor

1. **Refactor tidak mengubah perilaku.** Kalau perilakunya berubah, itu bukan refactor — pecah jadi commit terpisah.
2. **Tetapkan baseline dulu:** `npm run lint && npx tsc --noEmit && npm run build` harus hijau **sebelum** mulai. Kalau sudah merah, itu bukan refactor-mu.
3. **Kecilkan langkah.** Satu refactor = satu commit. Pecah commit yang behavior-preserving.
4. **Jangan refactor di sekeliling fitur lain.** Kalau ada fitur yang belum selesai, selesaikan dulu.
5. **Jaga boundary yang ada:** komponen presentasional tetap tidak boleh query database; `service.ts` tetap `import "server-only"`.
6. **Hapus kode mati** yang memang mati, tapi jangan melakukan "cleanup" opportunistik di file yang tidak terkait.
7. **Dokumentasikan** perubahan struktur di `docs/ARCHITECTURE.md` §3.1, §15, §16 pada commit yang sama.
8. Verifikasi tiga perintah di atas setelah selesai.

## Bug Fix

1. **Reproduksi dulu.** Bug yang belum direproduksi biasanya bukan bug — mungkin fitur yang memang tidak diharapkan.
2. **Baca `docs/ERROR-HANDLING.md`** kalau ini terkait error path, dan `docs/SECURITY.md` kalau ini terkait authz/IDOR/injection.
3. **Tulis test regression** kalau test tooling sudah ada (lihat `09-testing.md`). Kalau belum, deskripsikan skenario reproduksi di laporan.
4. **Perbaikan sekecil mungkin** di sumber masalah. Jangan menyela refactor sekalian.
5. **Periksa efek samping:** apakah boundary keamanan, validasi, atau cache ikut terdampak?
6. **Perbarui dokumentasi** kalau kontraknya berubah.
7. Commit: `fix(scope): description yang menjelaskan gejala, bukan karena`.
   ```text
   fix(auth): stop leaking internal error message on MFA failure
   ```
8. Laporkan: gejala, akar masalah, perbaikan, cara verifikasi, dan risiko sisa.

## Menambah Audit Event

1. **Baca acuan** `docs/SECURITY.md` § Logging dan `docs/ARCHITECTURE.md` §4.4/§10.6. Kode referensi: `src/features/audit/lib/log-audit.ts`, `integrity.ts`, `store.ts`.
2. **Gunakan `logAuditEvent` / `appendAuditEvent`** — satu-satunya pintu penulisan audit. Jangan menulis langsung ke store atau ke array event.
3. **Tentukan `category`, `action`, `severity`, `result`, `source`.** Lihat enum yang sudah ada di `src/features/audit/schema.ts`; tambahkan di sana bila belum ada.
4. **Isi `actor` dan `resource`** (`type:id`) agar event bisa ditelusuri dan di-chain.
5. **Data akan di-redact otomatis** oleh `redactTags` (`src/lib/redact.ts`) — tapi jangan bergantung pada itu. Jangan pernah menyertakan password, token, session id, atau PII mentah di `metadata`.
6. **Log event di jalur sukses DAN gagal** (mis. login gagal, perubahan role, akses data sensitif). `requestId` diambil dari `src/lib/request-context.ts` untuk korelasi.
7. **Jangan** menulis event dari Client Component. Audit hanya dari server.
8. **Hash chain** dihitung otomatis oleh `integrity.ts`; kamu tidak perlu menghitungnya manual.
9. Verifikasi `npm run lint && npx tsc --noEmit && npm run build`, dan cek event muncul di UI log yang relevan.

## Menambah Halaman Settings

1. **Baca acuan** `docs/ARCHITECTURE.md` §8, §10 dan `docs/ARCHITECTURE.md` §14.2/§14.3 untuk form.
2. **Pilih posisi.** Sub-halaman settings yang ada: `general/`, `appearance/`, `security/`, `observability/`, `ueba/`, `logs/{access,disposal,retention,sources}/`. Pasikan tidak menduplikasi yang sudah ada.
3. **Buat `src/app/(dashboard)/settings/<nama>/page.tsx`**. `PageShell` sudah menangani `<main>` dan auth guard — jangan tambahkan `<main>`.
4. **Tambahkan tab ke `SETTINGS_TABS`** di `src/components/layout/settings-nav.tsx`. File ini `"use client"` (pakai `usePathname`) — perubahan hanya di array constant-nya, bukan logika.
5. **Copy dari `src/config/`** — `appearance.ts` / `site.ts` / config relevan, atau config baru bila domain baru. Judul tab ikut dari config bila memungkinkan.
6. **Form Server Action:** `src/features/<fitur>/actions.ts`, sudah ada `src/features/settings/service.ts` dan `schema.ts`. Ikuti aturan Server Action di atas.
7. **State persisten di client** (mis. warna brand) memakai pola yang sudah ada: `src/features/settings/hooks/use-appearance.ts` + `src/config/appearance.ts`. Jangan akses `localStorage` langsung di komponen.
8. **Perhatikan layout settings yang sudah ada** (`src/app/(dashboard)/settings/layout.tsx`) — pakai pola yang sama, jangan buat shell kedua.
9. **A11y:** form label terhubung, error per field, `FormItem` `space-y-2`, input `h-10`, field jarak `space-y-5`.
10. Update `src/app/sitemap.ts` hanya kalau halaman ini memang publik

## Menambah Schema

1. **Baca acuan** `docs/ARCHITECTURE.md` §10.3, §14.4 dan `docs/SECURITY.md` § Input dan output.
2. **Lokasi:** `src/features/<fitur>/schema.ts`. Feature yang punya schema: `audit`, `auth`, `contact`, `dashboard`, `log-management`, `notification`, `observability`, `role`, `roles`, `settings`, `ueba`, `user`.
3. **Pakai Zod** (`zod@^3.25.76` sudah terpasang). Ekspor object schema dan **tipe yang di-infer** dari `.infer`/`.output` — jangan tulis interface terpisah yang bisa menyimpang dari schema.
4. **Input dari server menerima `unknown`**, validasi di server. Client boleh validasi untuk feedback cepat, tapi itu tidak menggantikan server.
5. **Batasi ketat:** panjang string, format, enum, number range, `.strict()` untuk menolak key tak dikenal bila relevan.
6. **Schema yang meng-compose** schema existing dengan `.extend()`/`.merge()`/`.omit()`/`.pick()` daripada menyalin field — supaya tidak ada dua definisi yang berbeda.
7. **Pesan error dalam Bahasa Indonesia** dan spesifik per field, karena pesan ini langsung tampil ke user.
8. **Jangan pakai type assertion** (`as`, `as unknown as`, `false as true`) untuk menjinakkan compiler. Kalau schema tidak bisa, ubah schema-nya.
9. **Schema boleh punya efek samping?** Tidak. Validasi murni; transformasi ke entitas domain dilakukan di `service.ts`.
10. Verifikasi `npx tsc --noEmit` dan `npm run build` — perubahan schema berdampak ke banyak consumer sekaligus.

## Verifikasi Penutup (Semua Workflow)

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Ketiganya harus hijau sebelum menyatakan selesai. Kalau ada yang gagal, laporkan kegagalan itu apa adanya — jangan menyesuaikan test, threshold, atau config untuk membuatnya hijau. Jangan commit, push, atau buat branch tanpa perintah eksplisit user.
