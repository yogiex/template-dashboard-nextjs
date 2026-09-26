# Security

Dokumen ini menerjemahkan OWASP Top 10 menjadi persyaratan keamanan untuk aplikasi Next.js. Dokumen ini adalah standar minimal untuk fitur baru dan bukan pengganti threat model, pengujian penetrasi, atau review keamanan khusus fitur.

## Status persyaratan

Setiap bagian membedakan kondisi saat ini dari pekerjaan yang masih harus dilakukan:

- **Sudah diterapkan** adalah kontrol yang sudah ada di repository dan dapat diverifikasi dari konfigurasi atau kode.
- **Persyaratan mendatang** adalah kontrol yang wajib ada ketika autentikasi, database, integrasi, atau fitur sensitif ditambahkan.
- Item yang belum ada **tidak boleh dianggap sudah tersedia**, meskipun halaman dashboard atau komponen UI sudah ada.

## OWASP Top 10

| Kategori | Ancaman di Next.js | Mitigasi |
| --- | --- | --- |
| A01 Broken Access Control | Route dashboard tanpa guard atau API tanpa pemeriksaan role | Middleware/proxy untuk guard awal, pemeriksaan ulang di Server Action/Route Handler, helper RBAC, default deny |
| A02 Cryptographic Failures | Password plain, token lemah, atau secret bocor | Library auth teruji, hash bcrypt/argon2, secret hanya di environment |
| A03 Injection | SQL injection, XSS, atau input yang tidak tervalidasi | ORM/query terparameterisasi, Zod, hindari `dangerouslySetInnerHTML` |
| A04 Insecure Design | Fitur tanpa threat model atau kontrol akses | Threat model sederhana per fitur, least privilege, review desain |
| A05 Security Misconfiguration | Header hilang atau detail error bocor | Security headers, konfigurasi production yang ketat, error response generik |
| A06 Vulnerable and Outdated Components | Dependency rentan | Audit dependency, Dependabot/Renovate, update terjadwal |
| A07 Identification and Authentication Failures | Brute force atau session terlalu panjang | Rate limiting, expiry, secure cookie, monitoring login |
| A08 Software and Data Integrity Failures | Dependency atau artifact rusak | Commit lockfile, pin versi, `npm ci`, review supply chain |
| A09 Security Logging and Monitoring Failures | Tidak ada audit trail atau log sensitif | Logger terstruktur, log event auth, jangan log secret |
| A10 Server-Side Request Forgery | Fetch ke URL dari input user | Whitelist URL, validasi scheme/host, batasi redirect dan timeout |

## Secure by Default

### Security headers

**Sudah diterapkan.** `next.config.ts` menambahkan header berikut pada seluruh route:

- `X-DNS-Prefetch-Control: on`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Permitted-Cross-Domain-Policies: none`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Resource-Policy: same-origin`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `Content-Security-Policy` statis (`default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`), dengan `script-src`/`style-src` memakai `'unsafe-inline'` dan `'unsafe-eval'` hanya di development

**Persyaratan mendatang.** CSP yang aktif bersifat statis dan memuat `'unsafe-inline'`; itu pilihan sadar demi static generation (nonce memaksa seluruh halaman menjadi dynamic). Saat backend dan integrasi produksi tersedia, ganti dengan pola nonce di `proxy.ts`, tambahkan origin connect/font/image yang dipakai integrasi, dan uji ulang. Jangan menganggap daftar header di atas sebagai pengganti escaping, validasi output, atau otorisasi.

### Authorization

**Persyaratan mendatang.** Repository ini tidak menyatakan bahwa sistem autentikasi, session, role, database, atau RBAC sudah tersedia. Saat fitur tersebut ditambahkan:

- Daftarkan route publik dan route privat secara eksplisit.
- Middleware/proxy dapat melakukan redirect awal, tetapi tidak dipercaya sebagai satu-satunya kontrol.
- Server Action dan Route Handler wajib memeriksa session, role, dan permission di server pada setiap boundary sensitif.
- Gunakan IDOR protection: verifikasi kepemilikan resource, bukan hanya authentication.
- Terapkan least privilege dan default deny.
- Uji route privat, Server Action, Route Handler, dan resource milik user lain secara negatif.

### Input dan output

**Persyaratan mendatang untuk setiap boundary.** Saat ada API, form, Server Action, atau sumber input eksternal:

- Validasi semua input dengan Zod: body, form, route params, search params, cookie, dan hasil fetch.
- Batasi panjang, format, enum, dan nilai yang diperbolehkan; validasi hanya di client tidak cukup.
- Gunakan parameterized ORM/query API dan hindari raw SQL dari input user.
- Jangan memakai input user untuk membentuk URL, redirect, atau nama file tanpa allowlist.
- Jangan memakai `dangerouslySetInnerHTML` tanpa sanitasi ketat dan review keamanan.
- Jangan mengembalikan stack trace, query, nilai environment, atau detail error internal ke client.
- Gunakan error response generik di production dan simpan detail internal hanya pada log server yang terkontrol.

### Environment dan secret

**Persyaratan mendatang.** Jangan mengirim nilai environment sensitif atau secret ke repository.

- Secret hanya ada di `.env.local` lokal atau secret manager deployment.
- Jangan commit `.env*`; `.env.example` hanya berisi nama variabel dan contoh non-secret.
- Semua variabel yang dikirim ke browser wajib memakai prefix `NEXT_PUBLIC_` dan dianggap publik.
- Akses environment server melalui validator typed di `src/lib/env.ts` ketika kebutuhan runtime benar-benar ada.
- Pastikan secret tidak muncul di source, bundle client, screenshot, issue, atau log.
- Rotasi secret yang pernah terekspos dan invalidate session/token lama.

### Session dan cookie

**Persyaratan mendatang.** Autentikasi dan session belum boleh diasumsikan sudah ada. Jika ditambahkan, gunakan:

- Library auth yang actively maintained dan telah ditinjau.
- Set `httpOnly`, `secure` di production, dan `sameSite` secara eksplisit.
- Terapkan session expiry dan mekanisme refresh yang aman.
- Tambahkan rate limiting pada endpoint login, reset password, dan operasi sensitif.
- Jangan log password, token, session ID, atau nilai cookie.
- Invalidasi session saat logout, perubahan role, reset password, atau indikasi penyalahgunaan.

### Dependency dan supply chain

**Persyaratan operasional; status aktual harus diverifikasi di pipeline.** Prinsip yang harus dipertahankan:

- Commit `package-lock.json`.
- CI menggunakan `npm ci`, bukan `npm install`, agar dependency terpasang sesuai lockfile.
- Jalankan audit dependency pada pipeline dan tangani vulnerability yang relevan sesuai kebijakan proyek.
- Tinjau izin script dan perubahan lockfile sebelum merge.
- Gunakan Dependabot atau Renovate untuk update dependency terjadwal.
- Pin versi ketika reproducibility atau risiko supply chain membutuhkannya.

### Logging

**Persyaratan mendatang untuk event keamanan.** Jika auth atau data sensitif ditambahkan:

- Gunakan logger terstruktur untuk auth success/failure, perubahan role, logout, dan akses data sensitif.
- Sertakan request ID, actor ID, resource ID, action, dan timestamp.
- Jangan log body mentah jika dapat berisi password, token, session ID, atau data pribadi sensitif.
- Pastikan log production tidak mengekspos stack trace, query, secret, atau response internal.
- Tentukan retensi, akses log, dan prosedur alerting untuk event login gagal serta perubahan privilege.

### SSRF dan outbound request

**Persyaratan mendatang untuk server-side fetch.** URL dari user tidak boleh digunakan langsung untuk outbound request:

- Gunakan allowlist scheme `https` dan host yang diizinkan bila URL berasal dari user.
- Tolak localhost, link-local, private network, dan metadata endpoint.
- Set timeout, redirect policy, ukuran response, dan ukuran request yang masuk akal.
- Jangan meneruskan cookie atau header authorization ke origin yang tidak dipercaya.
- Resolusi DNS dan tujuan host harus ikut ditinjau untuk mencegah bypass allowlist melalui redirect atau DNS rebinding.

## Cookie consent

**Sudah diterapkan sebagai mekanisme, bukan sebagai jaminan hukum.** Banner di `src/components/custom/cookie-consent.tsx` menyimpan pilihan pengguna (`accepted` / `rejected`) di `localStorage` dengan key berversi `cookie-consent-v1` melalui `src/features/cookie-consent/`. Copy seluruhnya ada di `src/config/cookie-consent.ts`.

Yang perlu diketahui saat menutup atau me-review:

- Template **tidak memuat analytics, ads, error tracking, maupun tracker pihak ketiga apa pun**. Consent di sini adalah affordance UX, bukan tameng hukum; ia tidak membuat aplikasi otomatis complies dengan GDPR atau UU PDP.
- Banner tidak memblokir halaman, tidak memakai `dangerouslySetInnerHTML`, dan tidak melakukan request keluar. Satu-satunya efek eksternal adalah `CustomEvent` lokal `cookie-consent:change` di `window`.
- Setiap consent state hanya dibalik oleh pilihan pengguna sendiri, bukan oleh cookie pihak ketiga. Jangan membaca consent dari banner sebagai bukti persetujuan yang sah secara hukum.
- Penegakan yang sebenarnya berada di sisi integrator: analytics atau tracker baru **wajib** dimuat hanya setelah `detail.choice === "accepted"` (default harus menahan skrip), dan daftar kategori cookie harus jujur dengan yang benar-benar dipakai.
- Copy banner menyatakan template tidak memakai pelacak pihak ketiga. Instance yang menambahkan tracker wajib memperbarui copy tersebut agar tidak menyesatkan.

## Error handling

**Persyaratan mendatang.** Jangan mengklaim adanya custom error page yang belum dibuat. Saat error handling ditambahkan:

- Tampilkan pesan generik di production; jangan kirim stack trace, query, atau nilai environment.
- Bedakan error yang diharapkan untuk validasi dari error internal.
- Gunakan request ID yang tidak sensitif untuk korelasi server dan client.
- Pastikan Server Action, Route Handler, dan halaman error tidak membocorkan detail internal.
- Uji behavior error pada build dan runtime production.

## Checklist Sebelum Merge

- [ ] Input eksternal tervalidasi pada server, bukan hanya di client.
- [ ] Auth dan authorization diulang pada setiap boundary sensitif.
- [ ] Resource ownership diverifikasi untuk mencegah IDOR.
- [ ] Tidak ada secret atau data sensitif dalam source, log, dan response.
- [ ] Query aman dan tidak ada raw SQL dari input user.
- [ ] URL, redirect, dan nama file berbasis input memiliki allowlist.
- [ ] Header keamanan masih sesuai setelah perubahan; CSP diuji bila diwajibkan.
- [ ] Dependency dan lockfile ditinjau.
- [ ] Error production tidak membocorkan detail internal.
- [ ] Risiko SSRF dan open redirect ditinjau.
- [ ] Secret yang terekspos sudah dirotasi dan token/session lama di-invalidate.
- [ ] Event keamanan yang relevan memiliki log terstruktur tanpa data sensitif.
- [ ] Seluruh checklist diverifikasi terhadap implementasi aktual sebelum release.
