# Contributing

## Workflow

1. Buat atau pilih issue/task yang menjelaskan tujuan perubahan.
2. Buat branch dengan format `feat/nama-fitur` atau `fix/nama-bug`.
3. Ikuti struktur, naming, dan aturan keamanan dalam `docs/CONVENTIONS.md` serta `docs/SECURITY.md`.
4. Tambahkan atau perbarui test sesuai risiko perubahan.
5. Jalankan lint, typecheck/build, dan test yang relevan.
6. Buat Conventional Commit yang menjelaskan satu tujuan perubahan.
7. Ajukan pull request dengan ringkasan, cara verifikasi, screenshot bila relevan, dan catatan risiko.

## Commit

Gunakan format `type(scope): description`, misalnya:

```text
feat(auth): add protected dashboard route
fix(api): validate user id before query
docs(security): document session cookie policy
```

Satu commit harus memiliki satu tujuan. Jangan menggabungkan refactor, dependency update, dan fitur baru dalam satu commit jika dapat dipisahkan.

## Pull Request Checklist

- [ ] Perubahan mengikuti arsitektur dan placement file.
- [ ] Input eksternal tervalidasi.
- [ ] Authorization diperiksa di server boundary.
- [ ] Tidak ada secret, token, atau data sensitif yang terekspos.
- [ ] Loading, error, empty state, dan aksesibilitas diperiksa.
- [ ] Dokumentasi diperbarui bila kontrak aplikasi berubah.
- [ ] Lint dan build berhasil.
- [ ] Risiko dan follow-up dicatat bila ada.
