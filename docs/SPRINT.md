# Sprint Plan — Dashboard Layout

Rencana kerja membangun layout dashboard template. Setiap sprint menghasilkan perubahan yang dapat dilihat dan dijalankan di browser.

## Definition of Done

- [ ] Mengikuti `docs/CONVENTIONS.md` dan `CLAUDE.md`.
- [ ] **Secure by design** — input tervalidasi Zod di server, auth dicek di setiap action/handler, dan tidak ada data sensitif di response atau error.
- [ ] **Error handling RFC 9457** — semua failure path memakai taxonomy dari `docs/ERROR-HANDLING.md`, bukan try-catch asal, `console.error`, atau throw string.
- [ ] `npm run lint` dan `npm run build` berhasil.
- [ ] Diuji desktop, mobile, light mode, dan dark mode.
- [ ] Perubahan di-commit dengan Conventional Commit.

## ⚡ Cross-Cutting Requirements

| Requirement | Ditegakkan oleh | Dicek di |
|---|---|---|
| Secure by design | `docs/SECURITY.md` dan `CLAUDE.md` | Review tiap task |
| Konsistensi pola | `docs/CONVENTIONS.md` dan `docs/ARCHITECTURE.md` | Review tiap task |
| Error handling RFC 9457 | `docs/ERROR-HANDLING.md` dan `src/lib/error.ts` | Tiap action, handler, dan UI |

## 🎯 Sprint 0 — Fondasi ✅ SELESAI

### 0.1 Konfigurasi aplikasi terpusat

- [x] `src/config/site.ts` berisi nama, deskripsi, tipe navigasi, dan `sidebarNav`.
- [x] Sidebar nanti membaca konfigurasi, bukan hardcode menu.

### 0.2 Security headers dan environment

- [x] Security headers di `next.config.ts`.
- [x] `.env.example` untuk `NEXT_PUBLIC_APP_URL`.
- [x] `src/lib/env.ts` untuk akses environment typed.
- [x] `src/lib/error.ts`, `src/lib/api.ts`, dan `src/lib/logger.ts` sebagai fondasi taxonomy error.

### 0.3 Dark mode

- [x] `next-themes` dipasang.
- [x] `src/components/layout/theme-provider.tsx`.
- [x] `src/components/custom/theme-toggle.tsx` dengan Light, Dark, dan System.
- [x] Provider dipasang di root layout.
- [x] `suppressHydrationWarning` dipasang pada `<html>`.
- [x] CSS memakai class-based dark mode agar pilihan pengguna controlling.

## Sprint 1 — Layout Shell

### 1.1 Route group

- [x] `src/app/(dashboard)/layout.tsx`.
- [x] `src/app/(dashboard)/dashboard/page.tsx`.
- [x] `src/app/(dashboard)/dashboard/loading.tsx`.
- [x] Landing publik tersedia di `/`; route dashboard sudah dibuat.

### 1.2 Sidebar desktop dan mobile

- [x] Tambahkan komponen shadcn sidebar.
- [x] `src/components/layout/app-sidebar.tsx` membaca `sidebarNav`.
- [x] `SidebarProvider` dipasang di dashboard layout.
- [x] Active state memakai `usePathname`.
- [x] Collapse state memakai cookie shadcn.
- [x] Mobile sidebar tampil sebagai Sheet.

### 1.3 Topbar

- [x] `src/components/layout/site-header.tsx` sticky.
- [x] Trigger sidebar, separator, theme toggle, dan user dropdown.
- [x] User dropdown masih placeholder tanpa auth.

### 1.4 PageShell dan state contract

- [x] `src/components/layout/page-shell.tsx`.
- [x] Props `title`, `description`, `children`, dan `actions`.
- [x] Dashboard placeholder memakai PageShell.
- [x] `src/components/custom/error-state.tsx` untuk pesan generik dan retry.
- [x] `src/components/custom/empty-state.tsx` untuk data kosong yang bukan error.
- [x] `app/error.tsx` dan `app/not-found.tsx` menjadi bagian kontrak error, bukan ditunda ke Sprint 2.

## Sprint 2 — Breadcrumbs Dinamis + Command Menu

- [x] Resolver breadcrumb pure dengan prioritas config, manual labels, humanize fallback, sanitasi, dan depth limit.
- [x] Breadcrumb dinamis dari `usePathname` dengan `aria-current` pada halaman aktif.
- [x] Command menu dengan shortcut Ctrl/Cmd+K, cleanup listener, pencarian lokal, dan navigasi dari config.
- [x] Integrasi `BreadcrumbNav` dan `CommandMenu` ke `SiteHeader`.
- [x] Error state tanpa hasil, disabled menu, dan navigasi tanpa raw HTML.

### 2.3 Placeholder Pages — Hardening Pass

- [x] `src/lib/search-params.ts` memvalidasi `q`, `page`, dan `pageSize` dengan batas aman serta fallback never-throw.
- [x] `error.tsx` route group dashboard menjaga sidebar dan topbar tetap aktif.
- [x] `not-found.tsx` route group dashboard memakai shell dashboard.
- [x] `loading.tsx` route group dashboard menyediakan skeleton layout.
- [x] `users/page.tsx` menjadi pola referensi list page dengan query tervalidasi.
- [x] `users/[id]/page.tsx` menjadi pola detail page dengan `notFound()` netral.

## Fase 2 — CMS Settings (setelah auth + DB jalan)

| Sprint | Item |
|---|---|
| C1 | DB schema: tabel settings + navigation_items (Drizzle) |
| C2 | Settings service (Zod parse + fallback default) + actions (RBAC admin) |
| C3 | /settings General: nama, tagline, favicon & logo upload |
| C4 | /settings Navigation: menu manager CRUD + nested sub-item |
| C5 | /settings Login Page: editor konten login |
| C6 | Sidebar & halaman publik membaca dari DB (service switch) |

### 2.5 Dashboard Content — KPI, Charts, Activity

- [x] Config metadata KPI dan ikon berada di `src/config/dashboard.ts`.
- [x] Schema Zod dan mock service tervalidasi di `src/features/dashboard`.
- [x] KPI cards, revenue chart, traffic chart, dan activity table tersedia di `/dashboard`.
- [x] Recharts dimuat secara lazy melalui client dynamic wrappers.
- [x] Loading dashboard mencerminkan tiga zona dan fallback empty state aman.

## Sprint 3 — DataTable Pattern

- [x] Feature user dengan schema, types, mock service, dan actions.
- [x] Service dan action wajib melempar atau memetakan error ke `AppError` dari taxonomy.
- [x] Form memakai envelope `{ success, error }` dan menampilkan `fieldErrors` serta pesan kode secara seragam.
- [x] Tabel punya empty state dan error state yang berbeda.
- [x] Tabel server-driven dengan sort, search, filter role, pagination, dan loading skeleton.
- [x] Validasi `searchParams` di page sebelum service dipanggil.

## Sprint F1 — Settings + Appearance

- [x] `src/config/appearance.ts` menjadi satu sumber warna preset dengan whitelist CSS variables.
- [x] Schema/service settings memakai Zod, localStorage adapter, dan fallback default.
- [x] Brand color picker menerapkan override `--primary`, `--ring`, dan sidebar variables.
- [x] Anti-flash script memakai preset konstanta server-generated sebelum hydration.
- [x] `/settings/general` jujur read-only dari `siteConfig`; `/settings/appearance` menyimpan preferensi lokal.

## Sprint F2 — CRUD Form Pattern

- [x] `createUserSchema` dan `updateUserSchema` memakai aturan field yang sama.
- [x] `createUser` dan `updateUser` memvalidasi ulang payload serta business rule email unik.
- [x] Create/update action memakai rate limit, session placeholder, RBAC admin, envelope, dan revalidasi.
- [x] `UserFormDialog` dapat dipakai untuk create maupun edit dengan RHF + Zod.
- [x] `fieldErrors` server disuntikkan ke field form; dialog tetap terbuka saat gagal.
- [x] Halaman `/users` memakai `CreateUserButton` dan row action Edit.

## Sprint F3 — Roles UI

- [x] `src/config/roles.ts` menjadi catalog permission frontend statis dan whitelist.
- [x] `features/role/schema.ts` memvalidasi role ID, `userCount`, dan permission ID terhadap whitelist.
- [x] `features/role/service.ts` memakai `safeParse` never-throw dan fallback role kosong.
- [x] Halaman `/roles` menampilkan 3 kartu role, jumlah user, dan matriks izin terkelompok per resource.
- [x] `PermissionToggle` read-only, aksesibel, dan siap dihubungkan ke action backend.
- [x] Menu sidebar `Roles` terhubung ke route `/roles` serta consumer navigasi.
- [ ] Permission enforcement dan role mutation membutuhkan backend RBAC; UI ini bukan pengganti authorization.

## Sprint F4 — Notifications UI

- [x] Schema membatasi ID, panjang field, timestamp, jumlah notifikasi, dan `href` ke path internal.
- [x] Service memakai validasi Zod dan never-throw dengan fallback kosong; daftar notifikasi masih mock frontend.
- [x] `useNotifications` memuat status read dari localStorage dan menjadi satu pemilik state notifikasi interaktif.
- [x] Dropdown notifikasi terhubung ke topbar, menampilkan unread count, skeleton, empty state, dan aksi tandai dibaca.
- [x] Preferensi hanya disimpan lokal per browser dan tidak merupakan persistence production.

## Sprint F6 — Advanced Theme Palette

- [x] `src/lib/color.ts` mengonversi hex ke OKLCH tanpa dependency dan menghasilkan 11 variabel semantic/chart.
- [x] `ALLOWED_THEME_VARS` dan schema membatasi key serta shape `oklch()`/`light-dark()` dari localStorage/import.
- [x] Custom color picker, preset palette, reset, live preview, dan export/import JSON terhubung di Appearance.
- [x] `color-scheme`, token semantic shadcn, chart variables, dan anti-flash script memakai kontrak theme yang sama.
- [x] Light/dark palette memakai `light-dark()`; preset dan custom color tetap kompatibel.
- [ ] Penyimpanan lokal dan import/export bukan sinkronisasi lintas perangkat; backend/CSP production berada di luar scope.

## Sprint F7 — Code Dependency Graph

Tooling untuk maintainer: memetakan dependensi `src/` lalu memvisualisasikannya
di `/settings/code-graph`. Ini bukan bagian dari CMS goals (`docs/GOALS.md` §5)
dan tidak masuk success criteria §4.

### F7.1 Generator

- [x] `scripts/code-graph.sh` mengorkestrasi madge, cek siklus, dan transform; path dihitung dari `BASH_SOURCE` sehingga bisa dipanggil dari direktori mana pun.
- [x] `scripts/code-graph-transform.js` menormalkan output `madge --json` menjadi kontrak `CodeGraphData` (`types.ts`): `label`, `type` dari ekstensi, `boundary` dari directive, `deps` per node.
- [x] Kategori mengikuti layout asli repo termasuk route group (`app/(dashboard)`, `app/(auth)`, `app/(public)`).
- [x] Dua pemeriksaan arsitektur: `violation` (lib ke feature) dan `boundaryViolation` (server-only ke client).
- [x] Siklus dari `madge --circular` diratakan jadi satu string per siklus sehingga `cycles.length` berarti jumlah siklus.
- [x] `npm run graph`, `graph:quick`, dan `graph:features` terdaftar di `package.json`.
- [x] `graph.json` sengaja tidak masuk `.gitignore` supaya ikut ter-commit dan halaman tetap render tanpa menjalankan script.

### F7.2 Halaman

- [x] Halaman static di `src/app/(dashboard)/settings/code-graph`; `graph.json` dibaca dari disk saat render, divalidasi dengan Zod longgar, dan jatuh ke empty state bila file hilang atau bentuknya salah.
- [x] `force-static` sengaja tidak dipakai — tidak ada route yang memakainya di repo ini dan `cacheComponents` tidak aktif (`ARCHITECTURE.md` §9).
- [x] Canvas React Flow dimuat lazy lewat `next/dynamic` dengan `ssr: false`; skeleton mencerminkan grid akhir supaya tidak ada layout shift.
- [x] Layout dagre arah `LR`, filter kategori plus search path, filter khusus violation, MiniMap, dan detail sheet per node.
- [x] Warna kategori dan edge berasal dari `lib/color.ts` (`light-dark()`), bukan hex atau kelas Tailwind hardcode.
- [x] Seluruh copy dari `src/config/code-graph.ts`.

### F7.3 Yang masih di luar scope

- [ ] `violation` hanya mencakup arah lib ke feature. Aturan yang lebih ketat di `AGENTS.md` (shared code di `lib`/`components` tidak boleh meng-import feature) belum dideteksi.
- [ ] `graph.json` masih dibangun manual lewat `npm run graph`; belum ada pre-commit hook atau build step yang menghasilkan otomatis.
- [ ] Halaman belum punya guard authz. Membaca peta arsitektur setara membocorkan struktur internal, jadi perlu pemeriksaan yang sama seperti `/settings/logs` saat backend tersedia.
- [ ] Belum ada test untuk `lib/layout.ts` atau `lib/color.ts`; `src/lib/color.test.ts` sudah menjadi pola yang bisa diikuti.

## Sprint 7.1 — Audit Foundation ✅ SELESAI (dengan koreksi dari rencana)

Rencana asli menyebut Sprint 7.1 sebagai "Audit Foundation" dan mengira modul audit belum ada. Setelah diverifikasi terhadap kode, **`src/features/audit/` sudah ada dan lebih matang dari rencana**, dan UI pembacanya juga sudah ada. Catatan di bawah menyebut apa yang benar-benar dikerjakan, apa yang tersingkir karena desain yang lebih baik sudah ada lebih dulu, dan apa yang masih hilang. Detail kontrak ada di `docs/AUDIT.md`.

### 7.1 Sudah ada sebelumnya, bukan hasil sprint ini

- [x] `src/features/audit/schema.ts` — kontrak Zod (`AUDIT_CATEGORIES`, `AUDIT_SEVERITIES`, `AUDIT_RESULTS`, `auditEventInputSchema`, `auditQuerySchema`).
- [x] `src/features/audit/types.ts` — re-export tipe + `IntegrityReport`.
- [x] `src/features/audit/lib/log-audit.ts` — `logAudit()` sebagai satu-satunya pintu tulis, dibungkus `try/catch` yang tidak pernah melempar.
- [x] `src/features/audit/lib/store.ts` — store in-memory di `globalThis`, hash chain, batas 5000 entry, `droppedEntries`.
- [x] `src/features/audit/lib/integrity.ts` — `computeEntryHash()`, `verifyChain()`, `buildIntegrityReport()`.
- [x] `src/features/audit/lib/categories.ts` — `AUDIT_ACTIONS`, satu-satunya sumber nama `action` (27 konstanta). Nilai string dibekukan sebagai kontrak.
- [x] `src/features/audit/lib/severity.ts` — `DEFAULT_SEVERITY` dan `normalizeSeverity()`; lantai severity per kategori, hanya `security` yang punya lantai di atas `info`.
- [x] `src/features/audit/actions.ts` — jalur baca lewat Server Action: `queryAuditEventsAction()` dan `getAuditOverviewAction()`.
- [x] Test: `lib/store.test.ts`, `lib/log-audit.test.ts`, `lib/integrity.test.ts`, `lib/severity.test.ts`.
- [x] `src/features/audit/service.ts` — `queryAuditEvents()`, `getAuditSummary()`, `verifyAuditIntegrity()` (`import "server-only"`).
- [x] `src/lib/redact.ts` — redaksi bersama, sudah ada dan sudah dipakai log, metrik, dan UEBA.
- [x] `src/lib/request-context.ts` — `getRequestContext()` / `getSafeRequestContext()` yang sudah meng-hash IP dan memotong user-agent.
- [x] UI pembaca `/settings/logs` — `src/app/(dashboard)/settings/logs/page.tsx` sudah `force-dynamic` dan sudah memanggil `getLogOverview()` serta `verifyAuditIntegrity()` langsung.

### 7.2 Item rencana yang TIDAK jadi — tersingkir oleh desain yang lebih baik

| Direncanakan | Yang benar-benar ada | Alasan |
|---|---|---|
| `features/audit/queue.ts` | `features/audit/lib/store.ts` | Antrean hanya akan menjadi lapisan write-only di depan sebuah array. Yang benar-benar dibutuhkan adalah append berantai dengan state `head`, dan `store.ts` + `log-audit.ts` sudah mengimplementasikan itu. Layer tambahan menambah hop tanpa menambah jaminan. |
| `features/audit/redact.ts` | `src/lib/redact.ts` | Redaksi tidak milik audit. `redactTags()` sudah dipakai `src/lib/logger.ts`, `src/lib/request-context.ts`, `src/features/observability/`, dan `src/features/ueba/lib/anomaly.ts`. Menaruhnya di `features/audit/` akan membuat siklus import dan memaksa modul metrik bergantung pada fitur audit. `log-audit.ts` memanggil `redactTags()` yang sama, jadi aturannya tidak bisa berbeda antar sink. |
| Halaman audit baru | `/settings/logs` yang sudah ada | Halaman kedua yang membaca store yang sama hanya jadi dua presentasi dari satu data tanpa sumber tambahan. Kekurangan yang nyata bukan "tidak ada UI", melainkan tidak adanya filter di UI — lihat 7.4. |
| Adapter persistence / skema DB | store in-memory, dengan catatan target di `store.ts:11-12` | Belum ada backend, jadi adapter DB hanya menambah interface tanpa implementasi. Catatan target (tabel `audit_events` dengan kolom `hash`/`previous_hash` dan index `(timestamp, category, actor_id)`) sudah ditulis di tempat yang benar. |

Nama file di rencana juga perlu dikoreksi karena berbeda dari implementasi: entrypoint tulisnya `lib/log-audit.ts`, bukan `log-audit.ts` di root fitur.

### 7.3 Call site yang benar-benar ada (hasil `grep -rn "logAudit(" src/`)

- [x] `src/features/auth/actions.ts` — 9 call site, category `auth` dan `security`.
- [x] `src/features/user/actions.ts` — 4 call site, category `authz` dan `data`.
- [x] `src/features/log-management/lib/disposal-queue.ts` — 3 call site, category `log`.
- [x] `src/features/contact/actions.ts` — 2 call site, category `data` dan `security`.
- [x] `src/features/organization/actions.ts` — 1 call site, category `data`.
- [x] Lima dari enam kategori punya call site nyata; kategori `config` belum dipakai.
- [x] Tidak ada call site di `features/role/` maupun `features/roles/`. Klaim lama bahwa audit dipakai di `roles/` tidak benar.
- [x] Call site yang sudah ada masih menulis `action` sebagai literal mentah, bukan konstanta `AUDIT_ACTIONS`. Migrasi itu belum dikerjakan; `auditEventInputSchema` juga masih menerima string bebas, bukan enum.

### 7.4 Yang benar-benar masih hilang

- [ ] **Tidak durable.** Store in-memory satu proses. Hilang saat restart/deploy, dan tidak konsisten di deployment multi-replica. Lihat `docs/AUDIT.md` §"Apa yang Mock dan Tidak Durable".
- [ ] **Guard authz sudah ada tapi masih dekoratif.** `actions.ts:99-107` sudah menjalankan `requireSession()` → `requireRole(session, "admin")` → `enforceRateLimit(session.id, purpose)`, jadi urutan dan bentuk pemeriksaannya sudah sama dengan action lain. Tetapi `requireSession()` di `src/lib/rbac.ts:15-17` masih mengembalikan `{ id: "usr_placeholder", role: "admin" }` untuk semua pemanggil, sehingga tidak ada yang ditolak. `actions.ts:88-98` sendiri menandai ini `TODO(Sprint 7.3)`. `features/audit/service.ts` dan route `/settings/logs` tetap tanpa guard sama sekali.
- [ ] **Cakupan test belum tuntas.** `store`, `log-audit`, `integrity`, dan `severity` sudah ada test, tetapi `actions.ts` dan `service.ts` belum, dan `verifyChain()` pada store yang sudah overflow belum tercakup.
- [ ] **Filter UI belum dipakai.** `auditQuerySchema` sudah mendukung `category`, `severity`, `result`, `action`, `actorId`, `from`/`to`, dan paginasi 10–100; `/settings/logs` hanya mengirim `pageSize`.
- [ ] **`userAgent` pada event tidak dipotong ke 120 karakter** dan `actor.email`/`actor.role` tidak masuk redaksi — hanya `metadata` yang disapu. Ini celah privasi yang diketahui, bukan hal yang bisa diasumsikan aman.
- [ ] **Verifikasi rantai memberi false positive setelah overflow.** Begitu store melewati 5000 entry, `verifyChain()` melaporkan `brokenAtIndex: 0` karena entry pertama yang tersisa masih memegang `previousHash` milik entry yang sudah di-`splice`, sedangkan `verifyChain()` selalu mulai dari `null`. Komentar di `store.ts:59-60` menganggapnya "verifikasi parsial"; perilakunya bukan begitu. Perlu diperbaiki atau didokumentasikan di UI.
- [ ] **Jejak "terakhir diverifikasi" NOOP di production.** `verifyIntegrityWithTimestamp()` mengembalikan state lama tanpa memverifikasi bila `NODE_ENV === "production"`, jadi panel integrity di production akan permanen menampilkan "belum pernah diverifikasi".
- [ ] **Tidak ada alerting atas rantai rusak.** `src/features/log-management/lib/disposal.ts:117` menyatakan sendiri bahwa ini belum ada.

## Sprint 7.3 — UI Pembaca Audit Log ✅ SELESAI

Menutup celah "Filter UI belum dipakai" di §7.4 dengan satu route pembaca baru,
`/settings/audit`, yang berjalan paralel dengan `/settings/logs`: `/settings/logs`
tetap fokus pada retensi, disposal, dan integritas; `/settings/audit` fokus pada
**menjelajah event dengan filter**. Keduanya membaca store yang sama.

### 7.3.1 Yang dikirim

- [x] `src/app/(dashboard)/settings/audit/page.tsx` — Server Component di bawah layout settings, jadi tanpa `PageShell` dan tanpa `<main>` tambahan (§14.6); `force-dynamic` dan `robots: { index: false, follow: false }`.
- [x] Halaman hanya meratakan `searchParams` (Promise di Next 16) dan meneruskannya ke `queryAuditEvents()`; validasi, coercion, dan batas `page`/`pageSize` tetap milik `auditQuerySchema`.
- [x] `baseQuery` untuk `AuditPagination` berisi kunci filter aktif tanpa `page`.
- [x] `src/app/(dashboard)/settings/audit/loading.tsx` — skeleton yang mencerminkan tiga zona: baris filter, blok tabel, dan baris paginasi.
- [x] `src/config/audit-page.ts` — satu sumber copy untuk judul, label kolom, label filter, dan label paginasi (§14.7).
- [x] Komponen di `src/features/audit/components/`: `audit-filters.tsx` (client, URL-driven), `audit-table.tsx`, `audit-pagination.tsx`, plus `audit-badge.tsx` dan `audit-detail-sheet.tsx`.
- [x] `src/features/audit/components/audit-filters.test.tsx` — perilaku URL yang didorong `next/navigation` (mock), bukan trivia implementasi.
- [x] `docs/ARCHITECTURE.md` §3.1, §14.7, dan §15 disinkronkan.

### 7.3.2 Sengaja di luar scope

- [ ] RBAC `audit:read` untuk page dan `features/audit/service.ts` — masih Sprint 8 bersama guard `/settings/logs`; `requireSession()` masih placeholder.
- [ ] CSV export dari hasil filter.
- [ ] Real-time tail (refresh/polling event baru).
- [ ] Filter tanggal `from`/`to` di UI. Schema sudah menerima keduanya dan halamannya sudah meneruskannya, tapi tidak ada kontrol tanggal di filter bar.
- [ ] UI verifikasi hash chain. `verifyAuditIntegrity()` masih hanya dipakai `/settings/logs`, dan false positive setelah overflow (§7.4) harus diperbaiki lebih dulu.
- [ ] UI retention/disposal audit; disposisi log masih milik `/settings/logs`.
- [ ] Stat row dari `getAuditSummary()`: perlu label baru di `AUDIT_PAGE_CONFIG` dulu, jadi tidak ditambahkan di sprint ini.

## Sprint F5+ — Frontend-Only Backlog

- User detail/profile page.
- `docs/INTEGRATION.md` untuk mengganti mock service dengan API.
- Auth backend, database, ORM, dan Better Auth di luar scope template.
- [ ] Delivery, sinkronisasi lintas perangkat, dan enforcement notifikasi membutuhkan backend; UI ini bukan pengganti authorization.

## Komponen shadcn Kumulatif

```bash
npx shadcn@latest add sidebar breadcrumb
npx shadcn@latest add command
npx shadcn@latest add table select
```

## Target Sprint 1

Dashboard menampilkan sidebar, topbar sticky, user placeholder, dan area konten yang dapat digunakan bersama. Mobile mengubah sidebar menjadi Sheet; desktop dapat collapse ke mode icon.

## Estimasi

| Sprint | Durasi | Output |
|---|---:|---|
| 0 | ½ hari | Konfigurasi, env, security headers, dark mode |
| 1 | 1–2 hari | Shell dashboard lengkap |
| 2 — CMS Settings | 1–2 hari | Polish navigasi dan halaman pengaturan CMS |
| 3 | 1–2 hari | DataTable pattern |

- [x] PublicHeader memakai CTA anonim ke `/login` dan `/register`; session production belum tersedia.
- [ ] (backend-plug) Jika recycler menghubungkan auth, tampilkan CTA "Buka Dashboard" hanya setelah session diverifikasi di server.

## Keputusan Desain

1. Gunakan komponen shadcn sidebar resmi, bukan membuat sidebar dari nol.
2. Gunakan PageShell sebagai wrapper konsisten untuk setiap halaman.
3. Tunda auth dan DB sampai layout terbukti secara visual.
4. Jangan menjalankan `npm run dev` untuk task ini; verifikasi menggunakan lint dan build.
