<div align="center">

# ⚡ Next.js Dashboard Template

**Modern, opinionated dashboard starter — App Router, React 19, TypeScript strict, Tailwind v4.**

A production-ready (frontend-first) foundation for building admin panels, analytics dashboards,
and internal tools. Designed to be **recycled**: clone it, strip the demo data, wire your backend,
ship.

[![Next.js 16.4](https://img.shields.io/badge/Next.js-16.4-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React 19.2](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS-4-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![CI](https://img.shields.io/github/actions/workflow/status/yogiex/template-dashboard-nextjs/ci.yml?branch=main&style=for-the-badge&label=CI)](https://github.com/yogiex/template-dashboard-nextjs/actions)
[![Deploy](https://img.shields.io/github/deployments/yogiex/template-dashboard-nextjs/github-pages?style=for-the-badge&label=Pages)](https://yogiex.github.io/template-dashboard-nextjs/)

[🚀 Live Demo](https://yogiex.github.io/template-dashboard-nextjs/) · [📖 Docs](#-dokumentasi) · [🤝 Contributing](CONTRIBUTING.md) · [🛡 Security](SECURITY_PRESETS.md)

</div>

---

## 📌 Status Singkat

| Area | Status |
| --- | --- |
| UI publik + auth UI + dashboard shell + content | ✅ Tersedia (UI) |
| Server-side auth (session, guard, login/logout) | 🟡 Diparkir — menunggu host Node |
| Database / ORM / migrasi | ⛔ Belum |
| Production auth (hashing, lockout, MFA nyata) | 🟡 Fondasi + mock |
| Target deploy | 🌐 **GitHub Pages (static export)** |

> **Penting.** Target deploy adalah **GitHub Pages (static export)**. Static export **tidak mendukung** Server Action maupun cookie session. Karena itu autentikasi server-side (session, guard route, login/logout action) sengaja **diparkir** — di situs Pages, login hanya demo tanpa verifikasi kredensial dan seluruh route dashboard bisa dibuka tanpa sesi. Lihat [Deploy target](#-deploy-target-github-pages-static-export).

---

## ✨ Fitur Utama

<table>
<tr>
<td width="50%">

### 🎨 UI & UX
- App Router, Server Component default
- Tailwind v4 + semantic design tokens
- Dark mode (Light / Dark / System) via `next-themes`
- Base UI primitives (bukan Radix)
- shadcn/ui generator-ready
- Responsive shell: sidebar + topbar, breadcrumb, command menu
- DataTable server-driven, KPI cards, lazy charts

</td>
<td width="50%">

### 🛡 Kualitas & Keamanan
- TypeScript strict + alias `@/*`
- Zod validation di boundary server
- RFC 9457 error taxonomy + `problemResponse`
- Pino structured logger (no PII)
- In-memory rate limit (auth UI)
- Config-driven copy (`src/config/`)
- ESLint 9 + husky + commitlint

</td>
</tr>
<tr>
<td width="50%">

### 📦 Feature Modules
- Auth (login, register, forgot/reset, invite, verify)
- Dashboard, users, team, roles, billing, API keys
- Organization, notifications, audit, log management
- Settings: general, appearance, security, MFA,
  notification, observability, UEBA, activity

</td>
<td width="50%">

### 🧪 DevEx
- Vitest + Testing Library + jsdom
- Husky `pre-commit` (lint-staged) & `commit-msg`
- Conventional Commits enforcement
- GitHub Actions: CI, security scan, code graph

</td>
</tr>
</table>

---

## 📚 Table of Contents

- [Status Singkat](#-status-singkat)
- [Fitur Utama](#-fitur-utama)
- [Stack](#-stack)
- [Deploy Target: GitHub Pages (static export)](#-deploy-target-github-pages-static-export)
- [Quick Start](#-quick-start)
- [Scripts](#-scripts)
- [Struktur Project](#-struktur-project)
- [Dokumentasi](#-dokumentasi)
- [Keamanan](#-keamanan)
- [Roadmap & Status](#-roadmap--status)
- [Workflow Reuse Project](#-workflow-reuse-project)
- [Contributing](#-contributing)

---

## 🧱 Stack

| Teknologi | Versi / Role |
| --- | --- |
| [Next.js](https://nextjs.org/) | `16.4.0` — App Router & RSC |
| [React](https://react.dev/) / React DOM | `19.2.8` |
| [TypeScript](https://www.typescriptlang.org/) | `^5` — strict, `@/*` alias |
| [Tailwind CSS](https://tailwindcss.com/) | `^4` via PostCSS |
| [Base UI](https://base-ui.com/) | `^1.8.0` — headless primitive |
| [shadcn/ui](https://ui.shadcn.com/) | generator-ready |
| [Zod](https://zod.dev/) | `^3.25` — validation |
| [React Hook Form](https://react-hook-form.com/) | `^7.88` |
| [next-themes](https://github.com/pacocoursey/next-themes) | `^0.4.6` |
| [pino](https://getpino.io/) | `^10` — structured logger |
| [Vitest](https://vitest.dev/) | `^3.2` — unit test |
| [Node.js](https://nodejs.org/) | `>= 20.9.0` (CI uses 24) |
| package manager | npm (lockfile committed) |

---

## 🌐 Deploy Target: GitHub Pages (static export)

Setiap push ke `main` menjalankan workflow `Deploy to GitHub Pages` (`.github/workflows/deploy.yml`):
`npm run build` dengan `NEXT_PUBLIC_BASE_PATH`, lalu unggah `out/` sebagai Pages artifact.

Karena itu `next.config.ts` memakai `output: "export"` dan fitur yang butuh runtime **tidak bisa dipakai** selama target ini aktif:

| Fitur | Status |
| --- | --- |
| Server Action (`"use server"`) | 🟡 `src/features/auth/actions.ts` diparkir — import akan gagalkan build |
| Cookie / `headers()` pada layout/page | 🟡 guard session di `(dashboard)/layout.tsx` dicabut |
| Route Handler baca Request, proxy/middleware | 🟡 tidak tersedia |
| `headers()` / `redirects()` di `next.config` | 🟡 tidak tersedia |

Workflow CI sengaja memverifikasi keberadaan `out/index.html`, `out/dashboard.html`, `out/login.html` supaya perubahan yang menghilangkan static export **gagal lebih dulu**.

Kalau fitur itu dibutuhkan: pindah ke host Node (Vercel/Railway/Fly), hapus `output: "export"`, kembalikan wiring auth sesuai instruksi di komentar `src/features/auth/actions.ts`.

**Perilaku yang diketahui & sengaja diterima untuk MVP:**
- `/settings/security` ter-export sebagai redirect ke `/login` (butuh id sesi untuk baca status MFA).
- Halaman itu hanya bisa dibuka penuh lokal dengan `DEV_AUTH_BYPASS=1`.

---

## 🚀 Quick Start

```bash
git clone https://github.com/yogiex/template-dashboard-nextjs.git
cd template-dashboard-nextjs
npm ci                      # reproducible (CI-style)
cp .env.example .env.local
npm run dev                 # http://localhost:3000
```

### Perilaku login di situs ini

| Lingkungan | Perilaku login |
| --- | --- |
| Situs Pages (MVP publik) | Submit **tidak memverifikasi kredensial** — hanya notifikasi demo. Semua route dashboard bisa dibuka tanpa sesi. |
| Lokal / dev | Stub klien yang sama; auth server-side (`loginAction`, guard, Log out) baru aktif setelah host Node terpasang |

> Kredensial mock di `src/features/auth/service.ts` (`demo@example.com` / `password123`) hanya berlaku ketika auth server-side diaktifkan kembali — dan tetap **bukan** secret: jangan dipakai ulang di kode/deployment nyata.

### Perilaku yang perlu diverifikasi

```bash
# Selalu jalankan sebelum melaporkan pekerjaan selesai:
npm run lint
npm run build          # tsc + production build
npm test               # vitest
```

---

## 📜 Scripts

| Command | Kegunaan |
| --- | --- |
| `npm run dev` | Development server (hot reload) |
| `npm run lint` | ESLint 9 |
| `npm run build` | Production build (termasuk tipe Next.js) |
| `npm run start` | Serve hasil build (Node, lokal) |
| `npm test` | Vitest (sekali jalan) |
| `npm run test:watch` | Vitest watch mode |
| `npm run test:coverage` | Coverage report |
| `npm run lint:staged` | Lint file yang di-stage |
| `npm run commit` | Conventional commit interaktif |
| `npm run graph` / `graph:quick` / `graph:features` | Dependency graph (`madge`) |

> Typecheck manual diperlukan: `npx tsc --noEmit` (belum ada script `typecheck`).

---

## 🗂 Struktur Project

```text
.
├── docs/                # arsitektur, konvensi, keamanan, performa, …
├── public/              # aset statik + .well-known/security.txt
├── scripts/             # commit helper, code-graph
├── src/
│   ├── app/             # App Router: (auth), (dashboard), (public)
│   ├── components/      # layout, custom, ui primitives
│   ├── config/          # konfigurasi domain (site, dashboard, roles, …)
│   ├── features/        # feature modules + service layer (DAL)
│   └── lib/             # error taxonomy, logger, env, rbac, rate-limit
├── .github/workflows/   # ci, security, deploy (Pages), code-graph
├── components.json      # shadcn config
├── next.config.ts       # static export + base path
├── vitest.config.ts
└── tsconfig.json
```

Detail arsitektur → [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## 🌿 Environment

Salin `.env.example` → `.env.local`. Semua variable sudah didokumentasikan dengan kegunaannya.
Point penting:

- `NEXT_PUBLIC_APP_URL` — URL publik (metadata, sitemap, robots).
- `LOG_LEVEL`, `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`
- Feature flags `FEATURE_*_ENABLED` + `BACKEND_API_URL`
- `NEXT_PUBLIC_BASE_PATH` — subpath GitHub Pages
- `DEV_AUTH_BYPASS=1` — **hanya lokal**, jangan di production

> Jangan commit `.env.local` atau secret apa pun.

---

## 📖 Dokumentasi

| Dokumen | Isi |
| --- | --- |
| [Setup](docs/SETUP.md) | Prasyarat, instalasi, env, command, checklist |
| [Integration Handbook](docs/INTEGRATION.md) | **Panduan recycle ke backend asli** |
| [Architecture](docs/ARCHITECTURE.md) | Prinsip, lifecycle, RSC, service layer, cache |
| [Conventions](docs/CONVENTIONS.md) | Naming, komponen, styling, TS, Git |
| [Security](docs/SECURITY.md) | Checklist OWASP, authz, input, secret, session, logging |
| [Error Handling](docs/ERROR-HANDLING.md) | `AppError`, envelope, boundaries |
| [Performance](docs/PERFORMANCE.md) | Budget, rendering, cache, bundle, monitoring |
| [GOALS](docs/GOALS.md) | Visi, fase, success criteria CMS-like |
| [Security Presets](SECURITY_PRESETS.md) | Baseline keamanan + kontrol yang masih perlu |
| [Contributing](CONTRIBUTING.md) | Workflow, commit format, PR checklist |

> Verifikasi klaim dokumentasi terhadap kode sebelum mengandalkannya (`docs/ARCHITECTURE.md` §3.1 & §16 sudah diverifikasi).

---

## 🛡 Keamanan

**Status jujur (verifikasi kondisi nyata, bukan klaim):**
`next.config.ts` saat ini **tidak mengirim satu pun** header keamanan — blok `headers()` sudah tidak ada (hilang bersamaan dengan `output: "export"`). Gap ini dicatat di `docs/ARCHITECTURE.md` §16. Baseline yang *seharusnya* ditetapkan tercantum di `SECURITY_PRESETS.md`.

Kontrol yang **sudah** ada:
- Validasi input Zod pada UI auth
- Rate limit in-memory (auth UI)
- Logger terstruktur tanpa PII
- Session mock server (kode ada, **diparkir** — token in-memory, hilang saat restart, tanpa verifikasi signature)
- Typed env (`src/lib/env.ts`)

Yang **belum** (production auth):
- Hashing password (DAL menyimpan kredensial demo sebagai string)
- Session durable terverifikasi kriptografis + lockout
- RBAC / permission / ownership check nyata
- CSP, audit dependency, monitoring

> Lihat [docs/SECURITY.md](docs/SECURITY.md) untuk checklist lengkap.

---

## 🗺 Roadmap & Status

| Area | Status | Catatan |
| --- | --- | --- |
| Next.js App Router + route dasar | ✅ Selesai | `src/app/` |
| React, TS strict, Tailwind, ESLint | ✅ Selesai | Fondasi & config |
| Security header dasar | ⚠️ Sebagian | Dikonfigurasi di docs, **belum aktif** di `next.config.ts` |
| Dokumentasi arsitektur & standar | ✅ Selesai | `docs/` |
| Dashboard shell, sidebar, topbar | ✅ Sebagian | Shell + sidebar + topbar tersedia |
| shadcn/ui primitives | ⚠️ Sebagian | Primitive auth & layout dasar |
| UI auth (login/register/etc.) | ⚠️ Sebagian | Stub klien di Pages karena static export |
| Auth & session | 🟡 Diparkir | Kode ada, tidak di-wire |
| Database/ORM/migrasi | ⛔ Belum | Belum ada koneksi |
| Service layer / domain | ⚠️ Sebagian | Feature auth + contract service |
| Server Actions & Route Handler | 🟡 Diparkir | `loginAction`/`logoutAction` ada, tidak di-import |
| Loading/error/empty/not-found | ⚠️ Sebagian | Root fallback; coverage per segment belum |
| Validasi & rate limit | ⚠️ Sebagian | Auth UI schema + in-memory limiter |
| CSP, secure log, audit dep, monitoring | ⛔ Belum | Persyaratan produksi |
| CI/CD & deploy | ⚠️ Sebagian | CI + security scan + Pages aktif; backend pipeline belum |

Urutan pengembangan selanjutnya:
1. Finalisasi identitas, kebutuhan, scope.
2. Tambah shell dashboard & primitive UI seperlunya.
3. Pasang host Node → aktifkan auth server-side (session terverifikasi, hashing, lockout).
4. Service layer, database, schema, migrasi.
5. Authorization pada route/action/handler/service.
6. Validasi input, error handling, loading, empty state.
7. CSP, secure logging, rate limiting, audit dependency.
8. CI/CD, test, monitoring, deployment produksi.

---

## 🔁 Workflow Reuse Project

Template dirancang sebagai **fondasi** yang di-recycle, bukan app siap pakai.

1. Buat salinan repo baru — jangan ubah history asal. Ganti nama package, metadata, branding, deploy config.
2. Verifikasi fondasi: `npm ci && npm run lint && npm run build`.
3. Tentukan kebutuhan fitur (use case, actor, sumber data, authz, env, state UI).
4. Ikuti [`docs/INTEGRATION.md`](docs/INTEGRATION.md) untuk hubungkan backend-mu.
5. Buat struktur seperlunya (`src/app/`, `src/components/`, `src/features/<fitur>/`).
6. Server sebagai satu-satunya pintu data — auth, DB, permission, ownership di server.
7. Tambah auth bila dibutuhkan (library pilihanmu, session, guard).
8. Tambah database bila dibutuhkan (ORM/driver, schema, migrasi).
9. Komponen UI → Tailwind token; shadcn via generator lalu tinjau hasilnya.
10. Validasi & keamanan pada boundary eksternal; jangan kirim secret/token/entity mentah ke client.
11. State loading/error/empty/not-found sedekat mungkin dengan segment data lambat.
12. Test sesuai risiko, update docs, jalankan lint/build/test, catat env baru di `.env.example` tanpa secret.

Alur request yang diharapkan:
```
route/component → feature service → database/API → DTO minimal → UI
```

Server Component digunakan default. `"use client"` hanya pada bagian interaktif (state, event, browser API, dependency client-only).

---

## ✅ Verifikasi Lokal Minimum

```bash
npm run lint
npm run build
npm test
```
Jalankan `npm run start` hanya setelah build berhasil.

---

## 🤝 Contributing

Baca [CONTRIBUTING.md](CONTRIBUTING.md) sebelum berubah.
- Branch: `feat/...` / `fix/...`
- Conventional Commits: `feat(auth): add protected dashboard route`
- Jangan commit secret, `.env.local`, generated output, atau perubahan tak terkait

---

## 📝 License

Belum ada file `LICENSE` di repo ini — treat sebagai source reusable internal. Tambahkan license (mis. MIT) bila kamu publish.

---

<div align="center">

Built with ❤️ on **Next.js 16** · **React 19** · **TypeScript strict**

[⬆ Back to top](#-nextjs-dashboard-template)

</div>
