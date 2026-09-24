# Sprint Plan — Dashboard Layout

Rencana kerja membangun layout dashboard template. Setiap sprint menghasilkan perubahan yang dapat dilihat dan dijalankan di browser.

## Definition of Done

- [ ] Mengikuti `docs/CONVENTIONS.md` dan `CLAUDE.md`.
- [ ] `npm run lint` dan `npm run build` berhasil.
- [ ] Diuji desktop, mobile, light mode, dan dark mode.
- [ ] Perubahan di-commit dengan Conventional Commit.

## Sprint 0 — Fondasi

### 0.1 Konfigurasi aplikasi terpusat

- [x] `src/config/site.ts` berisi nama, deskripsi, tipe navigasi, dan `sidebarNav`.
- [x] Sidebar nanti membaca konfigurasi, bukan hardcode menu.

### 0.2 Security headers dan environment

- [x] Security headers di `next.config.ts`.
- [x] `.env.example` untuk `NEXT_PUBLIC_APP_URL`.
- [x] `src/lib/env.ts` untuk akses environment typed.

### 0.3 Dark mode

- [x] `next-themes` dipasang.
- [x] `src/components/layout/theme-provider.tsx`.
- [x] `src/components/custom/theme-toggle.tsx` dengan Light, Dark, dan System.
- [x] Provider dipasang di root layout.
- [x] `suppressHydrationWarning` dipasang pada `<html>`.
- [x] CSS memakai class-based dark mode agar pilihan pengguna controlling.

## Sprint 1 — Layout Shell

### 1.1 Route group

- [ ] `src/app/(dashboard)/layout.tsx`.
- [ ] `src/app/(dashboard)/dashboard/page.tsx`.
- [ ] `src/app/(dashboard)/dashboard/loading.tsx`.
- [ ] Redirect route root ke `/dashboard` atau hapus page default.

### 1.2 Sidebar desktop dan mobile

- [ ] Tambahkan komponen shadcn sidebar.
- [ ] `src/components/layout/app-sidebar.tsx` membaca `sidebarNav`.
- [ ] `SidebarProvider` dipasang di dashboard layout.
- [ ] Active state memakai `usePathname`.
- [ ] Collapse state memakai cookie shadcn.
- [ ] Mobile sidebar tampil sebagai Sheet.

### 1.3 Topbar

- [ ] `src/components/layout/site-header.tsx` sticky.
- [ ] Trigger sidebar, separator, theme toggle, dan user dropdown.
- [ ] User dropdown masih placeholder tanpa auth.

### 1.4 PageShell

- [ ] `src/components/layout/page-shell.tsx`.
- [ ] Props `title`, `description`, `children`, dan `actions`.
- [ ] Dashboard placeholder memakai PageShell.

## Sprint 2 — Polish

- [ ] Breadcrumbs dari pathname.
- [ ] Command menu dengan shortcut Cmd/Ctrl+K.
- [ ] Placeholder users dan settings pages.
- [ ] Custom `error.tsx` dan `not-found.tsx`.

## Sprint 3 — DataTable Pattern

- [ ] Feature user dengan schema, types, mock service, dan actions.
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
| 2 | 1 hari | Breadcrumbs, command menu, error pages |
| 3 | 1–2 hari | DataTable pattern |

## Keputusan Desain

1. Gunakan komponen shadcn sidebar resmi, bukan membuat sidebar dari nol.
2. Gunakan PageShell sebagai wrapper konsisten untuk setiap halaman.
3. Tunda auth dan DB sampai layout terbukti secara visual.
4. Jangan menjalankan `npm run dev` untuk task ini; verifikasi menggunakan lint dan build.
