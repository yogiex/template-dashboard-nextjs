# 10 — Git

## Status Repository yang Terverifikasi

| Fakta | Nilai (diverifikasi 2026-09) |
| --- | --- |
| Branch aktif | `dev` — **tidak ada `main`/`master`** |
| Target CI | `pull_request` dan `push` ke `dev` (`.github/workflows/ci.yml`, `.github/workflows/security.yml`) |
| CI | `npm ci` → `npm run lint` → `npx tsc --noEmit` → `npm run build` |
| Security CI | gitleaks, `npm audit --audit-level=high`, CodeQL, SBOM CycloneDX, dependency-review |
| Dependabot | mingguan (npm, docker) + bulanan (github-actions), timezone Asia/Jakarta |
| PR/issue template | **tidak ada** di `.github/` — hanya `dependabot.yml` dan `workflows/` |
| `package-lock.json` | **tracked** (`git ls-files` mengonfirmasi) |
| `.env.example` | **tracked**; `.env*` lain diabaikan oleh `.gitignore` |

## Gaya Commit Message yang Benar-Benar Dipakai

`git log --oneline` menunjukkan repo ini **hanya pernah memakai dua type**: `feat` dan `docs`. Semua pesan dalam bahasa Inggris, lowercase, bentuk imperative, dengan scope berupa nama domain.

```text
feat(auth): polish login and register pages with shared auth shell
docs: add integration handbook for backend connection and recycle checklist
docs: mark sprint F1 as complete
feat(settings): add settings pages with brand color switcher persisted to localStorage
feat(dashboard): add KPI cards, lazy-loaded charts, and activity table with validated mock service
feat(public): add landing, legal pages, custom error/404, and SEO files
feat(theme): add dark mode with next-themes
feat(config): add centralized site config and navigation
feat(error): add RFC 9457 error contract
```

Pola yang bisa disimpulkan:

- Format `type(scope): description`, scope opsional (`docs:` tanpa scope juga dipakai).
- **Tidak ada trailing period.**
- Tidak ada ticket ID, tidak ada body-only commit, tidak ada emoji.
- Scope mengikuti area fitur, bukan nama file: `auth`, `settings`, `dashboard`, `public`, `theme`, `config`, `error`, `lib`.

## Conventional Commits

Type yang boleh dipakai (sesuai `docs/CONVENTIONS.md` § Git):

| Type | Kapan |
| --- | --- |
| `feat` | Fitur atau capability baru yang terlihat user |
| `fix` | Perbaikan bug |
| `refactor` | Perubahan struktur tanpa mengubah perilaku |
| `perf` | Perbaikan performa |
| `docs` | Dokumentasi saja |
| `chore` | Tooling, dependency, konfigurasi build |

Aturan:

- Satu commit = satu tujuan. Jangan menggabungkan refactor + dependency update + fitur baru dalam satu commit.
- Subject ≤ 72 karakter, tanpa period di akhir.
- Tulis perubahan dalam scope-nya: `feat(auth):`, bukan `feat:`.
- Kalau perubahan menyentuh banyak area, pilih scope utama dan sebutkan detail di body.

Contoh yang sesuai dengan gaya repo:

```text
feat(user): add paginated user table with sortable columns
fix(auth): stop leaking internal error message on MFA failure
refactor(audit): extract hash chain verification into lib/integrity
docs(security): add threat model for settings area
chore(deps): bump zod to 3.25.76
```

## Branch Naming

- Branch fitur: `feat/nama-fitur` — contoh: `feat/user-bulk-actions`
- Branch perbaikan: `fix/nama-bug` — contoh: `fix/mfa-timer-drift`
- Nama **`kebab-case`**, Bahasa Inggris, mendeskripsikan perubahan.
- prefixed docs: `docs/nama-topik`
- Base branch: `dev`.
- Hapus branch setelah merge.
- Jangan pernah commit langsung ke `dev` untuk perubahan yang butuh review — buat branch fitur.

## Jangan Commit

- ❌ **`.env`, `.env.local`, `.env.production`, dan variasi lainnya.** Hanya `.env.example` (nama variabel + contoh non-secret) yang boleh masuk repo. Sudah ditangani `.gitignore` (`.env*` + `!.env.example`).
- ❌ **Secret/credential apa pun** — API key, token, password, connection string, private key, `*.pem`. gitleaks ada di CI, tapi prevention lebih murah daripada rotasi.
- ❌ `node_modules/`, `.next/`, `out/`, `build/`, `coverage/`.
- ❌ `*.tsbuildinfo`, `next-env.d.ts` (sudah di-ignore).
- ❌ File OS/editor: `.DS_Store`, `npm-debug.log*`, `*.log`.
- ❌ `.vercel/`.
- ❌ Credential mock `demo@example.com` / `password123` di file baru.
- ✅ **`package-lock.json` justru WAJIB di-commit** bersama perubahan dependency. Ini berbeda dari kebiasaan umum: `docs/SECURITY.md` A08 dan `docs/CONVENTIONS.md` § Git keduanya menyatakannya, dan CI memakai `npm ci` yang butuh lockfile konsisten. Mencoret lockfile = CI bisa memakai dependency yang berbeda dari yang kamu uji.

## Checklist Sebelum Commit

```bash
git status                      # file apa saja yang berubah
git diff                        # review isi per file
git diff --staged               # review isi yang akan masuk commit
npx tsc --noEmit && npm run lint && npm run build
git log --oneline -5            # cek gaya pesan commit terakhir
```

- [ ] Hanya file yang memang sengaja diubah yang distage.
- [ ] Tidak ada `.env`, secret, `node_modules/`, `.next/`, atau artifact build.
- [ ] `npm run lint` hijau.
- [ ] `npx tsc --noEmit` hijau.
- [ ] `npm run build` hijau.
- [ ] Perubahan yang mengubah kontrak aplikasi (route, config, status fitur) sudah memperbarui `docs/ARCHITECTURE.md` di commit yang sama.
- [ ] Tidak ada `console.log` debugging yang tertinggal; logger terstruktur (`src/lib/logger.ts`) dipakai kalau memang perlu log.
- [ ] Tidak ada data sensitif di log, screenshot, atau dokumentasi.
- [ ] `package-lock.json` ikut di-commit bila dependency berubah.
- [ ] Commit message mengikuti Conventional Commits dan gaya repo.
- [ ] Tidak ada generated file yang bisa di-regenerate (`tsconfig.tsbuildinfo`).

## Pull Request

Repo **tidak punya** `.github/PULL_REQUEST_TEMPLATE.md`, jadi isi deskripsi PR secara manual. Target PR adalah branch `dev`, dan kedua workflow akan berjalan otomatis.

Isi deskripsi yang diminta `docs/CONVENTIONS.md` dan `CONTRIBUTING.md`:

- **Ringkasan** — apa yang berubah dan mengapa, 1–3 baris.
- **Cara verifikasi** — langkah yang sudah dijalankan (`npm run lint`, `npx tsc --noEmit`, `npm run build`) dan langkah manual yang perlu dicoba user.
- **Screenshot** — bila ada perubahan visual.
- **Catatan risiko & follow-up** — termasuk hal yang sengaja belum dikerjakan.
- **Dokumentasi** — dokumen mana yang diperbarui dan mana yang perlu review.

Checklist sebelum merge (dari `CONTRIBUTING.md` + `docs/SECURITY.md`):

- [ ] Perubahan mengikuti arsitektur dan placement file.
- [ ] Input eksternal tervalidasi di server, bukan hanya di client.
- [ ] Authorization diperiksa ulang di server boundary; kepemilikan resource diverifikasi (IDOR).
- [ ] Tidak ada secret/token/data sensitif yang terekspos.
- [ ] Loading, error, empty state, dan aksesibilitas diperiksa.
- [ ] Dokumentasi diperbarui bila kontrak aplikasi berubah.
- [ ] Lint, typecheck, dan build berhasil.
- [ ] Risiko dan follow-up dicatat.

## Aturan untuk AI Agent

Aturan ini mengikat agent lebih ketat daripada aturan untuk manusia.

- ❌ **Jangan `git commit`, `git push`, `git merge`, atau `git rebase` tanpa perintah eksplisit user.** "Selesaikan tasknya" bukan izin commit. Izin berlaku untuk satu operasi itu saja, bukan untuk operasi berikutnya.
- ❌ **Jangan `git add .` atau `git add -A`.** Selalu stage file spesifik: `git add src/features/user/service.ts`. `git add .` di repo ini akan menyapu 90+ file yang belum di-commit dan mencampur perubahan orang lain.
- ❌ **Jangan `git commit --no-verify`, `--no-gpg-sign`, atau mem-bypass hook.** Kalau hook gagal, perbaiki penyebabnya.
- ❌ **Jangan `git reset --hard`, `git checkout -- .`, `git clean -fd`, atau `git stash` tanpa izin.** Perintah itu membuang pekerjaan yang belum di-commit.
- ❌ **Jangan `git checkout <branch>` untuk berpindah konteks.** Itu bisa menimpa file yang sudah dimodifikasi. Bekerja di working tree yang diberikan.
- ❌ **Jangan buat branch, tag, atau stash tanpa diminta.**
- ❌ **Jangan amend commit milik orang lain** dan jangan pernah force-push.
- ❌ **Jangan mengubah `git config`** (user.name, user.email, hooks, pull.rebase).
- ❌ **Jangan menjalankan `npm install <paket>` tanpa persetujuan user** — ini mengubah `package.json` + `package-lock.json` dan menjalankan lifecycle script dependency. Tanya dulu (lihat `11-workflows.md`).
- ⚠️ Working tree repo ini **sangat kotor** (>90 file termodifikasi + untracked). Selalu periksa `git status` dan pastikan hanya file milikmu yang distage.
- ✅ Setelah selesai mengubah file: laporkan ringkas file mana yang berubah dan hasil `npm run lint` / `npx tsc --noEmit` / `npm run build`. Biarkan user yang memutuskan commit.
