@AGENTS.md

## Aturan Error Handling (WAJIB — lihat docs/ERROR-HANDLING.md)

- Semua error aplikasi memakai `AppError` dari `src/lib/error.ts` dengan kode dari taxonomy: `VALIDATION_ERROR | UNAUTHENTICATED | FORBIDDEN | NOT_FOUND | CONFLICT | RATE_LIMITED | INTERNAL_ERROR`.
- Jangan membuat kode baru atau melempar `Error` dengan string bebas sebagai kontrak aplikasi.
- Service melempar `AppError`; Route Handler membungkus logic dengan `problemResponse()` untuk RFC 9457; Server Action mengembalikan envelope `{ success, error: { code, message, fieldErrors? } }`.
- `detail` dan `message` ke client hanya menggunakan pesan generik dari taxonomy. Detail teknis hanya masuk ke logger, sertakan `traceId` untuk korelasi.
- `console.log` dan `console.error` dilarang; semua logging menggunakan `logger`.
- `error.tsx` menampilkan pesan generik dan retry tanpa detail teknis.

## Required Documents

- Security: `docs/SECURITY.md`
- Architecture: `docs/ARCHITECTURE.md`
- Conventions: `docs/CONVENTIONS.md`
- Error handling: `docs/ERROR-HANDLING.md`
