# Contributing

## Workflow

1. Buat atau pilih issue/task yang menjelaskan tujuan perubahan.
2. Buat branch dengan format `feat/nama-fitur` atau `fix/nama-bug`.
3. Ikuti struktur, naming, dan aturan keamanan dalam `docs/CONVENTIONS.md` serta `docs/SECURITY.md`.
4. Tambahkan atau perbarui test sesuai risiko perubahan.
5. Jalankan lint, typecheck/build, dan test yang relevan.
6. Buat Conventional Commit yang menjelaskan satu tujuan perubahan.
7. Ajukan pull request dengan ringkasan, cara verifikasi, screenshot bila relevan, dan catatan risiko.

## Testing

Unit test memakai Vitest dan tinggal di samping file yang diuji sebagai `*.test.ts` atau `*.test.tsx` di bawah `src/`.

```bash
npm test           # sekali jalan
npm run test:watch # mode watch
npm run test:coverage
```

Tidak perlu setup tambahan: alias `@/*` dan environment `jsdom` sudah dikonfigurasi di `vitest.config.ts`. Fokus pada logika murni di `src/lib/` dan schema Zod di `src/features/*/schema.ts`. E2E belum ada di repo ini.

## Commit

Gunakan format `type(scope): description`, misalnya:

```text
feat(auth): add protected dashboard route
fix(api): validate user id before query
docs(security): document session cookie policy
```

Satu commit harus memiliki satu tujuan. Jangan menggabungkan refactor, dependency update, dan fitur baru dalam satu commit jika dapat dipisahkan.

`type` yang valid: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.

Alternatif interaktif: `npm run commit` untuk menjawab prompt type/scope/deskripsi; script ini menulis pesan ke `.git/COMMIT_EDITMSG` lalu menjalankan `git commit`. Pesan tetap divalidasi oleh hook `commit-msg`.

## Git Hooks

Hook dipasang otomatis oleh `husky` saat `npm install` (`prepare`). Hook tidak boleh dilewati dengan `--no-verify`.

- `pre-commit` menjalankan `lint-staged`: `eslint --fix` pada file `*.ts`, `*.tsx`, dan `*.mjs` yang di-stage.
- `commit-msg` menjalankan `commitlint` dengan aturan di `commitlint.config.mjs`.

Perintah yang sama dapat dijalankan manual dengan `npm run lint:staged`.

## Testing dan Verifikasi

Verifikasi lokal sebelum membuka pull request:

```text
npm run lint   # ESLint
npx tsc --noEmit   # typecheck
npm run build  # production build (termasuk type checking Next.js)
```

Jalankan `npx tsc --noEmit` secara manual karena build Next.js tidak selalu melaporkan type error pada seluruh project.

## Pull Request Checklist

- [ ] Perubahan mengikuti arsitektur dan placement file.
- [ ] Input eksternal tervalidasi.
- [ ] Authorization diperiksa di server boundary.
- [ ] Tidak ada secret, token, atau data sensitif yang terekspos.
- [ ] Loading, error, empty state, dan aksesibilitas diperiksa.
- [ ] Dokumentasi diperbarui bila kontrak aplikasi berubah.
- [ ] Lint dan build berhasil.
- [ ] Risiko dan follow-up dicatat bila ada.
