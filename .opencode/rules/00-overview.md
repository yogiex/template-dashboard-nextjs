# 00 — Overview Repo `template-nextjs-dashboard`

> Rules ini untuk AI agent yang mengerjakan task di repo ini.
> Rules arsitektur detail ada di `01-architecture.md`.
> Semua klaim di bawah sudah diverifikasi terhadap working tree (Next `16.3.6`).

## Apa Ini

Template dashboard Next.js (App Router) bergaya **frontend-only** yang dirancang
menjadi titik awal project baru. Isinya:

- Landing page + halaman publik statis (`/`, `/about`, `/contact`, `/privacy`, `/terms`).
- Auth UI lengkap (login, register, MFA, lupa/reset password, verifikasi email, invite) tanpa backend.
- Dashboard admin: KPI + chart, tabel user (CRUD), matriks role/permission, halaman
  settings, audit log, observability, dan UEBA (User Entity Behavior Analytics).
- Dockerfile + `docker-compose.yml` + `nginx/` untuk self-host.

Visi (dari `docs/GOALS.md`): **template yang dikelola seperti CMS** — kustomisasi
umum (nama app, navigasi, konten) lewat satu sistem settings, bukan menyunting 20 file.
Fase 1 = config di `src/config/`; Fase 2 = panel settings di dashboard (belum ada).

## Status

| Area | Status (verifikasi di kode) |
| --- | --- |
| Frontend | Lengkap dan bisa dijalankan (`npm run dev` / `build` / `start`) |
| Backend / database | **Belum ada.** Tidak ada `src/lib/db.ts`; semua service memakai store in-memory (`src/features/user/service.ts` memakai array `MOCK_USERS`) |
| Session | **Belum ada.** `requireSession()` di `src/lib/rbac.ts` mengembalikan user placeholder `usr_placeholder` dengan role `admin` |
| RBAC | Helper sudah ada dan dipakai Server Action (`requireRole(session, "admin")`), tapi session placeholder berarti enforcement belum nyata |
| Route handler (`route.ts`) | **Belum ada satu pun** di repo |
| `proxy.ts` (middleware Next 16) | **Belum ada.** Guard saat ini hanya di Server Action/service |
| Automated test | **Belum ada.** `package.json` hanya punya `dev`, `build`, `start`, `lint` |
| Security headers | Aktif di `next.config.ts`, termasuk CSP statis (bukan nonce) |
| `cacheComponents` | **Tidak aktif** di `next.config.ts` |
| Email / kontak | Mock: `sendContactMessage` hanya validasi, rate-limit, dan log (`delivery: "log-only"`) |
| Duplikasi domain | `src/features/role/` dan `src/features/roles/` **belum dikonsolidasikan** (keduanya ada) |

Status sprint rinci ada di `docs/SPRINT.md`. Sprint 0–3 dan F1–F6 sudah selesai;
sisa item merupakan backend-dependent work (auth, DB, RBAC enforcement, permission mutation).

## Target User

1. **AI agent / coding assistant** yang mengubah kode repo ini — aturan utama.
2. **Developer** yang me-*clone* template ini sebagai project baru dan mengganti
   branding/konten lewat `src/config/`.
3. **Reviewer** yang butuh daftar aturan singkat tanpa membaca 12 dokumen.

## Tabel Stack

| Item | Versi / nilai | Sumber |
| --- | --- | --- |
| Next.js | `16.3.6` (App Router) | `package.json` |
| React / React DOM | `19.2.8` | `package.json` |
| TypeScript | `^5`, `strict: true`, `noEmit: true` | `tsconfig.json` |
| Tailwind CSS | `^4` via `@tailwindcss/postcss` | `package.json` |
| ESLint | `^9` + `eslint-config-next` `16.3.6` | `package.json` |
| UI primitives | `@base-ui/react` `^1.8.0` (bukan Radix) | `package.json` |
| shadcn config | style `base-nova`, `rsc: true`, baseColor `neutral`, icon `lucide` | `components.json` |
| Validasi | `zod` `^3.25` | `package.json` |
| Form | `react-hook-form` `^7.88` + `@hookform/resolvers` | `package.json` |
| Chart | `recharts` `^3.8` (dimuat lewat client wrapper) | `package.json` |
| Grafik alur | `@xyflow/react` `^0.12`, `@dagrejs/dagre` | `package.json` |
| Theming | `next-themes` `^0.4` | `package.json` |
| Toast | `sonner` `^2` | `package.json` |
| QR | `qrcode.react` | `package.json` |
| Logging | `pino` `^10` + `src/lib/logger.ts` | `package.json` |
| Server-only guard | paket `server-only` | `package.json` |
| Path alias | `@/*` → `./src/*` | `tsconfig.json` |
| Merge util | paket `cn` (bukan `@/lib/utils`) | `src/components/layout/page-shell.tsx` |
| Output | `output: "standalone"` | `next.config.ts` |

> Catatan: versi Next **16.3.6** (bukan 15.x). `middleware.ts` sudah disebut **Proxy**
> dengan konvensi `proxy.ts`, tetapi file tersebut belum ada di repo ini.

## Struktur Folder

```text
src/
├── app/                     # routing + composition (App Router)
│   ├── (public)/            # landing, about, contact, privacy, terms  → layout punya <main>
│   ├── (auth)/              # 7+ route auth UI                        → AuthShell punya <main>
│   ├── (dashboard)/         # dashboard, users, roles, settings/*     → PageShell punya <main>
│   ├── maintenance/         # route statis terpisah
│   ├── layout.tsx           # root layout, font, ThemeProvider, metadata
│   ├── globals.css          # token semantic (oklch), dark via `.dark`
│   ├── error.tsx, not-found.tsx, robots.ts, sitemap.ts
├── components/
│   ├── ui/                  # primitive Base UI (button, dialog, form, sidebar, table, …)
│   ├── custom/              # komposisi app (theme-*, command-menu, empty/error state)
│   └── layout/              # shell: page-shell, sidebar, header, footer
├── config/                  # konstanta non-secret + copy UI (sumber kebenaran branding)
├── features/                # feature-first: 13 domain
│   └── <fitur>/             # actions.ts | schema.ts | service.ts | types.ts | components/ | lib/ | hooks/
├── hooks/                   # use-mobile.ts
└── lib/                     # api, color, env, error, logger, parse-breadcrumb,
                            # password-strength, rate-limit, rbac, redact,
                            # request-context, search-params, totp
```

Dokumen `docs/ARCHITECTURE.md` §3.1 memuat inventaris yang sudah **tertinggal** dari
working tree (mis. tidak menyebut `features/audit`, `ueba`, `observability`, `log-management`,
`contact`; `next.config.ts` di sana tidak menyebut CSP). Verifikasi selalu ke kode.

## Domain yang Ada

`src/features/` berisi 15 domain (snapshot 2026-09-25; repo masih aktif berkembang — jalankan
`ls src/features` sebelum menyebut domain yang belum tercantum di sini):

| Domain | Entry | Status |
| --- | --- | --- |
| `auth` | `actions.ts`, `service.ts`, `schema.ts`, `mfa-session.ts`, 10 komponen | UI lengkap, credential mock `demo@example.com` / `password123` |
| `user` | `actions.ts`, `service.ts`, `schema.ts`, `types.ts` | CRUD mock (create/update/delete) dengan rate limit + RBAC admin |
| `roles` | `actions.ts`, `service.ts`, `schema.ts`, `types.ts` | Matriks permission + role cards |
| `role` | `service.ts`, `schema.ts`, 4 komponen | **Duplikat** dari `roles/`, belum digabung |
| `dashboard` | `service.ts`, `schema.ts`, 8 komponen | KPI, revenue/traffic chart, activity table (mock) |
| `settings` | `service.ts`, `schema.ts`, `lib/`, `hooks/` | `/settings/general` (read-only) + `/settings/appearance` (localStorage) |
| `log-management` | `actions.ts`, `service.ts`, `schema.ts`, `lib/` | `/settings/logs/*`: access, sources, retention, disposal |
| `observability` | `actions.ts`, `service.ts`, `schema.ts`, `types.ts`, `lib/` | `/settings/observability`, metrics via `withMetric`/`trackMetric` |
| `ueba` | `service.ts`, `schema.ts`, `types.ts`, `lib/` | `/settings/ueba`, `/settings/ueba/[actorId]`, risk/anomaly/baseline |
| `audit` | `service.ts`, `schema.ts`, `types.ts`, `lib/` | Log audit, hanya `lib/` (tanpa komponen) |
| `notification` | `service.ts`, `schema.ts`, `components/`, `hooks/` | Mock + unread state di localStorage |
| `landing` | `components/` saja | 5 section Server Component, FAQ pakai `<details>` native |
| `legal` | `components/legal-article.tsx` | Konten dari `config/public-pages.ts` |
| `contact` | `actions.ts`, `schema.ts`, 1 komponen | Server action + rate limit, tanpa Route Handler |
| `code-graph` | `components/`, `data/`, `lib/`, `types.ts` | Visualisasi dependensi kode, **baru & masih berkembang** — baca `docs/` dan `src/config/code-graph.ts` dulu |
| `organization` | `service.ts`, `schema.ts`, `types.ts`, `lib/` | **Baru & belum lengkap** — jangan anggap sudah jadi pola |

Config: `appearance`, `auth-pages`, `dashboard`, `login-page`, `log-management`,
`mfa-pages`, `observability`, `public-pages`, `register-page`, `roles`, `site`.

## Dokumentasi Acuan

Baca dokumen yang relevan **sebelum** menyentuh file terkait (jangan baca semuanya):

| Kalau menyentuh | Baca | Isi penting |
| --- | --- | --- |
| `src/app/**` | `docs/ARCHITECTURE.md` §4, §5, §8, §15 | Server Component default, `params`/`searchParams` Promise, `<main>` ownership, peta route |
| `src/app/(auth)/**` | `ARCHITECTURE.md` §14.2, §14.3, §14.7 | `FormItem space-y-2`, envelope error, copy dari config, `AuthShell` |
| `src/app/(dashboard)/**`, `page-shell.tsx` | `ARCHITECTURE.md` §8, §10 | `PageShell` sudah ada `<main>`, auth guard, model cache |
| `src/app/(public)/**`, `features/landing/**` | `ARCHITECTURE.md` §14.9, §14.10 | static generation, metadata, anchor `id` |
| `src/components/ui/**` | `docs/CONVENTIONS.md` | primitive Base UI, tanpa logika bisnis |
| `src/components/custom/**` | `docs/PERFORMANCE.md`, `docs/CONVENTIONS.md` | client boundary sekecil mungkin |
| `src/features/*/actions.ts` | `ARCHITECTURE.md` §4.4, §10.6, `docs/SECURITY.md` | Server Action = entry publik, rate limit, jangan leak exception |
| `src/features/*/service.ts` | `ARCHITECTURE.md` §6, `SECURITY.md` §A05 | DAL satu-satunya pintu data, `import "server-only"` |
| `src/features/*/schema.ts` | `ARCHITECTURE.md` §10.3, §14.4 | validasi boundary, tanpa type assertion |
| `src/config/**` | `ARCHITECTURE.md` §14.7 | hanya konstanta non-secret |
| `src/lib/**` | `docs/SECURITY.md`, `ARCHITECTURE.md` §7.5, §10.7 | logger tanpa PII, taxonomy error, rate limit |
| `next.config.ts`, header keamanan | `docs/SECURITY.md`, `ARCHITECTURE.md` §10.4, §10.6 | header bukan pengganti auth |
| Review sebelum merge | `docs/SECURITY.md` | checklist OWASP + merge gate |
| Sprint/roadmap | `docs/SPRINT.md`, `docs/GOALS.md` | status sprint, definisi selesai |
| Backend/DB/email | `docs/INTEGRATION.md` | pola integrasi, batas mock vs nyata |
| Setup lokal | `docs/SETUP.md` | env, seed, perintah |

## Cara AI Harus Bersikap

1. **Verifikasi sebelum menulis.** Klaim dokumentasi bisa kedaluwarsa; cek file
   nyata lebih dulu. Jangan mengarang API (mis. `revalidateTag(tag, profile)`,
   `use cache`, atau `cacheComponents`) — repo ini belum memakainya.
2. **Benar secara build.** Setelah perubahan selalu jalankan `npm run lint`,
   `npx tsc --noEmit`, dan `npm run build`. Test runner (Vitest) sudah terpasang:
   jalankan `npm test` bila menyentuh kode yang punya test.
3. **Perubahan minimal di boundary yang benar.** Jangan memindahkan business logic
   ke komponen, jangan menambah client boundary tanpa alasan.
4. **Jangan membuat commit/branch/push** kecuali diminta eksplisit.
5. **Hormati limitasi template.** Ini frontend-only: usul fitur yang butuh session,
   database, atau email harus ditulis eksplisit sebagai mock atau ditolak dengan
   alasan — jangan diam-diam mengarang persistence.
6. **Jangan menambah konsep role/permission baru** sebelum duplikasi
   `role/` vs `roles/` diputuskan.
7. **Jujur soal gap.** Kalau sesuatu belum ada (backend, test, proxy, RBAC nyata),
   tulis sebagai "belum ada" di dokumen, jangan disamarkan jadi sudah ada.
8. **Perbarui `docs/ARCHITECTURE.md`** (§3.1, §15, §16) pada commit yang sama bila
   kamu mengubah struktur folder, config, atau status fitur.
9. Bahasa output dan komentar: Bahasa Indonesia, konsisten dengan repo.
