# Threat Model

> Status: draft. Owner: [TODO]. Review cycle: tiap sprint.

Metodologi: STRIDE per aset, mengikuti trust boundary nyata di repository ini. Setiap entri threat mencantumkan file yang benar-benar ada; status kontrol diverifikasi dengan membaca kode, bukan dengan mempercayai dokumen lain. Persyaratan (apa yang harus ada) ada di `docs/SECURITY.md`; tracker status ada di `docs/SECURITY-CHECKLIST.md`.

Disclaimer yang harus dibaca lebih dulu: aplikasi ini **frontend-only**. Tidak ada database, tidak ada session nyata, tidak ada email, tidak ada Route Handler. Sebagian besar threat di bawah berakar pada ketiadaan backend, bukan pada bug di kode yang ada. Skor likelihood memakai skala berikut.

| Skor | Arti |
| --- | --- |
| 1 | Tidak mungkin dalam kondisi saat ini (mis. SQLi tanpa database) |
| 2 | Mungkin setelah penambahan fitur tertentu |
| 3 | Mungkin pada konfigurasi yang sekarang |
| 4 | Hampir pasti tanpa kontrol tambahan |
| 5 | Sudah terjadi pada kondisi sekarang |

## 1. Aset

| ID | Aset | Lokasi | Sensitivitas | Keterangan nyata |
| --- | --- | --- | --- | --- |
| A1 | Kredensial user | `src/features/auth/service.ts:89` (`users` Map) | tinggi | Satu user mock: `demo@example.com` / `password123`, password disimpan sebagai string plain |
| A2 | Secret MFA dan backup code | `src/features/auth/service.ts:74` (`MfaEnrollment`), `src/lib/totp.ts` | sangat tinggi | Secret TOTP base32 20 byte; backup code disimpan sebagai sha256 hex; keduanya in-memory |
| A3 | Token reset password | `resetTokensByHash`, `src/features/auth/service.ts:170`; cookie `mfa_pending` di `src/features/auth/mfa-session.ts:13` | tinggi | Token di-hash dengan sha256 tanpa salt, TTL 1 jam; cookie 10 menit, httpOnly, path terbatas |
| A4 | Audit log dan hash chain | `src/features/audit/lib/store.ts` | tinggi | Maks 5000 entry in-memory, `hash`/`previousHash` sha256, `droppedEntries` |
| A5 | Metrik dan baseline UEBA | `src/features/observability/lib/store.ts`, `src/features/ueba/lib/baseline.ts` | sedang | 5000 event; baseline butuh 20 event per aktor; window 30 hari |
| A6 | Data user dan role | `src/features/user/service.ts:6` (`MOCK_USERS`), `src/features/roles/actions.ts:28` | tinggi | 12 user dengan nama, email, role, status; kredensial mock hardcoded di source |
| A7 | Halaman publik | `src/app/(public)/**`, `src/features/landing/**` | rendah | Statis; satu-satunya data yang masuk adalah isi form kontak |
| A8 | Build output standalone | `Dockerfile:26`, `next.config.ts:53` | tinggi | Mengandung seluruh bundle client dan kode server; `productionBrowserSourceMaps: false` |
| A9 | Container dan reverse proxy | `Dockerfile`, `docker-compose.yml`, `nginx/nginx.conf` | tinggi | User `1001:1001`, read-only rootfs, cap_drop ALL, network `backend` internal |

## 2. Trust boundary

```
[1] Browser  <--->  [2] Next.js (Server Action / RSC)
                      |
                      +--> [3] store in-memory (audit, metrik, ueba, users, auth)
                      +--> [4] log pino (stdout)
                      |
[5] nginx (reverse proxy)  --X-Forwarded-For-->  [2]

[6] Env (process.env) --> [2]    satu arah: nilai masuk ke server tanpa validasi makna
[7] Developer --> registry npm --> [2]
```

| ID | Boundary | Apa yang melintasi | Kepercayaan | Catatan nyata |
| --- | --- | --- | --- | --- |
| TB1 | Browser ke Next (Server Action) | Form body, `params`, `searchParams`, cookie | Tidak dipercaya | Next 16 memverifikasi Origin untuk Server Action, tetapi itu bukan kontrol otorisasi |
| TB2 | Next ke store in-memory | Objek JS | Terpercaya (server) | Semua map dimiliki satu proses; hilang saat restart |
| TB3 | Next ke log | String terstruktur | Terpercaya | Tidak ada redactor di wrapper `logger` |
| TB4 | Proxy ke aplikasi | Header `X-Forwarded-For`, `X-Real-IP`, `X-Forwarded-Proto` | Sebagian dipercaya | `getRequestContext()` membaca `x-forwarded-for` dan mengambil entri pertama |
| TB5 | Developer ke registry | Package dan lockfile | Perlu verifikasi | `npm ci`, `npm audit`, Dependabot, CodeQL, SBOM sudah ada di CI |
| TB6 | Env ke proses | `process.env` | Dipercaya penuh | Hanya `NODE_ENV` dan `NEXT_PUBLIC_APP_URL` yang divalidasi (`src/lib/env.ts`) |

Catatan penting soal TB1: `next.config.ts` tidak mengatur `allowedOrigins`, dan reverse proxy meneruskan `X-Forwarded-Proto` tanpa memvalidasi nilainya. Perubahan berbasis Origin pada aplikasi ini harus diuji dengan deployment nyata, bukan diasumsikan aman atau tidak aman.

## 3. Register threat

### THREAT-001 — Akses dashboard tanpa autentikasi
- Kategori: Spoofing / Elevation of Privilege
- Aset: A6, A8
- Vektor: buka langsung `/dashboard`, `/users`, `/roles`, `/settings/*`
- Prasyarat: tidak ada
- Dampak: akses penuh ke seluruh dashboard dan data user
- Kontrol yang sudah ada: `metadata.robots: noindex` di `src/app/(dashboard)/layout.tsx:8`; `Disallow` di `src/app/robots.ts`; `requireRole()` di `src/lib/rbac.ts:18`
- Kontrol yang belum ada: `proxy.ts` atau `middleware.ts` sama sekali tidak ada di repo; tidak ada session; tidak ada guard di layout; `requireSession()` mengembalikan admin konstan (`src/lib/rbac.ts:15`)
- Mitigasi: pasang `proxy.ts` sebagai guard awal; ganti `requireSession()` dengan session provider nyata; jadikan `requireSession` default-deny
- Dampak nyata saat ini: data mock, jadi kebocorannya data rekaan, tetapi arsitekturnya terbuka total
- Likelihood: 5 (sudah terjadi)
- Status: todo

### THREAT-002 — Otorisasi hanya di sebagian boundary
- Kategori: Elevation of Privilege
- Aset: A6
- Vektor: Server Action yang tidak memanggil `requireRole`
- Prasyarat: ada action baru
- Dampak: mutasi data tanpa cek role
- Kontrol yang sudah ada: `createUserAction`, `updateUserAction`, `deleteUserAction` memanggil `requireSession()` lalu `requireRole(session, "admin")` (`src/features/user/actions.ts:46`); `getRolesAction` melakukan hal sama (`src/features/roles/actions.ts:79`)
- Kontrol yang belum ada: `requireRole` tidak dipanggil di action lain. `disableMfaAction` (`src/features/auth/actions.ts:549`) memakai `CURRENT_USER_ID` konstan tanpa cek session sama sekali. `seedDemoMetricsAction` hanya dijaga pemeriksaan `NODE_ENV`, bukan role. Halaman `/settings/ueba`, `/settings/observability`, dan `/users` tidak punya pemeriksaan role di server
- Mitigasi: buat wrapper `requirePermission(permission)`; jalankan di setiap action; tambahkan daftar eksplisit route privat dan role yang boleh
- Likelihood: 4
- Status: partial

### THREAT-003 — IDOR pada halaman detail
- Kategori: Information Disclosure / Elevation of Privilege
- Aset: A6, A5
- Vektor: `/users/[id]` dengan id milik orang lain; `/settings/ueba/[actorId]`
- Prasyarat: tidak ada session, jadi tidak ada konsep kepemilikan
- Dampak: baca data user, baca aktivitas aktor lain
- Kontrol yang sudah ada: `getUserById()` melempar `NOT_FOUND` bila id tidak ada (`src/features/user/service.ts:76`); `uebaActorIdSchema` memvalidasi bentuk `actorId`
- Kontrol yang belum ada: tidak ada ownership check; `src/app/(dashboard)/users/[id]/page.tsx:16` merender `id` apa adanya
- Mitigasi: verifikasi kepemilikan di service; pada data admin, buat role check eksplisit
- Likelihood: 4
- Status: todo

### THREAT-004 — Kredensial plaintext di source
- Kategori: Information Disclosure
- Aset: A1
- Vektor: siapa pun yang membaca repository atau bundle
- Prasyarat: akses ke source
- Dampak: login sebagai user demo tanpa perlu menebak
- Kontrol yang sudah ada: gitleaks di `.github/workflows/security.yml`; `.env*` di-ignore `.gitignore` dengan pengecualian `.env.example`; `verifyCredentials` memakai `timingSafeEqual` (`src/features/auth/service.ts:144`)
- Kontrol yang belum ada: tidak ada hashing password sama sekali; string `password123` ada di source; `MOCK_USERS` berisi nama dan email realistis
- Mitigasi: pindah ke argon2id atau bcrypt lewat library auth; pindahkan kredensial demo ke `.env.local`; ganti data mock menjadi sintetis
- Likelihood: 5
- Status: todo

### THREAT-005 — Rate limit dapat dilewati dengan rotasi identitas
- Kategori: Denial of Service / Spoofing
- Aset: A1
- Vektor: `enforceRateLimit(email, "login")` dipanggil dengan e-mail dari payload
- Prasyarat: tidak ada
- Dampak: brute force tanpa limit, atau DoS pada satu akun dengan 5 percobaan
- Kontrol yang sudah ada: `enforceRateLimit` dengan bucket per `purpose:max:window` (`src/lib/rate-limit.ts:47`); default 5 percobaan per 15 menit pada login (`MFA_RATE_LIMIT`, `src/features/auth/actions.ts:51`); limit global untuk register, contact, dan CRUD user
- Kontrol yang belum ada: tidak ada bucket per IP; `attemptsByPurpose` adalah `Map` in-memory, jadi reset tiap restart dan tidak berlaku multi-instance; tidak ada backoff eksponensial, tidak ada lockout akun, tidak ada captcha; `MFA_MAX_ATTEMPTS` di service (`src/features/auth/service.ts:32`) tidak konsisten dengan limit HTTP
- Mitigasi: tambahkan identifier IP (hash) sebagai bucket kedua; pindah ke Redis untuk deployment multi-instance; tambahkan lockout dan backoff
- Likelihood: 4
- Status: partial

### THREAT-006 — Cookie MFA dapat dicuri pada jaringan tidak terenkripsi
- Kategori: Spoofing
- Aset: A3
- Vektor:Tdidd; sadap cookie `mfa_pending` pada koneksi HTTP
- Prasyarat: akses jaringan, dan `secure` hanya aktif di production (`src/features/auth/mfa-session.ts:21`)
- Dampak:izos-in hijacking langkah MFA
- Kontrol yang sudah ada: `httpOnly`; `sameSite: "lax"`; `path` dibatasi ke `/login/mfa`; `maxAge` 10 menit; HSTS `max-age=63072000; includeSubDomains; preload` (`next.config.ts:46`)
- Kontrol yang belum ada: tidak ada session user sama sekali setelah MFA sukses, jadi cookie ini adalah satu-satunya bukti kepemilikan langkah MFA; tidak ada pengikatan token ke IP atau user agent; tidak ada `__Host-` prefix; `secure` bergantung pada `NODE_ENV`, bukan pada skema request
- Mitigasi: selalu set `secure` di luar development, bukan hanya di production; tambahkan token bertanda tangan yang memuat nonce user; ikat ke konteks device
- Likelihood: 2
- Status: partial

### THREAT-007 — Bypass MFA lewat kode demo di luar production
- Kategori: Elevation of Privilege
- Aset: A2
- Vektor: kirim `123456` pada `/login/mfa` atau enrollment
- Prasyarat: `NODE_ENV !== "production"` (`isDemoMode`, `src/features/auth/service.ts:46`)
- Dampak: MFA dilewati sepenuhnya; enrollment email hanya menerima `123456`
- Kontrol yang sudah ada: gating `isDemoMode` di `verifyMfaCode` (`src/features/auth/service.ts:430`) dan `confirmEmailEnrollment` (`src/features/auth/service.ts:685`); `MFA_DEMO_CODE` diekspor dari service sehingga bisa diimpor client
- Kontrol yang belum ada: tidak ada build-time assertion bahwa production build tidak mengaktifkan jalur ini; `MFA_DEMO_CODE` tidak di-gate saat bundling; `disableMfa` tidak replay-safe
- Mitigasi: gate dengan flag eksplisit per environment dan fail-fast saat start bila production terdeteksi dengan jalur demo aktif; jangan ekspor kode demo dari modul yang bisa masuk bundle client
- Likelihood: 3
- Status: partial

### THREAT-008 — Backup code dapat dipakai ulang karena state hilang
- Kategori: Spoofing
- Aset: A2
- Vektor: pakai backup code, lalu reset container, lalu pakai kode yang sama lagi
- Prasyarat: akses ke container (mis. crash loop)
- Dampak: satu backup code jadi berkali-kali berlaku
- Kontrol yang sudah ada: `MFA_BACKUP_CODE_COUNT` 10; alphabet tanpa karakter ambigu (`src/features/auth/service.ts:42`); kode disimpan sebagai sha256 dan dihapus saat dipakai (`src/features/auth/service.ts:479`); `safeEqual` untuk perbandingan
- Kontrol yang belum ada: tanpa persistence, seluruh set MFA hilang saat restart, termasuk status aktif dan kode terpakai
- Mitigasi: pindah ke tabel dengan transaksi atomic saat konsumsi kode
- Likelihood: 2
- Status: partial

### THREAT-009 — Reset password tidak mengubah apa pun
- Kategori: Tampering
- Aset: A1, A3
- Vektor: meminta reset, lalu `resetPassword` menandai token terpakai tanpa mengubah password
- Prasyarat: tidak ada
- Dampak: user mengira password sudah diganti padahal tidak; false sense of security
- Kontrol yang sudah ada: token di-hash sha256 (`hashResetToken`); TTL 1 jam; single-use lewat `usedAt`; `resetTokenSchema` mewajibkan 64 hex (`src/features/auth/schema.ts:64`); TTL cookie MFA 10 menit
- Kontrol yang belum ada: `resetPassword()` (`src/features/auth/service.ts:217`) tidak menulis ke store user; `requestPasswordReset` melakukan `resetTokensByHash.clear()` di setiap pemanggilan (`src/features/auth/service.ts:188`), sehingga request kedua membatalkan request pertama dan hanya menyisakan token terakhir; tidak ada email; tidak ada invalidasi session
- Catatan: `hashResetToken` dipakai juga untuk backup code, jadi hash-nya tanpa salt dan tanpa domain separation. Untuk backup code dengan entropy tinggi ini masih dapat diterima, tapi pola ini sebaiknya dihindari di produksi
- Mitigasi: implementasikan perubahan password, hapus `clear()`, kirim token lewat kanal email terenkripsi, invalidasi seluruh sesi
- Likelihood: 5
- Status: todo

### THREAT-010 — Token reset bocor lewat log di development
- Kategori: Information Disclosure
- Aset: A3
- Vektor: `logger.info("auth.reset.requested", { resetPath: `/reset-password?token=${token}` })` (`src/features/auth/service.ts:196`)
- Prasyarat: `isDemoMode`
- Dampak: token reset lengkap ada di log dan terminal
- Kontrol yang sudah ada: spread bersyarat `...(isDemoMode ? { resetPath } : {})`, jadi production tidak menulis path; token yang disimpan sudah berupa hash
- Kontrol yang belum ada: tidak ada redactor di logger; `requestId` tidak pernah diisi di path mana pun; tidak ada scrubbing di layer transport
- Mitigasi: pindahkan pencetakan token ke fitur debug eksplisit, bukan berdasarkan `NODE_ENV`; tambahkan redactor di wrapper logger
- Likelihood: 3
- Status: partial

### THREAT-011 — Hash chain audit tidak memblokir modifikasi
- Kategori: Tampering / Repudiation
- Aset: A4
- Vektor: ubah `entries` atau `head` di store in-memory
- Prasyarat: akses ke proses atau ke memori heap
- Dampak: log terbukti dimanipulasi, dan log kosong tidak menghasilkan temuan apa pun
- Kontrol yang sudah ada: `computeEntryHash` memakai sha256 dan mengaitkan `previousHash` (`src/features/audit/lib/integrity.ts:18`); `verifyChain` mengembalikan indeks pertama yang rusak; `verifyAuditIntegrity()` tersedia (`src/features/audit/service.ts:67`); `logAudit()` tidak pernah melempar exception
- Kontrol yang belum ada: **store audit tidak pernah ditulis** — `logAudit()` tidak dipanggil dari mana pun di `src/`; tidak ada halaman UI; tidak ada persistence; `resetAuditStore()` terekspor dan akan menghapus seluruh chain; `verifyChain` hanya valid bila `droppedEntries` nol
- Mitigasi: wiring `logAudit()` ke login, logout, reset, perubahan role, CRUD, akses dashboard; pindahkan ke DB append-only; anchor head hash di luar proses; jalankan verifikasi terjadwal
- Likelihood: 5
- Status: todo

### THREAT-012 — Anomali privilege_change tidak dapat dipakai sebagai bukti
- Kategori: Repudiation
- Aset: A5
- Vektor: `updateUserAction` selalu mengirim `tags: { roleChanged: "true" }` (`src/features/user/actions.ts:74`) pada setiap update, bukan hanya saat role berubah
- Prasyarat: satu update user biasa
- Dampak: `detectPrivilegeChange` (`src/features/ueba/lib/anomaly.ts:216`) menyala terus, risiko ter_FALSE_POSITIVE, analis menjadi buta
- Kontrol yang sudah ada: score 0.8 dan bobot 20, jadi anomali berisiko tinggi; `computeRisk` ada peluruhan 72 jam (`src/features/ueba/lib/risk.ts:26`); filter level tersedia di `listUserRiskProfiles`
- Kontrol yang belum ada: tidak ada event terpisah untuk perubahan role; tidak ada sumber kebenaran yang bisa dibandingkan; tidak ada alert, hanya UI
- Mitigasi: kirim `roleChanged` hanya bila `role` benar-benar berbeda; tambahkan event `security.role_change`; tambahkan `fromRole` dan `toRole` pada tags yang sudah ter-redact
- Likelihood: 5
- Status: todo

### THREAT-013 — Baseline UEBA tidak ada untuk akun baru
- Kategori: Denial of Service (analisis buta)
- Aset: A5
- Vektor: penyerang membuat akun baru, atau account baru dipakai
- Prasyarat: tidak ada
- Dampak: tidak ada deteksi sama sekali untuk aktor dengan kurang dari 20 event
- Kontrol yang sudah ada: `MIN_EVENTS_FOR_BASELINE = 20` dengan komentar eksplisit mencegah false positive (`src/features/ueba/lib/baseline.ts:17`); `detect()` mengembalikan array kosong bila baseline `null`
- Kontrol yang belum ada: tidak ada fallback rule yang berlaku tanpa baseline, misalnya `failed_login_burst` sebenarnya tidak butuh baseline tetapi hanya dievaluasi lewat `recordAnomaliesForActor` yang tetap butuh event
- Catatan: `detectFailedLoginBurst` tidak memakai baseline, jadi secara teori bisa jalan tanpa baseline, tetapi ia hanya dipanggil dari `detect()` yang dipanggil `recordAnomaliesForActor`, dan fungsi itu sudah mengembalikan `[]` bila event tidak ada
- Mitigasi: pisahkan detector yang butuh baseline dan yang tidak; jalankan detector non-baseline setiap kali login gagal
- Likelihood: 4
- Status: partial

### THREAT-014 — Response poisoning lewat header proxy
- Kategori: Spoofing / Information Disclosure
- Aset: A5
- Vektor: kirim `X-Forwarded-For` berisi banyak IP langsung ke origin; `getRequestContext()` mengambil entri pertama dan meng-hash-nya (`src/lib/request-context.ts:26`)
- Prasyarat: akses langsung ke origin tanpa melalui nginx (nginx memang menimpa header, tapi tidak ada upstream yang mengunci)
- Dampak: anomali UEBA false negative karena hash IP berbeda tiap permintaan, atau log poisoning
- Kontrol yang sudah ada: `nginx/nginx.conf:34` memakai `$proxy_add_x_forwarded_for`; `hashIp` meng-hash dengan salt; `truncateUserAgent` memotong 120 karakter
- Kontrol yang belum ada: tidak ada allowlist origin; tidak ada validasi format IP sebelum di-hash; tidak ada kebijakan tepercaya `X-Forwarded-Proto`
- Mitigasi: batasi akses origin ke jaringan internal saja (sudah sebagian: `expose` dan network `backend` internal); validasi IP dengan `net.isIP`; tetapkan hanya satu proxy tepercaya
- Likelihood: 2
- Status: partial

### THREAT-015 — PII lolos ke log dan ke halaman dashboard
- Kategori: Information Disclosure
- Aset: A5, A4
- Vektor: `logger.info("contact.message.received", { subject })` menulis teks user apa adanya (`src/features/contact/actions.ts:70`); `MOCK_USERS` berisi nama dan email ditampilkan di `/users`; `redactTags` hanya bekerja pada key yang dikenali polanya
- Prasyarat: pengguna mengirim teks bebas pada form kontak
- Dampak: data pribadi masuk log terpusat tanpa redactor
- Kontrol yang sudah ada: `redactTags()` membuang key yang cocok `password|secret|token|authorization|cookie|apikey|ssn|credit|card|cvv|otp|code`; memask email; meng-hash IP; memotong user agent 120 karakter; memotong nilai 200 karakter; `getSafeRequestContext()` untuk hot path
- Kontrol yang belum ada: redactor tidak dipanggil di wrapper `logger`; `auditEventInputSchema` menerima `userAgent` dan `host` sebagai string tanpa redaksi; `email` pada `auditActorSchema` hanya di-mask bila pemanggil melakukan (`redactTags` tidak dipanggil pada `actor` di `logAudit`, hanya pada `metadata`); `NEXT_PUBLIC_APP_URL` sebagai salt bukan secret
- Mitigasi: satukan logging lewat wrapper yang selalu meredaksi; audit `actor` wajib melewati `redactTags`; tetapkan kebijakan retensi; ganti data mock menjadi sintetis
- Likelihood: 4
- Status: partial

### THREAT-016 — Teks user dirender tanpa escaping pada halaman publik
- Kategori: Information Disclosure
- Aset: A7
- Vektor: form kontak yang menampilkan kembali isian user
- Prasyarat: ada halaman yang merender isian form
- Dampak: XSS stored pada origin yang sama
- Kontrol yang sudah ada: React meng-escape teks secara default; `dangerouslySetInnerHTML` hanya ada dua kali dan keduanya sumbernya internal (`src/app/layout.tsx:39`, `src/components/ui/chart.tsx:94`); CSP ada dengan `object-src 'none'`, `base-uri 'self'`, `frame-ancestors 'none'`
- Kontrol yang belum ada: `script-src` masih `'unsafe-inline'`, jadi CSP tidak menambah pertahanan terhadap XSS inline; `style-src` juga `'unsafe-inline'`; tidak ada Trusted Types
- Mitigasi: di luar static generation, pindah ke CSP berbasis nonce; konsekuensinya harus dicatat sebagai risk accept di `docs/SECURITY.md`. Jangan menyatakan CSP sebagai kontrol XSS selama `'unsafe-inline'` masih ada di `script-src`
- Likelihood: 2
- Status: partial

### THREAT-017 — Supply chain dependency
- Kategori: Tampering / Elevation of Privilege
- Aset: A8, A9
- Vektor: paket merusak atau vulnerability pada dependency
- Prasyarat: compromised package
- Dampak: akses ke build pipeline, base image, atau runtime
- Kontrol yang sudah ada: `package-lock.json` di-commit; CI memakai `npm ci` bukan `npm install`; Dependabot; `npm audit --audit-level=high`; CodeQL `security-extended`; SBOM CycloneDX; `dependency-review` dengan `fail-on-severity: moderate`; `gitleaks --redact`; `permissions: contents: read` di semua job
- Kontrol yang belum ada: tidak ada `npm ci --ignore-scripts`; `npx --yes @cyclonedx/cyclonedx-npm@latest` menarik versi terbaru saat run; `next` dan `eslint-config-next` di-pin eksak (`16.3.6`) tetapi `next` sebagai dependency runtime tidak di-pin ke digest image; `node:24-slim` tidak dipin digest; tidak ada signature verification. Dependabot sudah mencakup `npm`, `github-actions`, dan `docker` (`.github/dependabot.yml`), tetapi `update-types` dibatasi ke minor dan patch, sehingga perbaikan yang butuh major tidak akan pernah disarankan
- Mitigasi: `--ignore-scripts` di CI; pin versi tool SBOM; pin digest base image; izinkan update major pada dependabot; tambahkan kebijakan provenance build
- Likelihood: 3
- Status: partial

### THREAT-018 — Container dan reverse proxy
- Kategori: Elevation of Privilege / Denial of Service
- Aset: A9
- Vektor: privilege escalation di container, atau salah konfigurasi proxy
- Prasyarat: vulnerability di runtime atau kesalahan konfigurasi
- Dampak: akses ke proses aplikasi
- Kontrol yang sudah ada: user non-root `1001:1001`; `read_only: true`; `tmpfs` dengan `noexec,nosuid,nodev`; `no-new-privileges`; `cap_drop: ALL`; batas `pids`, `cpus`, `memory`; healthcheck; `stop_grace_period`; network `backend` `internal: true`; `access_log off` untuk static; `client_max_body_size 20M`
- Kontrol yang belum ada: tidak ada TLS di dalam compose (nginx listen 9080 HTTP polos, jadi HSTS baru berarti bila ada TLS di luar compose); tidak ada `limit_req` di nginx; tidak ada access log untuk `/`; `X-Forwarded-Proto` dipercaya tanpa validasi; `node:24-slim` tidak dipin digest; tidak ada WAF
- Mitigasi: letakkan TLS termination di depan; tambahkan `limit_req` di nginx; terapkan access log terstruktur; validasi `X-Forwarded-Proto`
- Likelihood: 3
- Status: partial

### THREAT-019 — CSP dan header keamanan
- Kategori: Information Disclosure / Tampering
- Aset: A7, A8
- Vektor: penyalahgunaan `postMessage`, Referer, atau resource lintas origin
- Prasyarat: tidak ada
- Dampak: meningkatnya surface serang
- Kontrol yang sudah ada: `poweredByHeader: false`; `productionBrowserSourceMaps: false`; `X-Frame-Options: DENY`; `X-Content-Type-Options: nosniff`; `Referrer-Policy: strict-origin-when-cross-origin`; `X-Permitted-Cross-Domain-Policies: none`; `Permissions-Policy` menutup camera, microphone, geolocation; COOP dan CORP `same-origin`; HSTS dua tahun preload; CSP dengan `default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`, `upgrade-insecure-requests` di luar development
- Kontrol yang belum ada: tidak ada nonce; `'unsafe-inline'` pada `script-src` dan `style-src`; `'unsafe-eval'` ditambahkan di development (`next.config.ts:20`) yang memang wajar untuk React dev; tidak ada `report-uri` atau `report-to`; tidak ada allowlist `connect-src` untuk origin integrasi nanti; tidak ada pemisahan policy header antara route publik dan privat
- Catatan: `docs/ARCHITECTURE.md` bagian 16 masih menyatakan CSP belum aktif. Klaim itu sudah usang; `next.config.ts` sudah memuat CSP. Status ini harus diperbarui di dokumen arsitektur pada commit terpisah
- Mitigasi: pindahkan ke CSP berbasis nonce saat static generation tidak lagi jadi prioritas; tambahkan `report-to`; pisahkan policy untuk route dashboard
- Likelihood: 2
- Status: partial

### THREAT-020 — Cookie dan session tidak ada sehingga tidak bisa dicabut
- Kategori: Repudiation / Spoofing
- Aset: A1, A3
- Dampak: setelah login berhasil, tidak ada bukti kepemilikan sesi yang dapat diverifikasi server; tidak ada logout; tidak ada invalidasi
- Kontrol yang sudah ada: `requireSession()` tersedia sebagai titik integrasi (`src/lib/rbac.ts:14`) sehingga menambah session cukup di satu file
- Kontrol yang belum ada: tidak ada provider session; tidak ada cookie session; tidak ada daftar pencabutan; `docs/INTEGRATION.md` bagian 5 sudah memberi contoh penggantian, tetapi belum dieksekusi
- Mitigasi: implementasikan session sesuai bagian 5 `docs/INTEGRATION.md`; gunakan `httpOnly`, `secure`, `sameSite=lax`, `__Host-` prefix; sediakan invalidasi pada logout dan reset password
- Likelihood: 5
- Status: todo

### THREAT-021 — Data user bocor lewat halaman tanpa guard
- Kategori: Information Disclosure
- Aset: A6
- Vektor: buka `/users` langsung; data 12 user dengan nama, email, role, status ditampilkan
- Prasyarat: tidak ada
- Dampak: data(user) realistis terekspos tanpa autentikasi
- Kontrol yang sudah ada: `noindex`; `Disallow` di robots; validasi query di `src/features/user/schema.ts`
- Kontrol yang belum ada: tidak ada guard; tidak ada pagination server-side yang membatasi (ada, tapi tanpa auth); data di `MOCK_USERS` realistis
- Mitigasi: lihat THREAT-001; ganti `MOCK_USERS` dengan data sintetis
- Likelihood: 5
- Status: todo

### THREAT-022 — Secret bocor lewat `NEXT_PUBLIC_`
- Kategori: Information Disclosure
- Aset: A1, A2
- Vektor: menaruh secret pada variabel `NEXT_PUBLIC_`
- Prasyarat: kesalahan developer
- Dampak: secret masuk bundle browser
- Kontrol yang sudah ada: `src/lib/env.ts` memvalidasi environment saat start dan melempar pada nilai tidak valid; hanya ada satu variabel publik saat ini; `.env.example` memuat komentar eksplisit bahwa `NEXT_PUBLIC_*` adalah publik
- Kontrol yang belum ada: tidak ada guard otomatis yang menolak nama variabel sensitif berawalan `NEXT_PUBLIC_`; `NEXT_PUBLIC_APP_URL` justru dipakai sebagai salt `hashIp`, jadi, mengubah nilai itu mengubah seluruh pseudonym IP
- Mitigasi: tambahkan validasi di `env.ts` yang menolak nama sensitif pada `NEXT_PUBLIC_`; gunakan secret server yang benar untuk salt pseudonym
- Likelihood: 2
- Status: partial

### THREAT-023 — Denial of service lewat rate limit in-memory
- Kategori: Denial of Service
- Aset: A9
- Vektor: banyak request yang menghasilkan `enforceRateLimit`; interval cleanup 60 detik menyisir seluruh map
- Prasyarat: tidak ada
- Dampak: pertumbuhan map, latensi, atau memory
- Kontrol yang sudah ada: `cleanupInterval.unref()` (`src/lib/rate-limit.ts:37`) sehingga tidak menahan proses; window 60 detik; `removeExpiredEntries` menghapus bucket kosong
- Kontrol yang belum ada: tidak ada batas ukuran map selainExpiry; `logger.error` menulis objek error penuh yang bisa besar; tidak ada timeout pada `withMetric`; tidak ada circuit breaker; healthcheck memakai `GET /` yang merender landing page penuh
- Mitigasi: tambahkan batas maksimum entri; pindahkan ke store eksternal; tambahkan `limit_req` di nginx; gunakan endpoint health yang ringan
- Likelihood: 2
- Status: partial

### THREAT-024 — Error boundary membocorkan informasi
- Kategori: Information Disclosure
- Aset: A8
- Vektor: pemicu error agar `error.digest` tampil
- Prasyarat: tidak ada
- Dampak: korelasi internal, bukan secret
- Kontrol yang sudah ada: `error.tsx` hanya menampilkan `error.digest`, bukan `error.message` atau stack; `AppError` memetakan ke pesan generik per kode (`src/lib/error.ts:30`); `internalFailure()` mengembalikan `INTERNAL_ERROR` generik; `forgotPasswordAction` mengembalikan sukses bahkan saat error tak terduga (`src/features/auth/actions.ts:283`) untuk mencegah enumerasi
- Kontrol yang belum ada: `getRolesAction` mengembalikan `traceId` ke client (`src/features/roles/actions.ts:82`) — ini ID korelasi, bukan secret, tetapi perlu dipastikan tidak dapat dipakai menebak; `UserActionResult` juga mengembalikan `traceId`; tidak ada rate limit pada `getRolesAction` selain per-aktor
- Mitigasi: pertahankan pola `digest`; pastikan `traceId` benar-benar acak per request dan tidak memuat data
- Likelihood: 2
- Status: partial

### THREAT-025 — Registrasi akun dan verifikasi email belum ada
- Kategori: Spoofing
- Aset: A1
- Vektor: account enumeration lewat perbedaan perilaku `/register`
- Prasyarat: tidak ada
- Dampak: tidak ada jalur pendaftaran yang berfungsi; `/verify-email` dan `/invite/[token]` hanya halaman
- Kontrol yang sudah ada: `registerFormSchema` punya aturan kompleksitas password dan validasi `acceptTerms`; `registerUser` melempar `NOT_IMPLEMENTED` (`src/features/auth/service.ts:161`); rate limit per email dan global ada; `getEmailHint` memotong 254 karakter
- Kontrol yang belum ada: tidak ada penyimpanan; tidak ada verifikasi email; `registerUser` melempar `Error` biasa, bukan `AppError`, sehingga `registerAction` mengembalikan `INTERNAL_ERROR` alih-alih `VALIDATION_ERROR`
- Mitigasi: implementasi penuh beserta verifikasi email dan respons yang seragam
- Likelihood: 3
- Status: todo

## 4. Matriks risiko

Skor = dampak (1-5) x likelihood (1-5). Prioritas: P1 (skor >= 20), P2 (12-19), P3 (6-11), P4 (<= 5).

| ID | Ancaman | Dampak | Likelihood | Skor | Prioritas | Status kontrol |
| --- | --- | --- | --- | --- | --- | --- |
| THREAT-001 | Dashboard tanpa autentikasi | 5 | 5 | 25 | P1 | todo |
| THREAT-004 | Kredensial plaintext di source | 5 | 5 | 25 | P1 | todo |
| THREAT-011 | Hash chain audit tidak memblokir modifikasi | 4 | 5 | 20 | P1 | todo |
| THREAT-020 | Tidak ada session yang bisa dicabut | 5 | 5 | 25 | P1 | todo |
| THREAT-021 | Data user bocor tanpa guard | 4 | 5 | 20 | P1 | todo |
| THREAT-009 | Reset password tidak mengubah apa pun | 4 | 5 | 20 | P1 | todo |
| THREAT-012 | Anomali role change tidak bisa dipakai sebagai bukti | 3 | 5 | 15 | P2 | todo |
| THREAT-002 | Otorisasi hanya di sebagian boundary | 5 | 4 | 20 | P1 | partial |
| THREAT-003 | IDOR pada halaman detail | 4 | 4 | 16 | P2 | todo |
| THREAT-005 | Rate limit dapat dilewati rotasi identitas | 4 | 4 | 16 | P2 | partial |
| THREAT-015 | PII lolos ke log | 4 | 4 | 16 | P2 | partial |
| THREAT-013 | Baseline UEBA tidak ada untuk akun baru | 3 | 4 | 12 | P2 | partial |
| THREAT-017 | Supply chain | 5 | 3 | 15 | P2 | partial |
| THREAT-018 | Container dan proxy | 4 | 3 | 12 | P2 | partial |
| THREAT-019 | CSP dan header | 3 | 2 | 6 | P3 | partial |
| THREAT-007 | Bypass MFA lewat kode demo | 4 | 3 | 12 | P2 | partial |
| THREAT-010 | Token reset bocor lewat log | 3 | 3 | 9 | P3 | partial |
| THREAT-014 | Response poisoning lewat header proxy | 3 | 2 | 6 | P3 | partial |
| THREAT-016 | XSS pada halaman publik | 4 | 2 | 8 | P3 | partial |
| THREAT-006 | Cookie MFA di jaringan terbuka | 4 | 2 | 8 | P3 | partial |
| THREAT-008 | Backup code dapat dipakai ulang | 3 | 2 | 6 | P3 | partial |
| THREAT-022 | Secret bocor lewat `NEXT_PUBLIC_` | 4 | 2 | 8 | P3 | partial |
| THREAT-023 | DoS lewat rate limit in-memory | 3 | 2 | 6 | P3 | partial |
| THREAT-024 | Error boundary membocorkan informasi | 2 | 2 | 4 | P4 | partial |
| THREAT-025 | Registrasi belum ada | 3 | 3 | 9 | P3 | todo |

## 5. Out of scope

Segera berikut secara sadar tidak dithreat-model di sini:

- **Ancaman pada runtime Node.js dan OpenSSL.** Ditangani lewat image mutasi dan patch OS, di luar cakupan repo ini.
- **Ancaman pada provider cloud, registry, dan CDN.** Dikendalikan di luar repo; cukup dicatat bahwa compose hanya bind ke `ports` dan `expose`, sehingga exposure sebenarnya bergantung pada orkestrator.
- **Fisik dan sosial engineering** terhadap personnel. Dicakup oleh prosedur akses, bukan kode.
- **Kriptografi kustom.** `src/lib/totp.ts` mengimplementasikan TOTP RFC 6238 sendiri. Ini keputusan sadar untuk menghindari dependency, tetapi implementasi kripto custom adalah beban audit. Pertimbangkan evaluasi terhadap library yang sudah diaudit ketika backend siap.
- **Multi-tenancy.** Tidak ada konsep tenant di repo ini.
- **Keamanan data bisnis di dashboard** (revenue, traffic). Datanya dummy dari `src/config/dashboard.ts`.
- **Ketersediaan dan skala** di luar apa yang tertulis di `docs/PERFORMANCE.md`.

## 6. Kontrol lintas threat

Kontrol berikut berlaku untuk banyak threat sekaligus dan layak dijadikan work item tersendiri:

1. **Guard di route.** Satu `proxy.ts` dengan allowlist route publik; `requireSession` default-deny. Menutup THREAT-001, 003, 021.
2. **Wiring `logAudit()`.** Tanpa ini, A4 tidak bernilai dan respons insiden kehilangan sumber bukti utama. Menutup THREAT-011.
3. **Redactor di wrapper `logger`.** Menutup THREAT-015, 010, dan sebagian 024.
4. **Session provider.** Menutup THREAT-020, 006, dan memungkinkan invalidasi yang disebut di `docs/INCIDENT-RESPONSE.md`.
5. **Persistence.** Audit, metrik, UEBA, MFA, dan user. Tanpa ini semua kontrol berbasis state hilang saat restart.
6. **Test runner.** `package.json` hanya punya `dev`, `build`, `start`, `lint`. Tidak ada cara menguji regresi keamanan secara otomatis.

## 7. Template threat model untuk fitur baru

Salin dan isi sebelum feature branch membuka PR. Kalau sebuah baris tidak bisa dijawab, tulis "belum ada" beserta alasannya; jangan biarkan kosong.

```markdown
## Threat model: <nama fitur>

Tanggal: <YYYY-MM-DD>  Penulis: <peran>  Reviewer: [TODO]

### 1. Aset baru
| ID | Aset | Lokasi | Sensitivitas | Siapa yang boleh membaca |
| --- | --- | --- | --- | --- |
| | | | | |

### 2. Trust boundary baru
| ID | Boundary | Apa yang melintasi | Kontrol | Cara verifikasi |
| --- | --- | --- | --- | --- |
| | | | | |

### 3. Threat
| ID | STRIDE | Vektor | Prasyarat | Dampak | Likelihood | Kontrol sudah ada (path) | Kontrol belum ada | Mitigasi | Status | Owner | Tenggat |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| THREAT-XXX | | | | | | | | | todo | | |

### 4. Asumsi yang dibuat
- <asumsi yang belum terbukti benar>

### 5. Yang sengaja dikorbankan (risk accept)
| Risiko | Alasan | Pengguna yang terdampak | Tenggat review | Disetujui oleh |
| --- | --- | --- | --- | --- |
| | | | | |

### 6. Verifikasi
- [ ] Setiap baris "kontrol sudah ada" citing file yang ada dan dibaca
- [ ] Setiap Server Action punya auth check di server
- [ ] Setiap input divalidasi di server dengan Zod
- [ ] Tidak ada PII atau secret yang masuk log atau metrik
- [ ] `npm run lint` dan `npm run build` lulus
- [ ] Item di `docs/SECURITY-CHECKLIST.md` diperbarui
```

Checklist wajib untuk AI agent yang mengerjakan fitur: baca tabel di bagian 7, isi dengan path file nyata, dan **jangan** menandai status `ada` untuk kontrol yang hanya ada di dokumen. Klaim tanpa referensi file dianggap salah.
