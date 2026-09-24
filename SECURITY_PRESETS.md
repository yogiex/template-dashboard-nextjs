# Security Presets

Dokumen ini merangkum baseline keamanan template. Rincian checklist OWASP tersedia di `docs/SECURITY.md`.

## Headers

`next.config.ts` mengaktifkan:

- `X-DNS-Prefetch-Control: on`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

## Environment

- `.env.local` tidak boleh di-commit.
- `.env.example` hanya berisi nama variabel dan contoh non-secret.
- Server-only secret tidak boleh memakai prefix `NEXT_PUBLIC_`.
- Validasi environment typed diperlukan ketika secret server ditambahkan.

## Authorization

- Middleware/proxy hanya guard awal.
- Server Action dan Route Handler wajib melakukan auth dan RBAC sendiri.
- Service layer harus memeriksa ownership/permission untuk resource sensitif.
- Default policy adalah deny.

## Input

- Validasi dengan Zod pada semua boundary eksternal.
- Gunakan parameterized query.
- Jangan memakai input user untuk URL, SQL, atau HTML mentah.
- Batasi redirect dan outbound request untuk mencegah SSRF/open redirect.

## Session

- Gunakan library auth tepercaya.
- Cookie session: `httpOnly`, `secure` di production, dan `sameSite`.
- Session expiry dan rate limiting wajib untuk endpoint sensitif.
- Jangan log credential atau token.

## Dependency dan CI

- Commit `package-lock.json`.
- Gunakan `npm ci` di CI.
- Jalankan audit dependency dan update dependency secara terjadwal.
- Review lockfile dan script package sebelum merge.

## CSP

CSP belum menjadi default template. Tambahkan CSP dengan nonce/hash setelah daftar origin, auth provider, analytics, dan integrasi production diketahui. Uji CSP pada report-only sebelum mengaktifkannya secara ketat.
