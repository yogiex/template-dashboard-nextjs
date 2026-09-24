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

## Sprint 3 — DataTable Pattern

- [ ] Feature user dengan schema, types, mock service, dan actions.
- [ ] Service dan action wajib melempar atau memetakan error ke `AppError` dari taxonomy.
- [ ] Form memakai envelope `{ success, error }` dan menampilkan `fieldErrors` serta pesan kode secara seragam.
- [ ] Tabel punya empty state dan error state yang berbeda.
- [ ] Tabel client dengan sort, search, filter role, pagination, dan loading skeleton.
- [ ] Validasi `searchParams` di page sebelum service dipanggil.

## Sprint 4+ — Backlog

- Auth dan keputusan database.
- RBAC helper.
- DB nyata menggantikan mock service.
- Charts dengan dynamic import.
- Notifications dropdown.
- i18n bila diperlukan.

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

- [x] PublicHeader memakai CTA anonim ke `/login` dan `/register`; session nyata belum tersedia.
- [ ] (sprint-4) Jika autentikasi dan route dashboard selesai, tampilkan CTA "Buka Dashboard" hanya setelah session nyata terverifikasi di server.

## Keputusan Desain

1. Gunakan komponen shadcn sidebar resmi, bukan membuat sidebar dari nol.
2. Gunakan PageShell sebagai wrapper konsisten untuk setiap halaman.
3. Tunda auth dan DB sampai layout terbukti secara visual.
4. Jangan menjalankan `npm run dev` untuk task ini; verifikasi menggunakan lint dan build.
