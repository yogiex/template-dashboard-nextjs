# Security Checklist

> Status: draft. Owner: [TODO]. Review cycle: tiap sprint.

**Tracker status, bukan dokumen persyaratan.** Persyaratan apa yang harus ada dijelaskan di `docs/SECURITY.md`; dokumen itu tidak mengulanginya di sini. Isi dokumen ini adalah jawaban satu pertanyaan per item: *kontrol itu sudah ada di repository, sudah ada sebagian, atau belum ada?* Ancaman yang mendasari tiap item ada di `docs/THREAT-MODEL.md`.

Semua status di bawah diverifikasi dengan membaca file yang disebut pada kolom "Bukti". Kolom bukti berisi `—` bila tidak ada file sama sekali. Beberapa item `❌ belum` tetap menyebut path karena path itu justru menunjukkan letak gap-nya. Status memakai tiga penanda: `✅ ada`, `🟡 parsial`, `❌ belum`.

Prioritas: **wajib** (menghambat produksi), **recommended** (sebaiknya sebelum produksi), **advanced** (nilai tambah atau kepatuhan).

Total 162 item: 82 `✅ ada`, 28 `🟡 parsial`, 52 `❌ belum`.

## A. Authentication dan Session

| ID | Item | Kategori | Status | Bukti | Prioritas | Catatan |
| --- | --- | --- | --- | --- | --- | --- |
| AUTH-01 | Password tidak disimpan plain | OWASP A02 | ❌ belum | — | wajib | `src/features/auth/service.ts:94` menyimpan `"password123"` sebagai string |
| AUTH-02 | Hash password modern (argon2id/bcrypt) | OWASP A02 | ❌ belum | — | wajib | Tidak ada library hashing di `package.json` |
| AUTH-03 | Perbandingan password timing-safe | OWASP A02 | ✅ ada | `src/features/auth/service.ts:144` (`safeEqual`) | wajib | Hanya berlaku bila panjang sama; `timingSafeEqual` menolak panjang beda |
| AUTH-04 | Pesan error login tidak membocorkan keberadaan akun | OWASP A07 | ✅ ada | `src/features/auth/service.ts:136` | wajib | Tidak memakai `fieldErrors`, jadi email terdaftar dan tidak terdaftar tidak bisa dibedakan |
| AUTH-05 | Rate limit pada endpoint login | OWASP A07 | 🟡 parsial | `src/features/auth/actions.ts:134-138` | wajib | 5 percobaan/15 menit per email dan per IP-hash; bucket per-IP dilewati saat `ipHash` null (dev tanpa header) |
| AUTH-06 | Rate limit pada verifikasi MFA | OWASP A07 | ❌ belum | — | wajib | Verifikasi MFA pindah ke handler di `src/features/auth/components/mfa-*form.tsx` dan tidak lagi memanggil `enforceRateLimit`; satu-satunya pemanggil limiter yang tersisa adalah `loginAction` |
| AUTH-07 | Limit jumlah percobaan MFA di service | OWASP A07 | ✅ ada | `src/features/auth/service.ts:388` | wajib | 5 percobaan lalu challenge dihapus |
| AUTH-08 | Lockout akun setelah percobaan gagal | OWASP A07 | ❌ belum | — | recommended | Tidak ada lockout, hanya rate limit |
| AUTH-09 | Session cookie `httpOnly` | OWASP A07 | 🟡 parsial | `src/features/auth/session.ts:32-40` | wajib | Cookie `mock_session` memakai `httpOnly: true`, tetapi ini session mock di memori proses — bukan session production yang terverifikasi |
| AUTH-10 | Session cookie `secure` | OWASP A07 | 🟡 parsial | `src/features/auth/session.ts:36` | wajib | `secure` hanya di production; berlaku untuk cookie MFA dan `mock_session` |
| AUTH-11 | Session cookie `sameSite` | OWASP A07 | 🟡 parsial | `src/features/auth/session.ts:35` | wajib | `lax` pada cookie MFA dan pada `mock_session` |
| AUTH-13 | Sesi dapat diinvalidate saat logout | OWASP A07 | 🟡 parsial | `src/features/auth/actions.ts:190-198` | wajib | `logoutAction()` → `destroySession()` menghapus token dari `Map` dan mengosongkan cookie; store in-memory sehingga revoke lintas instance dan tahan restart belum ada |
| AUTH-16 | Token reset password single-use | OWASP A02 | ✅ ada | `src/features/auth/service.ts:230` | wajib | `usedAt` diset saat dipakai |
| AUTH-18 | TTL token reset dibatasi | OWASP A02 | ✅ ada | `src/features/auth/service.ts:21` | wajib | 1 jam |
| AUTH-19 | Token reset tidak bocor ke log di production | OWASP A02 | ✅ ada | `src/features/auth/service.ts:196` | wajib | `resetPath` hanya di spread bersyarat `isDemoMode` |
| AUTH-20 | Reset password benar-benar mengubah password | OWASP A07 | ❌ belum | — | wajib | `src/features/auth/service.ts:217` hanya menandai token terpakai |
| AUTH-23 | MFA TOTP terverifikasi dengan window yang wajar | OWASP A02 | ✅ ada | `src/lib/totp.ts:99` | wajib | `window` default 1 (plus/minus 30 detik) |
| AUTH-24 | Secret TOTP dibangkitkan dengan RNG yang kuat | OWASP A02 | ✅ ada | `src/lib/totp.ts:23` | wajib | `randomBytes(20)`, base32 RFC 4226 |
| AUTH-26 | Backup code disimpan sebagai hash | OWASP A02 | ✅ ada | `src/features/auth/service.ts:564` | wajib | Dinormalisasi trim dan upper-case sebelum di-hash |
| AUTH-27 | Backup code single-use | OWASP A02 | ✅ ada | `src/features/auth/service.ts:479` | wajib | Dihapus dari set saat dipakai |
| AUTH-30 | Nonaktifkan MFA memerlukan verifikasi password | OWASP A01 | ✅ ada | `src/features/auth/service.ts:696` | wajib | Dicek ulang dengan `safeEqual` |
| AUTH-31 | Jalur bypass MFA non-production di-gate | OWASP A07 | 🟡 parsial | `src/features/auth/service.ts:46` | wajib | `isDemoMode` membolehkan kode `123456`; tidak ada fail-fast di start |
| AUTH-32 | Kode demo tidak diekspor ke bundle client | OWASP A07 | 🟡 parsial | `src/features/auth/service.ts:37` | wajib | `MFA_DEMO_CODE` diekspor dari modul `server-only`, tetapi `MfaSecuritySettings` meneruskan `isDemoMode` ke client |
| AUTH-34 | Kompleksitas password ditegakkan di server | OWASP A07 | ✅ ada | `src/features/auth/schema.ts:14` | wajib | Min 8, maks 72, huruf besar/kecil dan angka |
| AUTH-37 | Pendaftaran berfungsi dan terverifikasi email | OWASP A07 | ❌ belum | — | wajib | `registerUser` melempar `NOT_IMPLEMENTED` |
| AUTH-38 | MFA state persisten (bukan in-memory) | OWASP A07 | ❌ belum | — | wajib | `challengesByToken` dan enrollment hilang saat restart |

## B. Authorization

| ID | Item | Kategori | Status | Bukti | Prioritas | Catatan |
| --- | --- | --- | --- | --- | --- | --- |
| AUTHZ-01 | Guard route di proxy atau middleware | OWASP A01 | ❌ belum | — | wajib | Tidak ada `proxy.ts` maupun `middleware.ts` di repo |
| AUTHZ-02 | Guard di layout dashboard | OWASP A01 | ❌ belum | — | wajib | Guard `requirePageSession()` **sudah dicabut** dari `(dashboard)/layout.tsx` dan diparkir: static export (GitHub Pages) tidak mendukung cookie/Server Action, jadi seluruh route `(dashboard)` terbuka tanpa sesi sampai ada host Node |
| AUTHZ-03 | Guard di setiap Server Action | OWASP A01 | ❌ belum | — | wajib | Satu-satunya file `"use server"` yang tersisa adalah `src/features/auth/actions.ts` (`loginAction` memang tanpa session — jalur publik; `logoutAction` menghancurkan sesi pemanggil). Tidak ada Server Action pemutasi data, sehingga tidak ada pula guard seperti dulu di `features/user/actions.ts` yang kini tidak ada |
| AUTHZ-04 | `requireRole` dipakai di boundary sensitif | OWASP A01 | ❌ belum | `src/lib/rbac.ts:126` | wajib | Helper-nya ada dan murni (`viewer < editor < admin`), tapi tidak ada satu pun pemanggil `requireRole` di repo; role sesi belum dipakai sebagai gate |
| AUTHZ-05 | `requireSession` benar-benar memvalidasi session | OWASP A01 | 🟡 parsial | `src/lib/rbac.ts:73`, `src/features/auth/session.ts:100` | wajib | Sudah membaca cookie `mock_session` dan gagal tertutup dengan `UNAUTHENTICATED`; token hanya dicocokkan ke `Map` memori, tanpa verifikasi signature atau kunci server |
| AUTHZ-06 | Default deny saat session tidak ada | OWASP A01 | ✅ ada | `src/lib/rbac.ts:73-83` | wajib | `requireSession()` melempar `AppError("UNAUTHENTICATED")`; `requireSessionForDev()` baru mengembalikan placeholder saat `DEV_AUTH_BYPASS=1` **dan** bukan production |
| AUTHZ-07 | Ownership check pada resource milik user | OWASP A01 | ❌ belum | — | wajib | `getUserById` tidak memeriksa kepemilikan |
| AUTHZ-08 | Role check pada halaman baca data sensitif | OWASP A01 | ❌ belum | — | wajib | `/users`, `/settings/ueba`, `/settings/observability` terbuka |
| AUTHZ-09 | Role check pada halaman audit log | OWASP A01 | ❌ belum | — | wajib | Halaman audit belum ada sama sekali |
| AUTHZ-12 | Deteksi perubahan role yang akurat | OWASP A09 | ❌ belum | `src/features/user/actions.ts:74` | wajib | `roleChanged: "true"` dikirim pada setiap update, bukan hanya saat role berubah |

## C. Input Validation

| ID | Item | Kategori | Status | Bukti | Prioritas | Catatan |
| --- | --- | --- | --- | --- | --- | --- |
| VAL-01 | Validasi server pada semua Server Action | OWASP A03 | ✅ ada | `src/features/auth/actions.ts:103` (`parseInput`) | wajib | Semua action auth memvalidasi ulang di server |
| VAL-02 | Batas panjang pada field teks | OWASP A03 | ✅ ada | `src/features/contact/schema.ts:17` | wajib | Panjang message 20-2000, subject 3-120, name 2-100 |
| VAL-03 | Batas panjang email | OWASP A03 | ✅ ada | `src/features/contact/schema.ts:12` | wajib | Maks 254 |
| VAL-04 | Format kode OTP divalidasi | OWASP A03 | ✅ ada | `src/features/auth/schema.ts:86` | wajib | Persis 6 digit |
| VAL-05 | Format backup code divalidasi | OWASP A03 | ✅ ada | `src/features/auth/schema.ts:92` | wajib | Persis `XXXX-XXXX` |
| VAL-06 | Format token reset divalidasi | OWASP A03 | ✅ ada | `src/features/auth/schema.ts:64` | wajib | 64 karakter heksadesimal |
| VAL-07 | Nama divalidasi dengan allowlist karakter | OWASP A03 | ✅ ada | `src/features/auth/schema.ts:45` | wajib | Regex Unicode untuk huruf, spasi, apostrof, titik, dan tanda hubung |
| VAL-08 | Query database diparameterkan | OWASP A03 | ❌ belum | — | wajib | Tidak ada database; belum relevan tapi akan wajib saat backend siap |
| VAL-09 | Tidak ada raw SQL dari input user | OWASP A03 | ❌ belum | — | wajib | Tidak ada lapisan query sama sekali |
| VAL-10 | Validasi input metric sebelum disimpan | OWASP A03 | ✅ ada | `src/features/observability/schema.ts:9` | wajib | Nama, kind, value finite, tags dibatasi 50/200 karakter |
| VAL-11 | Validasi query audit sebelum dibaca | OWASP A03 | ✅ ada | `src/features/audit/schema.ts:51` | wajib | Enum category, severity, result; rentang tanggal |
| VAL-12 | Validasi query UEBA | OWASP A03 | ✅ ada | `src/features/ueba/schema.ts:17` | wajib | Enum level dan batas panjang actorId |
| VAL-13 | Validasi event audit sebelum disimpan | OWASP A03 | ✅ ada | `src/features/audit/schema.ts:36` | wajib | Dipaksa di `logAudit` |
| VAL-16 | Ukuran payload dibatasi | OWASP A04 | 🟡 parsial | `nginx/nginx.conf:10` | wajib | `client_max_body_size 20M`; tidak ada batas per-field di body |

## D. HTTP Headers

| ID | Item | Kategori | Status | Bukti | Prioritas | Catatan |
| --- | --- | --- | --- | --- | --- | --- |
| HDR-01 | Content-Security-Policy ada | OWASP A05 | ✅ ada | `next.config.ts:18` | wajib | CSP statis, tanpa nonce |
| HDR-02 | `default-src 'self'` | OWASP A05 | ✅ ada | `next.config.ts:19` | wajib | — |
| HDR-03 | `object-src 'none'` | OWASP A05 | ✅ ada | `next.config.ts:25` | wajib | — |
| HDR-05 | `form-action 'self'` | OWASP A05 | ✅ ada | `next.config.ts:27` | wajib | — |
| HDR-06 | `frame-ancestors 'none'` | OWASP A05 | ✅ ada | `next.config.ts:28` | wajib | Redundan dengan `X-Frame-Options`, tetapi tetap dipertahankan |
| HDR-08 | CSP berbasis nonce | OWASP A05 | ❌ belum | — | advanced | `next.config.ts:6` menjelaskan alasannya; bertentangan dengan static generation |
| HDR-09 | Tidak ada `'unsafe-inline'` pada `script-src` | OWASP A05 | ❌ belum | `next.config.ts:20` | advanced | Konsekuensi: CSP tidak menghambat XSS inline |
| HDR-11 | `Strict-Transport-Security` | OWASP A05 | 🟡 parsial | `next.config.ts:46` | wajib | Nilainya benar, tapi compose tidak melakukan TLS termination sehingga baru berlaku di belakang terminator eksternal |
| HDR-14 | `Referrer-Policy` | OWASP A05 | ✅ ada | `next.config.ts:37` | wajib | `strict-origin-when-cross-origin` |
| HDR-19 | `X-Powered-By` dimatikan | OWASP A05 | ✅ ada | `next.config.ts:55` | wajib | `poweredByHeader: false` |
| HDR-20 | Source map browser tidak diekspos | OWASP A05 | ✅ ada | `next.config.ts:57` | wajib | `productionBrowserSourceMaps: false` |
| HDR-21 | Header berlaku di seluruh route | OWASP A05 | ✅ ada | `next.config.ts:61` | wajib | `source: "/(.*)"` |

## E. CSRF

| ID | Item | Kategori | Status | Bukti | Prioritas | Catatan |
| --- | --- | --- | --- | --- | --- | --- |
| CSRF-01 | Proteksi CSRF pada Server Action | OWASP A01 | 🟡 parsial | `next.config.ts:27` | wajib | Next 16 memverifikasi Origin untuk Server Action; tidak ada token CSRF eksplisit |
| CSRF-03 | `sameSite` cookie mencegah pengiriman lintas situs | OWASP A01 | 🟡 parsial | `src/features/auth/session.ts:35` | wajib | `lax` pada `mfa_pending` dan `mock_session`; token MFA tidak di-backup pada sebagian browser |

## F. Rate Limiting dan Anti-Abuse

| ID | Item | Kategori | Status | Bukti | Prioritas | Catatan |
| --- | --- | --- | --- | --- | --- | --- |
| RL-01 | Rate limit terpusat di helper | OWASP A07 | ✅ ada | `src/lib/rate-limit.ts:39` | wajib | `enforceRateLimit(identifier, purpose, options)` |
| RL-02 | Bucket terpisah per purpose dan opsi limit | OWASP A07 | ✅ ada | `src/lib/rate-limit.ts:47` | wajib | Key memuat `purpose:maxAttempts:windowMs` |
| RL-03 | Limit pada registrasi | OWASP A07 | ✅ ada | `src/features/auth/actions.ts:238` | wajib | Per email dan global |
| RL-04 | Limit pada lupa password | OWASP A07 | ✅ ada | `src/features/auth/actions.ts:265` | wajib | Per email |
| RL-05 | Limit pada form kontak | OWASP A07 | ✅ ada | `src/features/contact/actions.ts:43` | wajib | Per email dan global |
| RL-08 | Limit per IP | OWASP A07 | ❌ belum | — | wajib | Tidak ada identifier IP di semua pemanggilan |
| RL-10 | Rate limit tahan multi-instance | OWASP A07 | ❌ belum | — | wajib | Perlu Redis atau provider setara |
| RL-11 | Backoff eksponensial | OWASP A07 | ❌ belum | — | recommended | Limit tetap datar, tidak ada jeda yang meningkat |
| RL-13 | Rate limit di lapisan reverse proxy | OWASP A04 | ❌ belum | — | recommended | Tidak ada `limit_req` di `nginx/nginx.conf` |
| RL-14 | Metrik rate limit hit tercatat | OWASP A09 | ✅ ada | `src/features/auth/actions.ts:212` | wajib | `security.rate_limit` dan sudah masuk KPI di halaman observability |

## G. Secrets dan Environment

| ID | Item | Kategori | Status | Bukti | Prioritas | Catatan |
| --- | --- | --- | --- | --- | --- | --- |
| SEC-01 | Environment divalidasi saat start | OWASP A05 | ✅ ada | `src/lib/env.ts:11` | wajib | Zod `safeParse` dan gagal cepat |
| SEC-02 | File `.env*` tidak di-commit | OWASP A05 | ✅ ada | `.gitignore:34` | wajib | Pengecualian hanya `.env.example` |
| SEC-03 | `.env.example` tidak memuat nilai nyata | OWASP A05 | ✅ ada | `.env.example` | wajib | Hanya `NEXT_PUBLIC_APP_URL` |
| SEC-04 | Scan secret di CI | OWASP A08 | ✅ ada | `.github/workflows/security.yml:19` | wajib | Gitleaks dengan `--redact` dan riwayat penuh |
| SEC-05 | Secret tidak memakai prefix `NEXT_PUBLIC_` | OWASP A05 | 🟡 parsial | `src/lib/env.ts:8` | wajib | Hanya ada satu variabel, dan tidak ada guard yang menolak nama sensitif di `NEXT_PUBLIC_` |
| SEC-07 | Kredensial demo tidak ada di source | OWASP A07 | ❌ belum | `src/features/auth/service.ts:94` | wajib | `demo@example.com` dan `password123` |
| SEC-08 | Data mock tidak realistis | OWASP A04 | ❌ belum | `src/features/user/service.ts:6` | recommended | 12 nama dan email yang tampak nyata |
| SEC-12 | Secret tidak bocor ke log | OWASP A02 | 🟡 parsial | `src/lib/redact.ts:83` | wajib | Redactor ada tapi hanya untuk `tags` metrik dan `metadata` audit |
| SEC-13 | `import "server-only"` pada modul server | OWASP A05 | 🟡 parsial | `src/features/auth/service.ts:1` | wajib | Ada di `redact.ts`, `request-context.ts`, `totp.ts`, dan `api.ts`; **tidak ada** di `src/features/observability/lib/store.ts`, `src/features/audit/lib/store.ts` (keduanya mengimpor `computeEntryHash`), dan `src/features/ueba/lib/user-timeline.ts` |

## H. Logging dan Audit

| ID | Item | Kategori | Status | Bukti | Prioritas | Catatan |
| --- | --- | --- | --- | --- | --- | --- |
| LOG-01 | Logger terstruktur | OWASP A09 | ✅ ada | `src/lib/logger.ts:12` | wajib | Pino JSON dengan base service dan environment |
| LOG-02 | Level log yang benar (warn untuk kegagalan, error untuk tak terduga) | OWASP A09 | ✅ ada | `src/features/auth/service.ts:134` | wajib | — |
| LOG-03 | Event keamanan log masuk audit | OWASP A09 | ❌ belum | — | wajib | `logAudit()` tidak dipanggil dari mana pun di `src/` |
| LOG-04 | Audit log punya tamper evidence | OWASP A09 | 🟡 parsial | `src/features/audit/lib/integrity.ts:18` | wajib | Hash chain ada, tapi store in-memory dan tidak pernah ditulis |
| LOG-06 | Audit log persisten | OWASP A09 | ❌ belum | `src/features/audit/lib/store.ts:15` | wajib | Maks 5000 entry in-memory, hilang saat restart |
| LOG-07 | Audit log tidak dapat dihapus sepihak | OWASP A09 | ❌ belum | `src/features/audit/lib/store.ts:153` | wajib | `resetAuditStore()` menghapus seluruh chain dan terekspor |
| LOG-08 | Halaman audit log tersedia | OWASP A09 | ❌ belum | — | wajib | Tidak ada route yang mengimpor `features/audit` |
| LOG-09 | Redaksi PII pada tag metrik | OWASP A09 | ✅ ada | `src/lib/redact.ts:83` | wajib | IP di-hash, email dimask, user agent dipotong |
| LOG-10 | Redaksi PII pada seluruh argumen logger | OWASP A09 | ❌ belum | `src/features/contact/actions.ts:70` | wajib | `subject` dari user ditulis apa adanya; wrapper logger tidak meredaksi |
| LOG-11 | Redaksi pada field `userAgent` dan `host` audit | OWASP A09 | ❌ belum | `src/features/audit/schema.ts:46` | wajib | Diterima sebagai string biasa tanpa kewajiban redaksi |
| LOG-12 | Kredensial tidak masuk log | OWASP A02 | ✅ ada | `src/features/auth/service.ts:134` | wajib | Log `auth.login.rejected` tanpa email, password, atau token |
| LOG-15 | Log tidak memuat stack trace ke client | OWASP A05 | ✅ ada | `src/app/error.tsx:12` | wajib | Hanya `digest` yang ditampilkan |
| LOG-16 | Metrik auth tersedia untuk deteksi | OWASP A09 | ✅ ada | `src/features/observability/lib/constants.ts:1` | wajib | Attempt, success, failure, MFA, rate limit, access denied |
| LOG-17 | Metrik `access_denied` benar-benar dipancarkan | OWASP A09 | ❌ belum | `src/features/observability/lib/constants.ts:9` | wajib | Nama konstanta ada, tidak ada call site yang memakainya |
| LOG-18 | Deteksi anomali perilaku | OWASP A09 | 🟡 parsial | `src/features/ueba/lib/anomaly.ts:235` | wajib | 6 detector aktif, tetapi hanya di dalam proses tanpa alert |
| LOG-19 | Alerting untuk event keamanan | OWASP A09 | ❌ belum | — | wajib | Tidak ada integrasi alerting apa pun |
| LOG-20 | Retensi log ditetapkan | OWASP A09 | ❌ belum | — | wajib | Tidak ada kebijakan retensi yang ditegakkan |
| LOG-22 | `trackMetric` tidak pernah menggagalkan request | OWASP A09 | ✅ ada | `src/features/observability/lib/track.ts:45` | wajib | Dibungkus try/catch dan tidak di-await |
| LOG-24 | Batas ukuran store metrik dan audit | OWASP A04 | 🟡 parsial | `src/features/observability/lib/store.ts:12` | recommended | 5000 event dan 2000 sampel histogram; pembuangan entry lama dicatat pada `droppedEntries` |
| LOG-25 | Data demo dibedakan dari data nyata | OWASP A09 | ✅ ada | `src/features/observability/actions.ts:20` | wajib | Seed ditolak di production |

## I. Data Protection

| ID | Item | Kategori | Status | Bukti | Prioritas | Catatan |
| --- | --- | --- | --- | --- | --- | --- |
| DP-01 | PII di-hash atau dimask di penyimpanan | OWASP A02 | ✅ ada | `src/lib/redact.ts:34` | wajib | `hashIp` dan `maskEmail` |
| DP-02 | Data dienkripsi saat transit | OWASP A02 | ❌ belum | — | wajib | Tidak ada TLS di dalam compose; harus ada di terminator eksternal |
| DP-03 | Data dienkripsi saat diam | OWASP A02 | ❌ belum | — | wajib | Tidak ada persistence, jadi tidak ada data yang perlu dienkripsi |
| DP-05 | Retensi data ditetapkan | OWASP A02 | ❌ belum | — | wajib | Tidak ada kebijakan retensi |
| DP-07 | Persetujuan pengguna didokumentasikan | OWASP A02 | 🟡 parsial | `src/config/public-pages.ts` | wajib | Copy privacy ada, konten masih placeholder |
| DP-08 | Data dari request tidak masuk log mentah | OWASP A09 | ❌ belum | `src/features/contact/actions.ts:70` | wajib | `subject` dan pesan dicatat tanpa redaksi |
| DP-09 | Pseudonymization memakai secret | OWASP A02 | ❌ belum | `src/lib/redact.ts:29` | wajib | Salt berasal dari `NEXT_PUBLIC_APP_URL` yang publik |
| DP-11 | Anomali UEBA menyimpan bukti ter-redact | OWASP A02 | ✅ ada | `src/features/ueba/lib/anomaly.ts:77` | wajib | `redactEvidence` dipanggil di `makeAnomaly` |
| DP-12 | Tampilan halaman tidak mengekspos data sensitif tanpa auth | OWASP A01 | ❌ belum | `src/app/(dashboard)/users/page.tsx` | wajib | `/users` terbuka tanpa session |

## J. Error Handling

| ID | Item | Kategori | Status | Bukti | Prioritas | Catatan |
| --- | --- | --- | --- | --- | --- | --- |
| ERR-01 | Taksonomi error tunggal | OWASP A05 | ✅ ada | `src/lib/error.ts:1` | wajib | 7 kode dengan pemetaan HTTP |
| ERR-02 | Pesan user generik per kode | OWASP A05 | ✅ ada | `src/lib/error.ts:30` | wajib | Tidak pernah memuat detail internal |
| ERR-03 | Error tak terduga tidak bocor ke client | OWASP A05 | ✅ ada | `src/features/auth/actions.ts:93` | wajib | `internalFailure()` mengembalikan `INTERNAL_ERROR` generik |
| ERR-04 | Setiap Server Action dibungkus try/catch | OWASP A05 | ✅ ada | `src/features/auth/actions.ts:131` | wajib | Semua action punya catch dan logger |
| ERR-05 | Setiap submit form dibungkus try/catch | OWASP A05 | ✅ ada | `src/features/auth/components/login-form.tsx` | wajib | Konsisten dengan `docs/ARCHITECTURE.md` bagian 14.3 |
| ERR-06 | Error page tidak menampilkan stack trace | OWASP A05 | ✅ ada | `src/app/error.tsx` | wajib | Hanya `digest` |
| ERR-07 | Helper Problem Details tersedia | OWASP A05 | 🟡 parsial | `src/lib/api.ts:17` | wajib | `problemResponse` ada tetapi belum ada Route Handler yang memakainya |

## K. SSRF, File Upload, dan Outbound Request

| ID | Item | Kategori | Status | Bukti | Prioritas | Catatan |
| --- | --- | --- | --- | --- | --- | --- |
| SSRF-01 | Tidak ada outbound request ke URL dari input user | OWASP A10 | ✅ ada | — | wajib | Tidak ada fetch yang host-nya ditentukan user |
| SSRF-03 | Timeout pada request keluar | OWASP A10 | ❌ belum | — | wajib | Belum ada request keluar; wajib saat integrasi ditambahkan |
| UP-01 | Tidak ada fitur upload | OWASP A04 | ✅ ada | — | wajib | Tidak ada input file di repo |
| UP-02 | Validasi tipe, ukuran, dan nama file bila upload ditambahkan | OWASP A04 | ❌ belum | — | recommended | Wajib sebelum ada fitur upload |

## M. Supply Chain

| ID | Item | Kategori | Status | Bukti | Prioritas | Catatan |
| --- | --- | --- | --- | --- | --- | --- |
| SC-01 | Lockfile di-commit | OWASP A08 | ✅ ada | `package-lock.json` | wajib | — |
| SC-02 | CI memakai `npm ci` | OWASP A08 | ✅ ada | `.github/workflows/ci.yml:34` | wajib | Bukan `npm install` |
| SC-03 | Audit dependency di CI | OWASP A06 | ✅ ada | `.github/workflows/security.yml:54` | wajib | `npm audit --audit-level=high` |
| SC-04 | Dependabot aktif | OWASP A06 | ✅ ada | `.github/dependabot.yml` | wajib | npm mingguan, github-actions bulanan, docker mingguan |
| SC-07 | Static analysis keamanan (SAST) | OWASP A06 | ✅ ada | `.github/workflows/security.yml:68` | wajib | CodeQL security-extended |
| SC-08 | Izin script dependency dinonaktifkan saat install | OWASP A08 | ❌ belum | — | wajib | Belum ada `--ignore-scripts` di CI |
| SC-09 | Versi tool CI dipin | OWASP A08 | ❌ belum | `.github/workflows/security.yml:101` | wajib | `@cyclonedx/cyclonedx-npm@latest` menarik versi terbaru saat run |
| SC-10 | Base image dipin ke digest | OWASP A08 | 🟡 parsial | `docker-compose.yml:59` | wajib | `nginx` dipin digest; `node:24-slim` tidak |
| SC-12 | Dependensi runtime production diperkecil | OWASP A08 | ✅ ada | `Dockerfile:26` | wajib | Hanya `.next/standalone`, `.next/static`, `public` yang disalin |

## N. Infrastructure

| ID | Item | Kategori | Status | Bukti | Prioritas | Catatan |
| --- | --- | --- | --- | --- | --- | --- |
| INF-01 | Container berjalan sebagai non-root | OWASP A05 | ✅ ada | `Dockerfile:30` | wajib | User `nextjs`, uid 1001 |
| INF-02 | UID/GID eksplisit di compose | OWASP A05 | ✅ ada | `docker-compose.yml:14` | wajib | `1001:1001` |
| INF-03 | Root filesystem read-only | OWASP A05 | ✅ ada | `docker-compose.yml:23` | wajib | `read_only: true` dengan tmpfs terbatas |
| INF-04 | Linux capability dibuang | OWASP A05 | ✅ ada | `docker-compose.yml:29` | wajib | `cap_drop: ALL` |
| INF-07 | Healthcheck terdefinisi | OWASP A04 | ✅ ada | `docker-compose.yml:36` | wajib | Mengambil `/`; akan menjadi mahal bila landing page berat |
| INF-08 | Jaringan internal untuk service aplikasi | OWASP A05 | ✅ ada | `docker-compose.yml:114` | wajib | Network `backend` `internal: true` |
| INF-10 | TLS di reverse proxy | OWASP A02 | ❌ belum | `nginx/nginx.conf:7` | wajib | Listen 9080 HTTP polos; harus ada terminator TLS di luar compose |
| INF-11 | Ukuran body dibatasi di proxy | OWASP A04 | ✅ ada | `nginx/nginx.conf:10` | wajib | 20M |
| INF-13 | Header proxy diteruskan dengan benar | OWASP A04 | 🟡 parsial | `nginx/nginx.conf:33` | wajib | `X-Real-IP` dan `X-Forwarded-For` ada; `X-Forwarded-Proto` dipercaya tanpa validasi |
| INF-14 | Access log untuk path sensitif | OWASP A09 | 🟡 parsial | `nginx/nginx.conf:21` | wajib | `access_log off` hanya untuk `/_next/static`; `/` masih dilog |
| INF-18 | Resource tmpfs memakai noexec dan nosuid | OWASP A05 | ✅ ada | `docker-compose.yml:25` | wajib | Berlaku untuk `/tmp` dan cache |
| INF-20 | Backup dan pemulihan | OWASP A04 | ❌ belum | — | wajib | Tidak ada strategi backup karena tidak ada storage |

## O. Testing dan Secure Development Lifecycle

| ID | Item | Kategori | Status | Bukti | Prioritas | Catatan |
| --- | --- | --- | --- | --- | --- | --- |
| TST-01 | Test runner tersedia | OWASP A04 | ❌ belum | `package.json:5` | wajib | Hanya `dev`, `build`, `start`, `lint` |
| TST-02 | Lint berjalan di CI | OWASP A04 | ✅ ada | `.github/workflows/ci.yml:36` | wajib | `npm run lint` |
| TST-04 | Build berjalan di CI | OWASP A04 | ✅ ada | `.github/workflows/ci.yml:40` | wajib | — |
| TST-05 | Unit test untuk validasi dan kripto | OWASP A04 | ❌ belum | — | wajib | `hashResetToken`, `verifyTotpCode`, `redactTags`, `verifyChain` tidak punya test |
| TST-06 | Test negatif untuk authorization | OWASP A01 | ❌ belum | — | wajib | Tidak ada uji bahwa action menolak role non-admin |
| TST-07 | Test IDOR | OWASP A01 | ❌ belum | — | wajib | — |
| TST-08 | Vulnerability scanning kontinu | OWASP A06 | ✅ ada | `.github/workflows/security.yml` | wajib | Lima job keamanan berjalan pada PR dan push ke `dev` |
| TST-09 | Branch protection di `dev` | OWASP A04 | ❌ belum | — | wajib | Tidak dapat diverifikasi dari repo; harus diatur di pengaturan GitHub |
| TST-11 | Merge checklist keamanan di `docs/SECURITY.md` | OWASP A04 | ✅ ada | `docs/SECURITY.md:128` | wajib | 13 butir sebelum merge |
| TST-14 | TypeScript `strict` tetap aktif | OWASP A04 | ✅ ada | `tsconfig.json` | wajib | Tidak ada `any` atau non-null assertion pada data yang bisa `undefined` |

## P. Compliance dan Tata Kelola

| ID | Item | Kategori | Status | Bukti | Prioritas | Catatan |
| --- | --- | --- | --- | --- | --- | --- |
| GOV-01 | Kebijakan privasi dipublikasikan | OWASP A05 | 🟡 parsial | `src/config/public-pages.ts` | wajib | Route `/privacy` ada, konten placeholder |
| GOV-03 | Kontak pelaporan insiden | OWASP A05 | 🟡 parsial | `src/app/(public)/contact/page.tsx` | recommended | Form kontak ada, kanal penerima belum ditentukan |
| GOV-04 | Prosedur incident response terdokumentasi | OWASP A09 | 🟡 parsial | `docs/INCIDENT-RESPONSE.md` | wajib | Draft; owner dan kontak masih `[TODO]` |
| GOV-05 | Post-mortem blameless | OWASP A09 | 🟡 parsial | `docs/INCIDENT-RESPONSE.md` bagian 10 | wajib | Template ada, belum pernah dijalankan |
| GOV-07 | Registri pemrosesan data pribadi | UU PDP | ❌ belum | — | wajib | Tidak ada daftar sistem dan kategori data |
| GOV-08 | Designated contact untuk notifikasi insiden | UU PDP | ❌ belum | — | wajib | [TODO] |
| GOV-09 | `robots.txt` menutup route privat | OWASP A05 | ✅ ada | `src/app/robots.ts:17` | recommended | Menutup route auth, dashboard, dan metadata internal |
| GOV-10 | Route privat `noindex` | OWASP A05 | ✅ ada | `src/app/(dashboard)/layout.tsx:8` | recommended | `robots: noindex, nofollow` |

## Ringkasan Status

Dihitung dari tabel di atas, bukan diketik manual. Kalau kamu menambah atau mengubah status, hitung ulang tabel ini.

| Kategori | Item | `✅ ada` | `🟡 parsial` | `❌ belum` |
| --- | --- | --- | --- | --- |
| A. Authentication dan Session | 26 | 12 | 7 | 7 |
| B. Authorization | 10 | 1 | 2 | 7 |
| C. Input Validation | 14 | 11 | 1 | 2 |
| D. HTTP Headers | 12 | 9 | 1 | 2 |
| E. CSRF | 2 | 0 | 2 | 0 |
| F. Rate Limiting dan Anti-Abuse | 10 | 6 | 0 | 4 |
| G. Secrets dan Environment | 9 | 4 | 3 | 2 |
| H. Logging dan Audit | 20 | 8 | 3 | 9 |
| I. Data Protection | 9 | 2 | 1 | 6 |
| J. Error Handling | 7 | 6 | 1 | 0 |
| K. SSRF, File Upload, dan Outbound | 4 | 2 | 0 | 2 |
| M. Supply Chain | 9 | 6 | 1 | 2 |
| N. Infrastructure | 12 | 8 | 2 | 2 |
| O. Testing dan Secure Development Lifecycle | 10 | 5 | 0 | 5 |
| P. Compliance dan Tata Kelola | 8 | 2 | 4 | 2 |
| **Total** | **162** | **82** | **28** | **52** |

## Tujuh Gap Kritis

Diurutkan berdasarkan dampak, bukan berdasarkan banyaknya work item.

1. **Tidak ada perimeter auth sama sekali pada situs Pages.** Guard `(dashboard)/layout.tsx` lewat `requirePageSession()` sudah dicabut dan diparkir karena static export tidak mendukung cookie/Server Action, sehingga semua route `(dashboard)` bisa dibuka tanpa sesi. `proxy.ts` juga tetap tidak ada. Token `mock_session` yang masih ada di repo hanya dicocokkan ke `Map` memori tanpa verifikasi signature/kunci server — dan itu pun baru relevan lagi setelah host Node dipasang. (AUTHZ-01, AUTHZ-02, AUTHZ-05)
2. **Audit log tidak pernah ditulis.** `logAudit()` tidak punya call site, tidak ada halaman audit, dan store-nya in-memory. `/settings/logs` disebut di komentar `src/app/robots.ts:8` padahal route-nya tidak ada, sehingga tidak ada jejak audit untuk insiden apa pun. (LOG-03, LOG-06, LOG-08)
3. **Tidak ada hashing password, dan kredensial demo ada di source.** `src/features/auth/service.ts:94`. (AUTH-01, AUTH-02, SEC-07)
4. **Redactor tidak dipakai pada logger.** `redactTags()` hanya berjalan pada `tags` metrik dan `metadata` audit; teks dari user masuk log apa adanya di `src/features/contact/actions.ts:70`. (LOG-10, DP-08)
5. **Server Action dan `requireRole` tidak terpakai.** Satu-satunya Server Action yang tersisa di repo adalah `src/features/auth/actions.ts` (`loginAction` publik tanpa session, `logoutAction` hanya mencabut sesi pemanggil), sementara `requireRole()` tidak punya satu pun pemanggil — helper hierarki role ada tapi tidak menjadi gate di mana pun. Semua mutasi lewat UI kini terjadi di handler client yang memanggil service in-memory, jadi tidak ada boundary server yang bisa menolak. (AUTHZ-03, AUTHZ-04, AUTHZ-08)
6. **Tidak ada test runner sama sekali.** `package.json` hanya punya empat script, sehingga tidak ada cara mendeteksi regresi keamanan otomatis pada `verifyChain`, `redactTags`, atau `verifyTotpCode`. (TST-01, TST-05, TST-06)
7. **Semua state in-memory, sehingga rate limit dan kontrol lain hilang saat restart.** Termasuk rate limit, MFA challenge, backup code yang sudah terpakai, audit, dan metrik. (AUTH-38, LOG-06)

## Yang Bisa Dikerjakan Sekarang Tanpa Backend

Urutan berdasarkan nilai per usaha. Tidak ada item di daftar ini yang butuh database, email, atau layanan eksternal.

1. ~~Pasang `proxy.ts` sebagai guard awal dengan allowlist route publik dan redirect ke `/login` (AUTHZ-01).~~ Masih belum ada `proxy.ts`, dan guard `(dashboard)/layout.tsx` yang sempat menjadi versi lebih sempit kini juga dicabut (diparkir untuk static export). Sisa pekerjaannya: proxy butuh host Node; di GitHub Pages tidak ada perimeter auth yang bisa dipasang.
2. ~~Ubah `requireSession()` menjadi default-deny dengan satu flag demo sementara~~ — sudah terpasang: `requireSession()` membaca cookie session mock dan melempar `UNAUTHENTICATED`, sementara bypass dev hanya lewat `requireSessionForDev()` dan hanya bila `DEV_AUTH_BYPASS=1` serta bukan production. Yang tersisa: mengganti token memori dengan session terverifikasi kriptografis, dan menambah lockout akun (AUTH-08, AUTHZ-05).
3. Wiring `logAudit()` ke `verifyMfaAction`, `verifyBackupCodeAction`, `disableMfaAction`, `createUserAction`, `updateUserAction`, `deleteUserAction`, dan `requestPasswordReset` (LOG-03). `loginAction` dan `logoutAction` sudah masuk: login mencatat `login_success`/`login_rejected`/`rate_limit_hit`, logout masih memakai logger karena belum ada nama action audit-nya.
4. Tambahkan halaman `/settings/logs` yang membaca `queryAuditEvents()` dan menampilkan hasil `verifyAuditIntegrity()` (LOG-08).
5. Perbaiki `roleChanged` agar hanya dikirim saat role benar-benar berubah, dan tambahkan event terpisah untuk perubahan role (AUTHZ-12).
6. Pindahkan redaksi ke dalam `logger`; terapkan juga pada `actor`, `userAgent`, dan `host` di audit (LOG-10, LOG-11).
7. Hapus `resetTokensByHash.clear()` di `requestPasswordReset` supaya dua request tidak saling membatalkan.
8. Tambahkan bucket rate limit per IP hash memakai `getSafeRequestContext()` (RL-08).
9. Tambahkan `import "server-only"` pada `src/features/observability/lib/store.ts`, `src/features/audit/lib/store.ts`, dan `src/features/ueba/lib/user-timeline.ts` (SEC-13).
10. Tambahkan test runner beserta test untuk `redactTags`, `verifyChain`, `hashResetToken`, `verifyTotpCode`, dan `safeEqual` (TST-01, TST-05).
11. Tambahkan `limit_req` di `nginx/nginx.conf` untuk `/login` dan endpoint Server Action (RL-13).
12. Tambahkan guard role di halaman `/users`, `/settings/ueba`, `/settings/observability` memakai `requireRole` yang sudah ada (AUTHZ-08).
13. Tambahkan `npm ci --ignore-scripts` di kedua workflow CI (SC-08).
14. Pin `@cyclonedx/cyclonedx-npm` ke versi eksak di `security.yml` (SC-09).
15. Gate enrollment email dan kode demo dengan flag eksplisit, dan jangan ekspor `MFA_DEMO_CODE` ke jalur client (AUTH-31, AUTH-32).

## Checklist Minimum "Production-Ready"

Saat ini hampir tidak ada yang bisa dicentang tanpa backend; itu memang kondisi faktual repo, bukan penilaian terhadap tim.

- [ ] Tidak ada kredensial atau secret di source
- [ ] Semua password di-hash dengan algoritma modern
- [ ] Session provider terpasang dengan `httpOnly`, `secure`, `sameSite`, dan prefiks `__Host-`
- [ ] Ada mekanisme logout dan invalidasi session
- [ ] Guard route di `proxy.ts`, ditambah pengulangan cek di setiap Server Action
- [ ] Role check di setiap halaman dan action yang menyentuh data sensitif
- [ ] Ownership check untuk setiap resource milik user
- [ ] Audit log menulis pada semua event keamanan dan persisten
- [ ] Verifikasi integritas audit berjalan terjadwal
- [ ] Redactor dipanggil di wrapper logger, bukan di call site
- [ ] Tidak ada PII mentah di log, metrik, atau halaman
- [ ] Rate limit per IP dan per identitas, dengan store yang tahan restart dan multi-instance
- [ ] CSP tanpa `'unsafe-inline'` pada `script-src`
- [ ] TLS aktif dan HSTS tervalidasi di lingkungan target
- [ ] Dependency audit bersih pada tingkat high
- [ ] Container non-root, read-only, dengan capability minimal
- [ ] Test runner ada dan test keamanan dasar lulus
- [ ] `npm run lint` dan `npm run build` lulus
- [ ] Threat model fitur terbaru sudah diisi
- [ ] Prosedur incident response sudah direview dan pemiliknya diketahui
- [ ] Kontak notifikasi regulator sudah ditetapkan

## Pemetaan ke Standar

Referensi kontrol untuk item yang paling sering ditanyakan. Prefix WSTG memakai kategori yang lazim; verifikasi terhadap versi yang dipakai organisasi sebelum menjadikannya acuan formal.

| Item | OWASP WSTG | OWASP ASVS 5.0 | NIST SP 800-53 |
| --- | --- | --- | --- |
| AUTH-01, AUTH-02 | CRT-03 | 2.4 | IA-5(1), SC-13 |
| AUTH-05, RL-01 | ATH-07 | 2.7 | AC-7, SC-5 |
| AUTH-09, AUTH-10, AUTH-11, AUTH-13 | SES-01, SES-03 | 3.1, 3.2 | SC-23, AC-12 |
| AUTH-20 | ATH-04 | 2.4, 3.5 | IA-5(1) |
| AUTH-23, AUTH-24, AUTH-26, AUTH-27 | ATH-06 | 2.5, 2.6 | IA-5(1), SC-13 |
| AUTH-30, AUTH-34 | ATH-11 | 2.7, 2.4 | IA-5(1) |
| AUTHZ-01, AUTHZ-02, AUTHZ-03, AUTHZ-04 | ATH-01, ATH-02 | 4.1, 4.2 | AC-3, AC-6, AC-17 |
| AUTHZ-05, AUTHZ-06, AUTHZ-07, AUTHZ-08 | IDOR-01 | 4.2, 4.3 | AC-3, AC-6 |
| VAL-01, VAL-02, VAL-03, VAL-04, VAL-05, VAL-07 | INPV-01, INPV-02 | 2.2, 3.3 | SI-10, SC-20 |
| VAL-08, VAL-09 | SQLI-01 | 5.3 | SA-11, SI-10 |
| HDR-01, HDR-02, HDR-03, HDR-05, HDR-06, HDR-08, HDR-09, HDR-11, HDR-14, HDR-19, HDR-20, HDR-21 | CONF-06, CONF-07, CONF-11 | 14.1, 14.4 | SC-7, CM-7, SC-8 |
| CSRF-01, CSRF-03 | CSRF-01 | 4.7, 3.4 | SC-23, CS-2 |
| RL-01, RL-02, RL-08, RL-10, RL-13 | ATH-07, DOS-04 | 4.9, 2.7 | SC-5, AC-7 |
| SEC-01, SEC-02, SEC-03, SEC-04 | CONF-02, CONF-05 | 14.2, 14.6 | CM-6, IA-5(6) |
| SEC-05, SEC-07, SEC-12, SEC-13 | CONF-01 | 14.3, 6.3 | SC-28, SC-31 |
| LOG-01, LOG-02, LOG-03, LOG-04, LOG-06, LOG-07 | LOG-01, LOG-04 | 7.1, 7.2, 7.3 | AU-2, AU-3, AU-9, AU-10 |
| LOG-09, LOG-10, LOG-11, LOG-12, LOG-16, LOG-17, LOG-18, LOG-20 | LOG-03 | 7.1, 7.4 | AU-3(2), SI-12 |
| LOG-19, LOG-22, LOG-25 | LOG-07 | 8.13, 8.14 | AU-6, SI-4 |
| DP-01, DP-02, DP-03, DP-05 | DATA-01, DATA-02 | 6.1, 6.2, 8.3 | SC-28, AP-2, MP-6 |
| DP-08, DP-09, DP-11, DP-12 | DATA-03 | 6.4, 8.5 | SC-28, AC-3 |
| ERR-01, ERR-02, ERR-03, ERR-04, ERR-05, ERR-06, ERR-07 | CONF-04 | 5.3, 5.5 | SI-11, CM-6 |
| SSRF-01, SSRF-03 | WSTG-SSRF | 5.6 | SC-7, SI-10 |
| UP-01, UP-02 | FILE-01, FILE-02 | 5.7, 5.8 | SI-7, SC-7 |
| SC-01, SC-02, SC-03, SC-04, SC-07, SC-08, SC-09, SC-10, SC-12 | CONF-04, APP-11 | 15.1, 15.3 | SA-10, SA-11, CM-7, SI-7 |
| INF-01, INF-02, INF-03, INF-04, INF-07, INF-08, INF-10, INF-11, INF-13, INF-14, INF-18, INF-20 | INF-01, INF-02 | 13.1, 13.2 | CM-7, AC-6, CP-9, CP-10 |
| TST-01, TST-02, TST-04, TST-05, TST-06, TST-07, TST-08, TST-09, TST-11, TST-14 | CST-01, CST-02 | 2.1, 14.5 | SA-11, CA-7, AT-3 |
| GOV-01, GOV-03, GOV-04, GOV-05, GOV-07, GOV-08, GOV-09, GOV-10 | CONF-13 | 1.1, 1.4, 8.2 | PM-9, PS-7, AT-2 |

Keterangan: kolom ASVS mengacu pada OWASP ASVS 5.0. Prefix WSTG: `CRT` credential, `ATH` authentication, `SES` session, `INPV` input validation, `CONF` configuration, `CSRF`, `IDOR`, `SQLI`, `LOG`, `DATA`, `DOS` denial of service, `FILE` file upload, `APP` application, `INF` infrastructure, `CST` client-side. Verifikasi penomoran terhadap dokumentasi resmi sebelum dipakai untuk audit formal.

## Referensi Silang

| Dokumen | Isi |
| --- | --- |
| `docs/SECURITY.md` | Persyaratan (apa yang harus ada), OWASP Top 10, checklist sebelum merge |
| `docs/THREAT-MODEL.md` | STRIDE per aset, trust boundary, status kontrol per ancaman |
| `docs/INCIDENT-RESPONSE.md` | Prosedur saat insiden, severity ladder, evidence, post-mortem |
| `docs/ARCHITECTURE.md` | Peta route, boundary data, gap yang diketahui |
| `docs/INTEGRATION.md` | Batas mock versus nyata, cara memasang session dan RBAC |
| `docs/ERROR-HANDLING.md` | Taksonomi `AppError` dan Problem Details |
| `docs/SETUP.md` | Setup lokal dan environment variable |
