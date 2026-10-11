# Incident Response

> Status: draft. Owner: [TODO]. Review cycle: tiap sprint.

Dokumen ini adalah prosedur kerja saat insiden keamanan terjadi. Statusnya masih draft: nilai yang hanya bisa diisi manusia (nama orang, nomor kontak, kanal notifikasi, SLA, nama host) sengaja dibiarkan sebagai `[TODO]` dan tidak dikarang.

Dokumen ini **tidak** menduplikasi `docs/SECURITY.md` (persyaratan) maupun `docs/THREAT-MODEL.md` (ancaman dan kontrol). Tracker status kontrol ada di `docs/SECURITY-CHECKLIST.md`.

## 1. Ruang lingkup dan definisi

### 1.1 Apa yang disebut insiden keamanan

Peristiwa yang menyebabkan, atau berisiko menyebabkan, compromise terhadap kerahasiaan, integritas, atau ketersediaan sistem. Untuk template ini, insiden yang masuk cakupan:

- akses tidak sah ke route dashboard, data user, atau data role;
- kebocoran kredensial, secret TOTP, backup code, atau token reset password;
- eskalasi privilege (role `viewer`/`editor` menjadi `admin`) tanpa jejak audit;
- eksekusi skrip di luar origin (XSS) pada halaman publik maupun dashboard;
- penyalahgunaan rate limit dan brute force pada `/login`, `/login/mfa`, `/forgot-password`;
- manipulasi data yang terlihat di halaman audit, metrik, atau UEBA;
- kebocoran PII melalui log, metrik, halaman UEBA, atau halaman audit;
- kerentanan dependency dengan eksploitasi yang diketahui;
- kegagalan infrastruktur (container, reverse proxy, resource habis).

### 1.2 Yang bukan insiden (tetapi tetap dicatat)

- permintaan reset password oleh pemilik akun yang lupa password biasa;
- bug fungsional tanpa implikasi keamanan;
- positif palsu deteksi UEBA (`new_ip` karena pindah jaringan seluler);
- laporan scanner otomatis yang tidak pernah menyentuh aplikasi.

### 1.3 Asumsi penting tentang kondisi repo saat dokumen ini ditulis

Prosedur di bawah harus dibaca sebagai kerangka kerja untuk kondisi produksi, bukan sebagai sesuatu yang langsung bisa dipakai pada template sekarang. Kondisi faktual per pembacaan kode:

- Autentikasi masih mock. `requireSession()` (`src/lib/rbac.ts:73`) membaca cookie `mock_session` melalui `src/features/auth/session.ts`: token hanya dicocokkan ke `Map` di memori proses, tidak ada verifikasi signature atau kunci server, dan isinya hilang saat restart. Sesi placeholder `{ id: "usr_placeholder", role: "admin" }` hanya bisa keluar dari `requireSessionForDev()` dan hanya saat `DEV_AUTH_BYPASS=1` **dan** `NODE_ENV` bukan production, jadi jalur produksi gagal tertutup dengan `AppError("UNAUTHENTICATED")` — bukan dengan sesi admin gratis.
- Ada dua cookie, bukan satu: `mock_session` (`src/features/auth/session.ts`, `httpOnly`, `sameSite: "lax"`, `path: "/"`, `secure` hanya di production, `maxAge` 8 jam atau 30 hari untuk remember-me) dan `mfa_pending` (`src/features/auth/mfa-session.ts`, `httpOnly`, `sameSite: "lax"`, `secure` hanya di production, `path` terbatas ke `/login/mfa`). Keduanya tetap token in-memory tanpa daftar pencabutan.
- Tidak ada Route Handler dan tidak ada database. Semua state adalah `Map` in-memory yang hilang saat restart.
- **Audit log tidak pernah ditulis.** `logAudit()` (`src/features/audit/lib/log-audit.ts:22`) tidak dipanggil dari mana pun di `src/`. Store audit, hash chain, dan `verifyAuditIntegrity()` (`src/features/audit/service.ts:67`) ada, tetapi tidak tersambung ke alur bisnis dan tidak ada halaman yang menampilkannya. Konsekuensi: pada kondisi saat ini, "evidence audit" insiden tidak ada. Sumber bukti yang benar-benar ada hanya log pino (`src/lib/logger.ts`) dan event store observability.
- Rate limit in-memory (`src/lib/rate-limit.ts`) hilang efektifnya setiap restart dan tidak berlaku lintas instance.
- Tidak ada alerting. Deteksi UEBA hanya dievaluasi di dalam proses (`src/features/observability/lib/track.ts:66` lalu `recordAnomaliesForActor`) dan hanya terlihat lewat halaman `/settings/ueba`.

Konsekuensi praktis: sebelum insiden pertama, minimal tiga hal harus dikerjakan (wiring `logAudit()` ke semua boundary sensitif, persistence audit, dan alerting). Selama tiga hal itu belum ada, playbook di bagian 5 harus dijalankan dengan pengakuan bahwa investigasi bergantung pada log stdout container.

## 2. Severity ladder

Severity ditentukan oleh kombinasi dampak dan cakupan, bukan emphatically. Skor = dampak (1-4) x cakupan (1-3), dipetakan ke P1-P4. Jika ragu, pilih satu level lebih tinggi.

| Kode | Dampak | Contoh kontekstual | Target respons | Target pemulihan | Eskalasi |
| --- | --- | --- | --- | --- | --- |
| P1 | 4 | Kredensial bocor; secret TOTP atau backup code diekstrak; aktivitas admin aktif tidak dapat diidentifikasi; data pribadi bocor ke pihak ketiga | 15 menit | 24 jam | Seluruh on-call, owner produk, legal |
| P2 | 3 | Eskalasi role berhasil tanpa jejak audit; XSS stored yang terjangkau dari halaman publik; token sesi dicuri; dependency CVE critical dengan exploit publik | 1 jam | 3 hari | On-call dan owner produk |
| P3 | 2 | Credential stuffing kecil yang tertahan rate limit; lonjakan login gagal dari satu sumber; anomali UEBA `privilege_change` tanpa konfirmasi user; hash chain audit tidak valid | 4 jam | 7 hari | On-call |
| P4 | 1 | XSS reflected yang butuh interaksi user; clickjacking; header keamanan hilang di satu route; log noise; versi aplikasi bocor; `unusual_hour` tanpa pola login gagal | 1 hari (next sprint) | Backlog | Tercatat di issue |

Aturan tambahan:

- Naik ke level atas bila melibatkan data pribadi yang wajib dilindungi menurut UU No. 27/2022 tentang Perlindungan Data Pribadi, atau ada indikasi akses tidak sah ke akun yang menyimpan data tersebut.
- P3 tidak pernah ditutup tanpa satu entri audit atau satu catatan tertulis yang menjelaskan kenapa ini bukan insiden.
- Penurunan severity hanya boleh dilakukan oleh [TODO: peran yang berhak], dan alasannya wajib ditulis di post-mortem.

## 3. Peran dan RACI

| Aktivitas | Security analyst | Developer on-call | Owner produk | Legal/compliance | Infra/ops |
| --- | --- | --- | --- | --- | --- |
| Deklarasi insiden dan penetapan severity | A/R | C | I | I | I |
| Klasifikasi awal 0-15 menit | R | A | I | - | C |
| Containment teknis (cabut token, matikan fitur, patch) | C | A/R | I | - | R |
| Rotasi kredensial dan secret | C | A/R | I | - | R |
| Komunikasi ke pengguna | C | I | A/R | C | - |
| Notifikasi regulator | I | I | C | A/R | - |
| Pemulihan dan validasi | C | A/R | C | - | R |
| Post-mortem | R | C | A | C | C |
| Tindakan korektif dan tenggat | C | A/R | A (prioritas) | C | R |

Peran yang harus diisi manusia sebelum dokumen ini dipakai:

- Incident Commander: [TODO]
- On-call developer: [TODO: kanal dan jadwal]
- Security analyst on-call: [TODO]
- Owner produk sebagai penanggung jawab komunikasi: [TODO]
- Kontak legal/compliance: [TODO]
- Kontak infra/ops: [TODO]
- Kontak hosting, registry, dan CA: [TODO]

Catatan arsitektur untuk IC: dashboard `(dashboard)` sudah dijaga `requirePageSession()` dan mengarahkan pengunjung tanpa sesi ke `/login`, tetapi izin dashboard tetap mengikuti sesi apa adanya — role di sesi belum dipakai sebagai gate per halaman. Semua data operasional ada di satu proses, jadi bukti awal hampir selalu berupa log container, bukan query database. Jangan mencari halaman log yang belum ada.

## 4. Prosedur respons awal

### 4.1 Menit 0-15

1. Konfirmasi gejala, bukan asumsi. Sumber yang tersedia saat ini: output container (`docker compose logs`), `error.digest` yang tampil di `src/app/error.tsx:21` dan `src/app/(dashboard)/error.tsx:24`, halaman `/settings/observability` (login sukses/gagal, rate limit hit), dan `/settings/ueba` (skor risiko, daftar anomali).
2. Tetapkan severity memakai bagian 2. Tulis di kanal insiden [TODO] dengan format `INC-<tahun>-<urutan>` dan satu kalimat: apa yang terjadi, sejak kapan, siapa yang terpengaruh.
3. Tunjuk IC. Jika IC tidak ada dalam 15 menit, severity otomatis dinaikkan satu level.
4. Bekukan hal yang jelas tidak boleh berubah: matikan deploy, dan jangan rotasi secret sebelum token lama dicabut (urutan salah justru menghancurkan bukti serta mengunci user keluar tanpa mekanisme pemulihan).
5. Catat waktu deteksi, waktu konfirmasi, dan sumber deteksi. Karena tidak ada alert, deteksi saat ini hampir selalu manual.

### 4.2 Menit 15-60

1. Kumpulkan bukti minimum: screenshot halaman yang bermasalah, potongan log terfilter pada `requestId` atau `actorId`, dan `docker compose ps` bila container bermasalah. Gunakan checklist di Lampiran B.
2. Tentukan apakah insiden lintas akun, lintas tenant, atau hanya satu akun. Lintas tenant selalu P1.
3. Cek hash chain audit bila datanya ada: jalankan `verifyAuditIntegrity()` (`src/features/audit/service.ts:67`). Catatan penting: fungsi ini hanya memeriksa entry yang masih ada di store (maks 5000, `src/features/audit/lib/store.ts:15`). Ketika entry terlama sudah ter-drop, `verifyChain` hanya memvalidasi rantai dari entry pertama yang tersisa. Nilai `droppedEntries` yang lebih besar dari nol membatalkan kesimpulan "log utuh" dan harus dikonfirmasi manusia sebelum dipakai sebagai bukti.
4. Cek metrik UEBA untuk aktor yang sama: `/settings/ueba/[actorId]`, jendela 72 jam, skor risiko dan daftar anomali. Perhatikan bahwa baseline butuh minimal 20 event per aktor (`src/features/ueba/lib/baseline.ts:17`), sehingga akun baru tidak menghasilkan deteksi sama sekali.
5. Tentukan containment yang akan dijalankan dan siapa yang menyetujui.

### 4.3 Jam 1-24

1. Terapkan patch atau mitigasi (bagian 5, sesuai tipe insiden).
2. Validasi: ulang skenario serangan, pastikan gagal dengan cara yang benar (bukan 500, crash, atau 404 karena routing).
3. Jalankan `npm run lint` dan `npm run build` bila ada perubahan kode.
4. Tentukan cakupan data yang terekspos dan daftar akun yang harus diberi tahu.
5. Komunikasikan (bagian 9).
6. Buka post-mortem (template di Lampiran C).

## 5. Playbook per tipe insiden

Semua playbook mengikuti urutan: contain, investigate, remediate. Karena tidak ada feature flag di repo, containment saat ini harus dilakukan lewat perubahan kode dan deploy ulang.

### 5.1 Credential stuffing dan brute force

| Langkah | Tindakan | Realisasi pada repo ini |
| --- | --- | --- |
| Deteksi | Lonjakan `auth.login.failure` dan `security.rate_limit` di `/settings/observability`; anomali `failed_login_burst` di UEBA (ambang 5 kegagalan dalam 15 menit, `src/features/ueba/lib/anomaly.ts:23`) | Metrik ada, alert tidak ada |
| Contain | Perketat `AUTH_RATE_LIMIT` di `src/features/auth/actions.ts:27` (5 percobaan/15 menit) dan blokir sumber di `nginx/nginx.conf` atau di lapisan CDN; sebelumnya konstanta `MFA_RATE_LIMIT` ikut turun di file yang sama, sekarang limiter hanya dipakai oleh `loginAction` | Default 5 percobaan per 15 menit |
| Investigasi | Akun mana yang diserang. Log `auth.login.rejected` sengaja tanpa email (`src/features/auth/service.ts:134`), jadi sumber informasi tambahan tidak tersedia | Terbatas |
| Eradicate | Rate limit per IP **dan** per email, plus lockout akun | Sudah per email dan per IP-hash (`src/features/auth/actions.ts:134-138`); lockout akun belum |
| Notifikasi | Email ke owner akun yang terdeteksi | [TODO: kanal notifikasi] |

Perhatikan: `loginAction` memakai **dua** bucket sekaligus (`src/features/auth/actions.ts:134-138`) — satu per email, satu per IP-hash hasil `getSafeRequestContext()`. Bucket per-IP sengaja dilewati bila `ipHash` null (dev atau proxy tanpa `x-forwarded-for`/`x-real-ip`), dan limiter yang tersisa hanya itu: MFA dan action lain tidak lagi memanggil `enforceRateLimit`. Karena itu penyerang yang merotasi email tetap terbendung selama IP-nya masuk bucket, tetapi setiap jalur selain login (verifikasi MFA, reset password, aksi admin) sama sekali tidak dibatasi. Store limiter juga in-memory, jadi restart me-reset seluruh kuota.

### 5.2 XSS stored dan reflected

| Langkah | Tindakan |
| --- | --- |
| Contain | Tutup endpoint atau fitur yang menulis payload; blokir akses ke sumber data bila perlu |
| Investigasi | Dua `dangerouslySetInnerHTML` yang ada di repo keduanya internal, bukan input user: `src/app/layout.tsx:39` (initializer tema, nilainya `JSON.stringify(ALLOWED_THEME_VARS)` yang konstan) dan `src/components/ui/chart.tsx:94` (warna dari `src/lib/color.ts`). Keduanya wajib direview ulang setiap kali sumber warna dinamis ditambahkan |
| Eradicate | Output encoding di server; sanitasi ketat bila `dangerouslySetInnerHTML` tidak dapat dihindari |
| Rekonsiliasi | `next.config.ts` tidak lagi mengirim header keamanan apa pun — CSP, `X-Frame-Options`, `Referrer-Policy`, dan `Permissions-Policy` semuanya tidak ada, jadi XSS inline justru tidak tertahan apa pun. Catatan lama soal `'unsafe-inline'` demi static generation sudah tidak berlaku: `output: "export"` sudah dibuang, jadi pola nonce di `proxy.ts` kini tidak lagi terhalang static export — hanya memang belum ada |
| Deteksi dini | Belum ada. Event `security.xss_*` tidak ada di `src/features/observability/lib/constants.ts` |

### 5.3 IDOR

| Langkah | Tindakan |
| --- | --- |
| Contoh nyata di repo | `src/app/(dashboard)/users/[id]/page.tsx` menerima `id` dari route param dan merendernya tanpa ownership check. `getUserById()` (`src/features/user/service.ts:74`) tidak punya konsep kepemilikan. `/settings/ueba/[actorId]` juga meneruskan `actorId` ke query tanpa verifikasi hak akses |
| Contain | Nonaktifkan route terkait (hapus dari nav `src/config/site.ts`, ubah page menjadi 404) sampai ownership check ditambahkan |
| Eradicate | Verifikasi kepemilikan di layer service, bukan hanya di komponen; default deny |
| Rekonsiliasi | Persyaratan ini sudah tertulis di `docs/SECURITY.md` bagian Authorization, tetapi belum diterapkan di kode mana pun |

### 5.4 Privilege escalation

| Langkah | Tindakan |
| --- | --- |
| Deteksi | Anomali `privilege_change` di UEBA (score 0.8, dipicu `tags.roleChanged` dari `updateUserAction`, `src/features/user/actions.ts:74`); log `user.updated` |
| Contain | Pause `updateUserAction` sementara; instruksikan semua admin untuk logout; nonaktifkan role yang terpengaruh |
| Investigasi | `updateUserAction` selalu mengirim `tags: { roleChanged: "true" }` pada setiap update, bukan hanya saat role berubah. Akibatnya anomali `privilege_change` muncul pada setiap edit user dan tidak dapat dipakai sebagai bukti perubahan role. Ini gap logika yang harus diperbaiki |
| Eradicate | Pisahkan `changeRoleAction` dari `updateUserAction`; kirim event berbeda untuk perubahan role; audit setiap perubahan role |
| Catatan tambahan | `updateUser` tidak punya guard self-demotion, sehingga admin dapat menurunkan role-nya sendiri dan mengunci seluruh admin dari sistem |

### 5.5 Log dan audit tampering

| Langkah | Tindakan |
| --- | --- |
| Realisasi | Store audit adalah array in-memory di `globalThis` (`src/features/audit/lib/store.ts:28`). Siapa pun dengan akses ke proses dapat mengubah `entries` atau `head` tanpa terdeteksi. `resetAuditStore()` (`src/features/audit/lib/store.ts:153`) menghapus semua entry dan menyetel `head` ke `null`; saat ini fungsi itu tidak dipanggil dari mana pun, tetapi tetap terekspor |
| Deteksi | `verifyChain()` mengembalikan indeks pertama yang rusak. Jalankan secara berkala, bukan hanya saat insiden |
| Contain | Restart proses menghapus seluruh bukti (in-memory). Ekspor store sebelum restart bila datanya masih dibutuhkan |
| Eradicate | Pindahkan ke storage append-only (WORM) atau DB dengan trigger yang menolak UPDATE dan DELETE; pasangkan head hash dengan anchor eksternal di luar proses |
| Prioritas | Jangan dianggap "kontrol sudah ada" hanya karena `integrity.ts` ada di repo |

### 5.6 Data exposure lewat PII di log atau metrik

| Langkah | Tindakan |
| --- | --- |
| Kontrol yang sudah ada | `redactTags()` (`src/lib/redact.ts:83`) membuang key yang cocok pola sensitif, meng-hash IP dengan salt `NEXT_PUBLIC_APP_URL`, memask email, dan memotong user agent. `logAudit()` memaksa redaksi pada `metadata`. `getSafeRequestContext()` dipakai di hot path |
| Lubang yang sudah teridentifikasi | (a) `redactTags` hanya diterapkan pada `tags` metrik dan `metadata` audit, bukan pada argumen `logger.*`; `logger.info("contact.message.received", { subject })` di `src/features/contact/actions.ts:70` menulis teks bebas dari user apa adanya. (b) `auditEventInputSchema` menerima `userAgent` dan `host` sebagai string biasa, sehingga `logAudit` tidak memaksa redaksi pada dua field itu. (c) `redactTags` memotong nilai menjadi 200 karakter, sehingga string PII sepanjang itu tetap lolos. (d) `NEXT_PUBLIC_APP_URL` bersifat publik, jadi "salt" pada `hashIp()` bukan secret: ini pseudonymization, bukan anonymization, dan rainbow table tetap mungkin |
| Contain | Hentikan aplikasi yang relevan, rotasi kredensial yang mungkin sudah masuk log, pastikan retensi log tidak melebihi [TODO: kebijakan retensi] |
| Eradicate | Redactor dipanggil di dalam wrapper `logger`, bukan di call site; field `userAgent` dan `host` pada audit harus melewati pipeline yang sama dengan tags; larang log statement yang menulis teks mentah dari user |
| Retensi | Store metrik: 5000 event, hilang saat restart. Store audit: 5000 entry, dengan penghitung `droppedEntries`. Belum ada retensi yang ditegakkan karena belum ada storage |

### 5.7 Dependency CVE

| Langkah | Tindakan |
| --- | --- |
| Deteksi | Dependabot (`.github/dependabot.yml`) dan workflow `security.yml`: `npm audit --audit-level=high`, CodeQL `security-extended`, SBOM CycloneDX, dan `dependency-review` pada PR |
| Contain | Bila CVE punya exploit publik dan memengaruhi jalur auth atau render: releases sementara, atau turunkan exposure lewat reverse proxy bila memungkinkan |
| Investigasi | Cek apakah paket benar-benar terkena pada jalur runtime yang terpakai. `npm audit` melaporkan tingkat keparahan paket, bukan eksploitabilitas di kode kita |
| Eradicate | `npm ci` dengan lockfile yang ditinjau, `npm run lint` dan `npm run build`, lalu deploy ulang image dari `Dockerfile` (multi-stage; runner tidak membawa `node_modules` penuh) |
| Catatan | Image `nginx` di `docker-compose.yml:59` sudah dipin ke digest, tetapi image `nextjs` dibangun lokal dan `node:24-slim` tidak dipin digest. `npx --yes @cyclonedx/cyclonedx-npm@latest` di CI menarik versi tool terbaru saat run; itu supply-chain surface tersendiri yang perlu pinning |

## 6. Containment: apa yang bisa dimatikan

Karena tidak ada feature flag, contain saat ini harus lewat perubahan kode dan deploy ulang. Pilihan yang tersedia:

| Yang dimatikan | Cara | Dampak |
| --- | --- | --- |
| Halaman UEBA dan observability | Hapus dari nav (`src/config/site.ts`) atau ubah page menjadi `notFound()` | Kehilangan visibility saat insiden; gunakan hanya sementara |
| Seed data demo | Sudah otomatis nonaktif di production (`src/features/observability/actions.ts:20`) | Tidak ada tindakan |
| Registrasi MFA baru | Hapus opsi enrol TOTP dan email dari `MfaSecuritySettings` | User dengan MFA aktif tetap terlindungi; user baru tidak |
| MFA aktif per user | `disableMfa()` ada di `src/features/auth/service.ts:732` dan dipanggil dari `src/features/auth/components/mfa-security-settings.tsx` (self-service, butuh password user sendiri) | Tidak ada UI admin untuk menonaktifkan MFA user lain; knowing user id saja tidak cukup |
| Token reset password | Hapus isi `resetTokensByHash`; `purgeExpiredResetTokens()` sudah ada (`src/features/auth/service.ts:188`) | Semua tautan reset menjadi tidak valid |
| Langkah MFA pada login | Turunkan alur di `src/features/auth/components/mfa-login-form.tsx`, yang memanggil `beginMfaChallenge()`/`verifyMfaCode()` dari `src/features/auth/service.ts` | Penurunan keamanan yang serius bila MFA aktif; catat sebagai risk accept |
| Rate limit | Naikkan `maxAttempts` dan `windowMs` pada konstanta terkait | Hanya membantu, bukan contain yang utuh |
| Rate limit lintas instance | Belum ada; butuh Redis atau provider serupa | Containment rate limit tidak berlaku lintas instance |

Pencabutan token:

- Cookie `mfa_pending`: tidak ada daftar pencabutan. Yang dapat dilakukan adalah menyetel `MFA_COOKIE_MAX_AGE_SECONDS` (`src/features/auth/mfa-session.ts:15`) menjadi 0 sehingga cookie langsung invalid, dan menghapus challenge di `challengesByToken`. Karena `Map` in-memory hilang saat restart, restart container adalah satu-satunya "revoke-all" yang benar-benar berhasil saat ini, dengan harga seluruh bukti in-memory hilang.
- Session user (`mock_session`): `destroySession()` (`src/features/auth/session.ts:129`) menghapus token dari `Map` dan mengosongkan cookie, tapi hanya untuk sesi yang cookie-nya ikut pada request itu; tidak ada revoke per user dan tidak ada daftar pencabutan. Karena store-nya memori proses, satu-satunya "revoke semua token" yang benar-benar berhasil adalah restart container — dengan harga seluruh state in-memory lain (rate limit, audit, metrik) ikut hilang.
- Secret TOTP dan backup code: tidak ada endpoint reset admin. Perlu `disableMfa` lalu enrol ulang per user.
- Token reset password: `resetPassword()` (`src/features/auth/service.ts:217`) hanya menandai token sebagai terpakai dan tidak mengubah password apa pun. Jadi "invalidate token reset" saat ini berarti menghapus isi `resetTokensByHash`.

## 7. Evidence dan bukti

| Sumber | Apa yang ada | Batasan |
| --- | --- | --- |
| Log pino ke stdout | Pesan terstruktur dengan base `service` dan `environment`; contoh `auth.login.rejected`, `user.created`, `auth.mfa.locked`, `contact.unexpected_error` | Tidak ada `requestId` korelasi global. Log `auth.login.rejected` sengaja tanpa email, sehingga akun yang diserang tidak bisa diketahui. `pino` menulis ke stdout tanpa transport terenkripsi |
| Event store observability | 5000 event terakhir dengan tags yang sudah di-redact | In-memory, hilang saat restart. Metrik tidak menyimpan `requestId` |
| Audit log dan hash chain | Entry berantai dengan `hash` dan `previousHash` | Tidak pernah ditulis oleh alur bisnis. Tidak ada UI. Tidak persist. Verifikasi hanya bermakna bila `droppedEntries` nol |
| UEBA | Anomali dengan evidence ter-redact, 1000 terakhir, jendela 72 jam | In-memory. `new_ip` dan `new_device` hanya jalan bila baseline memiliki minimal 20 event |
| `error.digest` | Correlation code dari Next.js yang tampil di error boundary | Hanya ada di client saat error merender boundary |
| `x-forwarded-for` dan `x-real-ip` | Diteruskan nginx (`nginx/nginx.conf:33`) lalu di-hash menjadi `ipHash` | Hash terpotong 16 hex dengan salt publik |

Aturan handling bukti: bukti disimpan di [TODO: lokasi penyimpanan bukti] dengan akses terbatas; tidak diubah; hash file (sha256) dicatat untuk setiap bukti; catat siapa yang mengambilnya dan pada jam berapa. Jangan menyimpan bukti di issue tracker publik.

## 8. Pemulihan dan validasi

1. **Rollback lebih dulu bila perlu.** `Dockerfile` multi-stage dan `docker-compose.yml` memakai tag `${APP_VERSION:-local}`; pastikan tag lama masih ada sebelum deploy baru. Pemulihan tercepat adalah mengganti tag, bukan memperbaiki bug di produksi.
2. **Validasi perbaikan** dengan mengulang skenario serangan yang sama. Kriteria lulus: serangan gagal karena kontrol yang dimaksud, bukan karena crash, 404 routing, atau timeout. Bedakan ketiganya di catatan.
3. **Verifikasi integritas audit** dengan `verifyAuditIntegrity()`, dan periksa `droppedEntries`.
4. **Cek kebocoran baru** dengan membaca ulang log sejak waktu patch dan mencari password, token, TOTP, atau base32.
5. **Pastikan rate limit masih aktif** setelah restart, dengan mengingat bahwa `Map` kosong sehingga limit ter-reset.
6. **Periksa health container** memakai healthcheck yang sudah ada di `docker-compose.yml:36`.
7. **Jalankan `npm run lint` dan `npm run build`.** Repo tidak punya test runner (`package.json` hanya `dev`, `build`, `start`, `lint`), jadi verifikasi di luar build adalah manual.
8. Tutup insiden hanya setelah root cause tertulis dan tindakan korektif punya owner serta tenggat.

## 9. Komunikasi

Prinsip: lebih baik disampaikan cepat dan belum lengkap daripada disampaikan benar tetapi terlambat. Jangan pernah menyalahkan pengguna dalam komunikasi publik.

### 9.1 Ke pengguna dan pelanggan

Isi: apa yang terjadi, data apa yang mungkin terdampak, tindakan yang sudah diambil, apa yang perlu dilakukan pengguna (ganti password, aktifkan MFA, putuskan semua sesi), dan kontak. Jangan sertakan detail teknis internal, nama server, atau stack trace. Pada template ini seluruh data masih mock, sehingga skenario reset password ke user nyata belum relevan dan cukup ditulis saat backend benar-benar ada.

### 9.2 Notifikasi ke otoritas (UU PDP)

UU No. 27/2022 mewajibkan pemberitahuan kepadawatering|*Data Controller*|*|* setelah insiden keamanan yang menyebabkan kerugian akibat pemrosesan data pribadi. Unsur yang biasanya dinilai adalah ada data pribadi, ada kerugian (materi dan/atau immateriil), serta ada hubungan sebab-akibat. Klaim berikut membutuhkan nasihat hukum, bukan keputusan teknis:

- apakah notifikasi wajib dan tenggatnya;
- isi dan formulir notifikasi;
- apakah memberitahu subjek data diperlukan;
- dokumentasi kegiatan pemrosesan (lihat Lampiran D).

Kontak dan jalur notifikasi: [TODO]. Tetapkan siapa yang berperan sebagai penanggung jawab kepatuhan data.

### 9.3 Komunikasi internal

Kanal insiden: [TODO]. Kanal status: [TODO]. Kanal customer-facing: [TODO]. Aturan siapa boleh berbicara ke luar: hanya owner produk dan legal/compliance.

## 10. Post-mortem

Blameless: nama orang boleh muncul sebagai "peran yang melakukan X" untuk perbaikan organisasi, tetapi bukan untuk menyalahkan individu. Fokus pada sistem yang membiarkan X terjadi.

Setiap insiden P1 dan P2 wajib menghasilkan post-mortem tertulis maksimal 10 hari kerja. Template ringkas ada di Lampiran C, mengikuti bentuk IEC 61935.

Isi wajib: timeline faktual tanpa interpretasi, dampak nyata dan yang masih belum diketahui, timeline deteksi (terutama mengapa baru terdeteksi), kontrol yang gagal atau tidak ada, tindakan korektif dengan owner dan tenggat, serta apakah threat model atau checklist perlu diperbarui. Root cause harus berupa kondisi sistem, bukan "human error" tanpa penjelasan.

## 11. Latihan

- Tabletop exercise setiap [TODO: frekuensi, target minimal dua kali setahun], durasi 90 menit, tanpa menyentuh production.
- Skenario wajib: (1) credential stuffing pada `/login` dengan rate limit aktif; (2) akun admin diambil alih lewat XSS di halaman dashboard; (3) data user bocor lewat halaman `/settings/observability`; (4) hash chain audit terputus.
- Dalam setiap sesi, tiga pertanyaan wajib dijawab: siapa yang mendeklarasikan insiden, kontrol apa yang diaktifkan, dan siapa yang recovering sistem. Jawaban "tidak tahu" adalah temuan yang harus dicatat sebagai tindakan.
- Target kelulusan: [TODO]. Format evaluasi: [TODO].

## Lampiran A — Kontak

Semua nilai di bawah harus diisi manusia. Jangan menebak nomor, email, atau nama orang.

| Peran | Nama | Kanal | Nomor atau alamat | Backup |
| --- | --- | --- | --- | --- |
| Incident Commander | [TODO] | [TODO] | [TODO] | [TODO] |
| On-call developer | [TODO] | [TODO] | [TODO] | [TODO] |
| Security analyst | [TODO] | [TODO] | [TODO] | [TODO] |
| Owner produk | [TODO] | [TODO] | [TODO] | [TODO] |
| Legal/compliance | [TODO] | [TODO] | [TODO] | [TODO] |
| Infra/ops | [TODO] | [TODO] | [TODO] | [TODO] |
| Hosting provider | [TODO] | [TODO] | [TODO] | [TODO] |
| Registry atau CA | [TODO] | [TODO] | [TODO] | [TODO] |
| Kontak regulator | [TODO] | [TODO] | [TODO] | [TODO] |

Kanal insiden dan ambang severity yang disepakati: [TODO].

## Lampiran B — Checklist Evidence Collection

- [ ] Waktu deteksi dicatat, lengkap dengan zona waktu
- [ ] ID insiden dibuat (`INC-<tahun>-<urutan>`)
- [ ] Screenshot halaman atau respons yang bermasalah diambil, lengkap dengan URL dan timestamp
- [ ] `docker compose logs --since <waktu> nextjs` diekspor ke file
- [ ] Header request relevan dicatat, tanpa nilai cookie dan authorization
- [ ] `docker inspect <container>` diekspor untuk memeriksa mount dan environment
- [ ] Status container dicatat dengan `docker compose ps`
- [ ] `verifyAuditIntegrity()` dijalankan; `brokenAtIndex` dan `droppedEntries` dicatat
- [ ] Snapshot metrik 24 jam dari `/settings/observability` diambil
- [ ] Profil risiko aktor dari `/settings/ueba/[actorId]` diambil bila ada
- [ ] Daftar akun atau ID yang terpengaruh disusun
- [ ] SHA-256 setiap file bukti dihitung dan dicatat
- [ ] Lokasi penyimpanan bukti dan siapa yang mengakses dicatat
- [ ] Bukti tidak diubah sejak pengambilan (retensi: [TODO])

## Lampiran C — Template post-mortem (ringkasan IEC 61935)

```
# Post-mortem INC-<tahun>-<urutan> — <judul singkat>

Severity     : <P1..P4>
Dampak       : <jenis data, jumlah akun, durasi>
Deteksi      : <kapan terjadi vs kapan diketahui>
Durasi       : <menit hingga terdeteksi> / <menit hingga contained> / <menit hingga pulih>

## 1. Kronologi faktual
| Waktu (WIB) | Peristiwa | Sumber bukti |
| --- | --- | --- |
| | | |

## 2. Apa yang sebenarnya terjadi
<deskripsi teknis, tanpa menyalahkan orang>

## 3. Mengapa kontrol tidak mencegah atau tidak terdeteksi
| Kontrol yang diharapkan | Kenapa gagal atau tidak ada | File atau ID checklist |
| --- | --- | --- |
| | | |

## 4. Apa yang berjalan baik
<kontrol yang bekerja, agar tidak diubah menjadi lebih buruk>

## 5. Tindakan korektif
| # | Tindakan | Owner | Tenggat | Status |
| --- | --- | --- | --- | --- |
| 1 | | [TODO] | [TODO] | |

## 6. Dampak ke produk dan ke pengguna
<komunikasi yang sudah dikirim: tanggal dan isi ringkas>

## 7. Tindakan systemic
<perubahan pada THREAT-MODEL.md atau SECURITY-CHECKLIST.md>

## 8. Pelajaran untuk latihan berikutnya
<apa yang akan disimulasikan di tabletop berikutnya>
```

## Lampiran D — Dokumentasi kepatuhan UU PDP

Semua butir berikut [TODO] dan tidak boleh diisi tanpa nasihat hukum:

- [ ] Daftar sistem dan kategori data pribadi yang diproses
- [ ] Dasar hukum pemrosesan
- [ ] Kontak Data Protection Officer atau penanggung jawab data
- [ ] Tujuan dan dasar pemrosesan
- [ ] Jangka waktu retensi
- [ ] Tujuan dan mekanisme berbagi data kepada pihak ketiga
- [ ] Pengaturan yang berlaku
- [ ] Mekanisme pengajuan hak subjek data dan pengaduan
- [ ] Prosedur penanganan insiden (menghubungkan dokumen ini)

## Referensi silang

| Dokumen | Isi |
| --- | --- |
| `docs/SECURITY.md` | Persyaratan keamanan, apa yang harus ada |
| `docs/THREAT-MODEL.md` | STRIDE per aset dan status kontrol |
| `docs/SECURITY-CHECKLIST.md` | Tracker status item keamanan |
| `docs/ARCHITECTURE.md` | Peta route dan boundary data |
| `docs/INTEGRATION.md` | Batas mock versus nyata, bagian 5 soal session dan RBAC |
| `docs/ERROR-HANDLING.md` | Taksonomi `AppError` dan pemetaan HTTP |
