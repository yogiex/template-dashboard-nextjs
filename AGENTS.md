<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md — Panduan untuk AI Coding Agent

> Untuk opencode-ai, Claude Code, Cursor, Copilot Workspace.

## Baca Dulu (WAJIB)

Sebelum generate, edit, atau review kode, baca rules ini **secara berurutan**:

1. `@.opencode/rules/00-overview.md` — konteks project, stack, status fitur
2. `@.opencode/rules/01-architecture.md` — prinsip arsitektur, service layer, cache
3. `@.opencode/rules/02-conventions.md` — naming, struktur file, import order
4. `@.opencode/rules/03-components.md` — Server vs Client, form, aksesibilitas
5. `@.opencode/rules/04-data-fetching.md` — RSC, cache, Server Action, envelope
6. `@.opencode/rules/05-error-handling.md` — `AppError`, error codes, boundary
7. `@.opencode/rules/06-security.md` — trust boundary, authz, audit, merge gate
8. `@.opencode/rules/12-anti-patterns.md` — yang dilarang

Untuk task spesifik:

| Task | Baca juga |
| --- | --- |
| UI / styling / tema | `@.opencode/rules/07-styling.md` |
| TypeScript | `@.opencode/rules/08-typescript.md` |
| Test | `@.opencode/rules/09-testing.md` |
| Commit / branch / PR | `@.opencode/rules/10-git.md` |
| Resep task (tambah halaman, action, komponen, config) | `@.opencode/rules/11-workflows.md` |

Dokumen acuan panjang tetap ada di `docs/` — lihat tabel pemetaan di bawah.

## Quick Reference

- **Stack**: Next.js 16 (App Router) + React 19 + TypeScript strict + Tailwind v4 + UI primitive berbasis **Base UI** (`@base-ui/react`), bukan Radix.
- **Naming**: file `kebab-case`, komponen `PascalCase`, hook `useCamelCase`, konstanta global `UPPER_SNAKE_CASE`.
- **Default**: Server Component; `"use client"` hanya di leaf interaktif.
- **Validasi**: Zod di server; hasil action berupa envelope `{ success, error }`.
- **Error**: `AppError` (lihat `src/lib/`), jangan `throw` string, jangan leak stack trace.
- **Auth**: session dicek di server pada setiap action & service; jangan percaya nilai dari client.
- **Audit**: event keamanan → `logAudit()` dari `@/features/audit/lib/log-audit` (sudah dipakai di `auth/`, `user/`, `contact/`, `organization/`, `log-management/`; **bukan** di `role/`/`roles/`). Rincian kontrak dan batas mock ada di `docs/AUDIT.md`.
- **Merge gate**: `npm run lint` + `npm run build` harus hijau.

## Pre-Flight Checklist (setiap task)

- [ ] Baca rules yang relevan (di atas).
- [ ] Identifikasi trust boundary & aliran data.
- [ ] Cek file existing — jangan duplikasi util/komponen yang sudah ada.
- [ ] Terapkan pola yang sudah ada di repo, jangan membuat pola baru.
- [ ] Verifikasi klaim dokumentasi terhadap kode sebelum mengandalkannya.
- [ ] `npm run lint && npm run build` ✅
- [ ] Sertakan analisis keamanan bila menyentuh input, auth, atau data.

## Larangan Keras

- ❌ Mengubah struktur folder tanpa alasan kuat.
- ❌ Membuat utility/helper baru kalau sudah ada.
- ❌ Menambah dependency tanpa konfirmasi user.
- ❌ `"use client"` di `layout.tsx`/`page.tsx` kalau tidak perlu.
- ❌ Hardcode string, warna, atau path — pakai `src/config/` dan token semantic.
- ❌ Commit `.env`, secret, atau credential; tidak pernah eksekusi git tanpa diminta.
- ❌ Menyarankan "disable security sementara".

---

# Konteks Kerja Repository Ini

Template dashboard Next.js (App Router) dengan auth UI, dashboard admin, dan landing page publik. Status: **frontend-only**; belum ada backend, database, atau session nyata.

Perintah inti: `npm run dev`, `npm run lint`, `npm run build`, `npm run start`. Typecheck dilakukan dengan `npx tsc --noEmit` (belum ada script `typecheck`). Config test runner (Vitest) sudah ada di working tree tapi belum diverifikasi di commit ini — sebelum memakainya, pastikan `npm test` benar-benar hijau.

## Peta File → Dokumen Acuan

Baca dokumen yang relevan **sebelum** menyentuh file di kolom kiri. Jangan membaca semua dokumen; pilih sesuai area.

| Kalau menyentuh | Baca lebih dulu | Isi penting |
| --- | --- | --- |
| `src/app/**/page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx` | `docs/ARCHITECTURE.md` §4, §5, §8, §11, §15 | Server Component default, `params`/`searchParams` adalah Promise, kepemilikan `<main>`, peta route |
| `src/app/(auth)/**` | `docs/ARCHITECTURE.md` §14.2, §14.3, §14.7 | pola `FormItem`, envelope error, config-driven copy, `AuthShell` |
| `src/app/(dashboard)/**`, `src/components/layout/page-shell.tsx` | `docs/ARCHITECTURE.md` §8, §10 | `PageShell` sudah punya `<main>`, auth guard, cache model |
| `src/app/(public)/**`, `src/features/landing/**` | `docs/ARCHITECTURE.md` §14.9, §14.10 | static generation, metadata, config copy, anchor `id` |
| `src/app/sitemap.ts`, `src/app/robots.ts`, metadata export | `docs/ARCHITECTURE.md` §14.9 | `LAST_MODIFIED` konstanta, noindex untuk `(auth)` |
| `src/app/globals.css`, `src/app/layout.tsx` (font) | `docs/ARCHITECTURE.md` §14.8 | token semantic, ivory warm light theme, font variable, `motion-reduce` |
| `src/components/ui/**` | `docs/CONVENTIONS.md` | primitive Base UI, jangan logika bisnis di sini |
| `src/components/layout/**` | `docs/ARCHITECTURE.md` §14.1, §14.6 | `render` bukan `asChild`, shell tidak boleh `<main>` ganda |
| `src/components/custom/**` | `docs/PERFORMANCE.md`, `docs/CONVENTIONS.md` | client boundary sekecil mungkin |
| `src/features/*/actions.ts` | `docs/ARCHITECTURE.md` §4.4, §10.6, `docs/SECURITY.md` | Server Action bukan callback privat, rate limit, jangan leak exception |
| `src/features/*/service.ts` | `docs/ARCHITECTURE.md` §6, `docs/SECURITY.md` §A05 | DAL, satu-satunya pintu data, `import "server-only"` |
| `src/features/*/schema.ts` | `docs/ARCHITECTURE.md` §10.3, §14.4 | validasi boundary, tanpa type assertion |
| `src/features/*/components/*form*.tsx` | `docs/ARCHITECTURE.md` §14.2, §14.3, `docs/ERROR-HANDLING.md` | spacing, `h-10`, `try/catch`, `Object.keys().length` |
| `src/config/**` | `docs/ARCHITECTURE.md` §14.7 | hanya konstanta non-secret, satu sumber kebenaran per domain |
| `src/lib/**` | `docs/SECURITY.md`, `docs/ARCHITECTURE.md` §7.5, §10.7 | logger tanpa PII, error taxonomy, rate limit |
| `proxy.ts`, `next.config.ts`, header keamanan | `docs/SECURITY.md`, `docs/ARCHITECTURE.md` §10.4, §10.6 | Proxy bukan security boundary |
| `docs/SECURITY.md` review sebelum merge | `docs/SECURITY.md` | checklist OWASP + merge gate |
| `src/features/audit/**`, menambah call site `logAudit()`, atau memakai histori audit sebagai bukti | `docs/AUDIT.md` | satu pintu tulis, kontrak never-throw, batas redaksi, hash chain, batas in-memory |
| Roadmap/sprint | `docs/SPRINT.md`, `docs/GOALS.md` | status sprint, definisi selesai |
| Backend/DB/email | `docs/INTEGRATION.md` | pola integrasi, batas mock vs nyata |
| Setup lokal | `docs/SETUP.md` | env, seed, perintah |

## Prinsip yang Paling Sering Dilanggar di Sesi Sebelumnya

Daftar ini berasal dari review kode nyata; tidak ada di dokumentasi lain.

1. **`PageShell` hanya untuk `(dashboard)`.** `(public)/layout.tsx` sudah punya `<main>`; `(auth)` memakai `AuthShell` yang juga punya `<main>`.
2. **`Button` memakai `render={<Link … />}`**, bukan `asChild` (Base UI).
3. **`FormItem` wajib `space-y-2`**, input form `h-10`, jarak antar field `space-y-5`.
4. **Jangan `false as true`** atau assertion lain untuk menjinakkan compiler; ubah schema.
5. **Alert umum di form** ditentukan `Object.keys(fieldErrors ?? {}).length > 0`, bukan `!fieldErrors`.
6. **Submit form selalu `try/catch`** + `console.error` ringkas; error boundary tidak menangkap event handler.
7. **Copy user-facing dari `src/config/`**, bukan inline di komponen.
8. **Warna lewat token semantic**; jangan hex/arbitrary value, dan jangan hardcode emerald di komponen.
9. **Link footer/header hanya ke route yang ada**; tidak ada `href="#"` placeholder.
10. **`role/` dan `roles/` belum dikonsolidasikan** — jangan menambah fitur role/permission baru sebelum duplikat itu diputuskan.
11. **Jangan mematikan autofill browser** (`readOnly` trick, `autocomplete="one-time-code"`); itu merusak password manager dan aksesibilitas.
12. **Secret/credential mock** (`demo@example.com` / `password123`) hanya untuk demo; jangan dipakai ulang di kode baru.

## Alur Kerja yang Diharapkan

1. Baca dokumen acuan dari tabel di atas untuk file yang akan disentuh.
2. Verifikasi klaim dokumentasi terhadap kode sebelum mengandalkannya (`docs/ARCHITECTURE.md` §3.1 dan §16 sudah diverifikasi per 2026-09).
3. Implementasikan perubahan minimal pada boundary yang benar; jangan memindahkan business logic ke komponen.
4. Jalankan `npm run lint` dan `npm run build` sebelum menyatakan selesai.
5. Bila mengubah struktur folder, config, atau status fitur, perbarui `docs/ARCHITECTURE.md` (§3.1, §15, §16) pada commit yang sama.
6. Jangan membuat commit, branch, atau push kecuali diminta eksplisit.
