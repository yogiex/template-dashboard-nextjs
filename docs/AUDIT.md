# Audit Log

Dokumen ini menjelaskan modul `src/features/audit/` yang sudah ada di repository: kontrak, batas redaksi, rantai hash, dan batas ketahanannya. Setiap klaim di sini diverifikasi terhadap kode; jika tidak ada di kode, dokumen ini tidak mengatakannya.

Status keseluruhan: **sudah terpasang dan sudah dipakai, tetapi in-memory dan hanya hidup selama satu proses Next.js.** Bukan audit trail production.

> Snapshot: diverifikasi terhadap working tree per 2026-09. `src/features/audit/**` sedang aktif diubah, jadi pastikan ulang baris yang dikutip sebelum memakai dokumen ini sebagai rujukan.

## Peta File

| File | Peran |
| --- | --- |
| `src/features/audit/schema.ts` | Kontrak Zod: `AUDIT_CATEGORIES`, `AUDIT_SEVERITIES`, `AUDIT_RESULTS`, bentuk event dan query. Sumber kebenaran untuk bentuk data. |
| `src/features/audit/types.ts` | Re-export tipe dari `schema.ts` plus `AuditActor` dan `IntegrityReport`. Tidak berisi logic. |
| `src/features/audit/actions.ts` | Server Action (`"use server"`) untuk reads: `queryAuditEventsAction()` dan `getAuditOverviewAction()`.Kpunya guard `requireAuditReader()`. |
| `src/features/audit/lib/log-audit.ts` | **Satu-satunya pintu penulisan.** `logAudit()`. |
| `src/features/audit/lib/categories.ts` | `AUDIT_ACTIONS` — satu-satunya sumber nama `action`. Nilai string tidak boleh diubah. |
| `src/features/audit/lib/severity.ts` | `DEFAULT_SEVERITY`, `normalizeSeverity()` — lantai severity per kategori. Fungsi murni. |
| `src/features/audit/lib/store.ts` | Store in-memory di `globalThis` dengan batas 5000 entry dan pencacah `droppedEntries`. |
| `src/features/audit/lib/integrity.ts` | `computeEntryHash()`, `verifyChain()`, `buildIntegrityReport()` (SHA-256 lewat `node:crypto`). |
| `src/features/audit/service.ts` | API baca yang dipakai consumer: `queryAuditEvents()`, `getAuditSummary()`, `verifyAuditIntegrity()`. `import "server-only"`, tanpa guard session. |
| `src/lib/redact.ts` | Redaksi bersama untuk log, metrik, dan audit. **Bukan** milik fitur audit. |
| `src/lib/request-context.ts` | `getRequestContext()` / `getSafeRequestContext()` yang sudah meng-hash IP dan memotong user-agent. |
| `lib/*.test.ts` | `store.test.ts`, `log-audit.test.ts`, `integrity.test.ts`, `severity.test.ts`. |

## Kontrak Inti

### 1. Satu pintu penulisan

Tidak ada kode yang boleh memanggil `appendAuditEvent()` atau menulis ke store secara langsung. `appendAuditEvent()` hanya dipanggil dari `logAudit()` (`log-audit.ts:38`). Penulisan lain yang(renamean) harus lewat `logAudit()`.

`logAudit(input, actor?)` melakukan lima hal berurutan:

1. `auditEventInputSchema.safeParse(input)` (`log-audit.ts:29`). Gagal → `logger.warn("audit.invalid_event")` lalu `return null` (`log-audit.ts:32-34`).
2. Menggabungkan `input.actor` dengan argumen `actor` kedua; argumen kedua menang (`log-audit.ts:46-52`).
3. Menaikkan severity ke lantai kategorinya lewat `normalizeSeverity(data.category, data.severity)` (`log-audit.ts:43`).
4. Memaksa redaksi `metadata` lewat `redactTags()` (`log-audit.ts:59`).
5. Menyerahkan sisanya ke `appendAuditEvent()`, yang menempelkan `previousHash` dan `hash` (`store.ts:45-50`).

`actor` sebagai argumen kedua sudah dipakai produksi, misalnya `src/features/log-management/lib/disposal-queue.ts:115` mengoper `{ id, role }` tanpa menuliskan `actor` di dalam payload.

**Nama `action` tidak boleh bebas.** `lib/categories.ts` mendeklarasikan `AUDIT_ACTIONS` dengan 27 konstanta yang dipetakan ke string persis, plus tipe `AuditAction`. Komentarnya eksplisit: nilai string tidak boleh diubah karena log lama dan query filter `action` memakainya. Call site yang sudah ada masih menulis literal mentah (mis. `action: "login_success"` di `auth/actions.ts:251`), jadi konstanta belum dipakai seragam — dan `auditEventInputSchema` juga masih menerima `z.string().min(1).max(100)`, bukan enum. Migrasi call site ke `AUDIT_ACTIONS` masih terbuka.

**Severity punya lantai per kategori** (`lib/severity.ts`). `DEFAULT_SEVERITY` memberi nilai bawaan per kategori, dan `normalizeSeverity()` mengambil yang lebih tinggi antara nilai pemanggil dan `SEVERITY_FLOOR` kategori. Hanya `security` punya lantai di atas `info`, jadi event `security` ber-`info` otomatis naik ke `warning`. `critical` tidak pernah diturunkan. Fungsi ini murni dan tidak punya I/O.

### 2. Tidak pernah melempar exception

`logAudit()` dibungkus `try { ... } catch { return null }` penuh (`log-audit.ts:28-72`). Tidak ada `throw`, dan tidak ada jalur yang mengembalikan objek setengah jadi. Konsekuensinya:

- Keberhasilan aksi tidak boleh bergantung pada audit. `src/features/auth/actions.ts` dan `src/features/user/actions.ts` memanggilnya dengan `void logAudit({...})` — fire-and-forget, hasil diabaikan.
- Kegagalan pencatatan **tidak terlihat dari sisi pemanggil**. Ia hanya muncul sebagai entry yang tidak ada. Kalau ini tidak cukup, andalkan `logger` (`log-audit.ts:62`, `log-audit.ts:32`), bukan nilai balik.
- Karena tidak melempar, `logAudit()` juga tidak cocok dipakai untuk keputusan otorisasi.

### 3. Batas redaksi

Ada dua lapis, dan keduanya sudah ada:

- **Lapis schema** (`schema.ts:36-49`): panjang string dibatasi (`action` maks 100, `source` maks 100, `resource.type` maks 60, dan seterusnya), `metadata` dibatasi `z.record(z.string().max(50), z.unknown())`. Nilai `metadata` masih `unknown` di sini.
- **Lapis redaksi** (`log-audit.ts:59` → `src/lib/redact.ts:83-105`): `redactTags()` mengubah `metadata` menjadi `Record<string, string>`, yaitu semua nilai jadi `String(rawValue)` dan key/value yang sensitif **dibuang**, bukan hanya disamarkan.

Aturan `redactTags()` yang relevan untuk audit (`redact.ts:17-22`):

| Key cocok | Perlakuan |
| --- | --- |
| `/password\|passwd\|secret\|token\|authorization\|cookie\|apikey\|api_key\|ssn\|credit\|card\|cvv\|otp\|code/i` | **Dibuang** (`redactTag` mengembalikan `null`, `redact.ts:59-61`) |
| `ip`, `ipaddress`, `ip_address`, `remote_addr`, `x_forwarded_for` | SHA-256 truncated 16 hex, per item untuk daftar (`x-forwarded-for`) |
| `email`, `mail`, `username`, `user_name` | Dimask: 2 karakter pertama + `•` + domain |
| `useragent`, `user_agent`, `ua` | Dipotong 120 karakter |
| lainnya | `String(value).slice(0, 200)` |

Yang perlu diketahui integrator:

- Aturan `code` adalah pencocokan substring pada nama key, jadi `metadata: { via: "otp" }` aman tetapi key yang memuat `code` (mis. `responseCode`) akan hilang. Ini memang disengaja untuk OTP, tetapi jangan mempercayainya untuk field yang harus selalu ada.
- Hash IP di-salt dengan `NEXT_PUBLIC_APP_URL` (`redact.ts:27-32`), jadi hash tidak stabil lintas deployment yang mengubah `APP_URL`.
- Yang **tidak** diredaksi: `actor.email` dan `actor.role`. `schema.ts:21-22` hanya memaksa pemanggil sudah menyediakannya dalam bentuk dimask atau berhash; `redactTags()` hanya menyapu `metadata`. Kalau Anda mengirim `actor: { email }` mentah, email itu masuk audit apa adanya.
- `requestId` dan `host` juga tidak diredaksi; keduanya dibatasi panjang oleh schema saja. Untuk IP, pakai `ipHash` dari `getRequestContext()` — jangan pernah mengirim alamat IP mentah.
- `userAgent` pada event (`schema.ts:46`) **tidak** dipotong ke 120 karakter; hanya dibatasi 120 oleh schema, jadi tetap bisa menjadi sidik jari. `truncateUserAgent()` hanya berjalan bila Anda memanggilnya sendiri.

### 4. Rantai hash dan verifikasi integritas

Setiap entry memakai dua field tambahan, `hash` dan `previousHash` (`schema.ts:67-73`).

`computeEntryHash()` (`integrity.ts:18-38`) tidak me-hash seluruh objek. Ia membangun payload eksplisit dengan sebelas field: `id`, `timestamp`, `action`, `category`, `severity`, `result`, `source`, `requestId`, `actorId`, `resource` sebagai string `` `${type}:${id}` ``, `metadata`, dan `previousHash`. Hash pertama memakai `GENESIS_HASH` berupa 64 karakter nol (`integrity.ts:8`). Hasilnya `sha256(...).digest("hex")`.

Konsekuensi yang harus diketahui: `resource.name` dan `actor.email`/`actor.role` **tidak** masuk hash, dan `metadata` masuk sebagai objek mentah apa adanya. Modifikasi pada `actor.email` tidak akan terdeteksi oleh verifikasi rantai.

`queryAuditStore()` mengurutkan seluruh hasil ke terbaru-dulu **sebelum** memotong halaman. Urutan ini disengaja: log audit dibaca dari yang baru, dan halaman 1 harus memuat entry terbaru. Memotong lebih dulu lalu membalik tiap halaman akan membuat halaman 1 berisi entry tertua dan halaman berikutnya justru memuat entry terbaru.

`verifyChain(entries, options?)` menelusuri dari indeks 0 dan mengembalikan:

- `-1` bila seluruh rantai cocok;
- indeks pertama yang gagal, baik karena `entry.previousHash` tidak sama dengan hash sebelumnya maupun karena hash hasil hitung ulang berbeda.

`options.fromHash` menentukan `previousHash` yang diharapkan untuk `entries[0]`. Nilai default `null` berarti `entries[0]` dianggap genesis. Setelah buffer melewati `MAX_ENTRIES`, entry pertama yang tersisa bukan genesis, jadi pemanggil wajib mengoper `{ fromHash: resolveChainOffset(entries) }`. Tanpa itu, seluruh rantai dilaporkan rusak di indeks 0 secara permanen meski tidak ada modifikasi.

`resolveChainOffset(entries)` mengembalikan `previousHash` dari `entries[0]`, yaitu offset rantai setelah buffer tergerus, dan `null` bila `entries[0]` masih genesis.

`buildIntegrityReport(entries)` membungkusnya menjadi `IntegrityReport` dengan `brokenAtIndex`, `checkedEntries`, `lastHash`, `isPartial`, `chainOffset`, dan `verifiedAt`. `isPartial` menandai bahwa verifikasi hanya mencakup isi buffer yang tersisa, bukan seluruh stream — `-1` pada laporan parsial berarti "buffer yang ada utuh", bukan "seluruh riwayat utuh". `verifyAuditIntegrity()` (`service.ts:67-69`) adalah bridge ke `getAuditEntries()` dan sudah meneruskan `chainOffset` secara otomatis.

Jadi kontrol ini adalah **tamper evidence dalam satu proses**, bukan anti-tamper. Siapa pun yang bisa menulis ke store bisa menulis ulang rantai secara konsisten.

### 5. Store: batas in-memory dan `droppedEntries`

`store.ts:15` menetapkan `MAX_ENTRIES = 5_000`. Store ditempel di `globalThis` lewat `Symbol.for("template.audit.store")` (`store.ts:16`, `store.ts:28-41`) supaya tidak ter-reset saat modul dievaluasi ulang oleh HMR/dev atau segment baru saat build.

Saat `entries.length > MAX_ENTRIES` (`store.ts:55-62`):

1. entry tertua di-`splice` keluar sebanyak overflow;
2. `store.droppedEntries` bertambah sebesar overflow;
3. `store.head` **tidak** diubah, jadi rantai tetap tersambung dari sisi entry yang tersisa.

`getAuditStoreStats()` (`store.ts:125-151`) melaporkan `totalEntries`, `droppedEntries`, `head`, `approximateSizeKB` (estimasi dari panjang `JSON.stringify`, bukan `sizeof`), dan `maxEntries`. `src/features/log-management/lib/storage.ts:321-337` mengubahnya menjadi `getStorageCapacity()` yang juga memberi `usedPercent` dan `remainingEntries`. Perilaku overflow ini sudah punya test di `store.test.ts` (nilai `droppedEntries` 0 → 1 → 3).

`getAuditEntries()` mengembalikan **array langsung**, bukan salinan (`store.ts:99-101`). Consumer yang memfilter atau menghitung pada array itu ikut memodifikasi array store. Saat ini semua consumer hanya membaca, jadi belum jadi bug — tapi tidak aman diasumsikan untuk consumer baru.

`resetAuditStore()` (`store.ts:153-159`) dipakai oleh test, bukan oleh call site produksi.

## Yang Sudah Terpasang

Consumer nyata `logAudit()` per file (hasil `grep -rn "logAudit(" src/`):

| File | Jumlah call site | Category yang dipakai |
| --- | ---: | --- |
| `src/features/auth/actions.ts` | 9 | `auth`, `security` |
| `src/features/user/actions.ts` | 4 | `authz`, `data` |
| `src/features/log-management/lib/disposal-queue.ts` | 3 | `log` |
| `src/features/contact/actions.ts` | 2 | `data`, `security` |
| `src/features/organization/actions.ts` | 1 | `data` |
| `src/features/audit/lib/log-audit.ts` | 1 | definisi |

Lima dari enam kategori di `AUDIT_CATEGORIES` punya call site nyata. Kategori `config` belum dipakai siapa pun, meski `DEFAULT_SEVERITY` sudah memberi nilai `warning` (`severity.ts`) dan `log-management/lib/access.ts` sudah menentukan aturan logging-nya.

UI untuk membaca audit data **sudah ada**: `/settings/logs` (`src/app/(dashboard)/settings/logs/page.tsx`) adalah `force-dynamic` karena angkanya berasal dari store in-memory yang berubah tiap request. Halaman itu memanggil `getLogOverview()` (`src/features/log-management/service.ts:195-212`), yang memakai `getAuditSummary()` dan `queryAuditEvents()`, dan memanggil `verifyAuditIntegrity()` secara langsung (`page.tsx:40`) untuk report yang dihitung ulang di server, bukan dari teks statis. `IntegrityPanel` (`src/features/log-management/components/integrity-panel.tsx`) menampilkan `lastVerifiedAt`, `checkedEntries`, status rantai, dan `lastHash` beserta tombol salin.

`actions.ts` juga menyediakan jalur baca yang rate-limited: `queryAuditEventsAction()` dan `getAuditOverviewAction()`, keduanya memakai `requireAuditReader()` yang menjalankan `requireSession()` → `requireRole(session, "admin")` → `enforceRateLimit(session.id, purpose)`. `queryAuditEventsAction()` juga mencatat `audit.query.read` **setelah** mengambil snapshot, supaya entry "audit diquery" tidak muncul di halaman yang dikembalikan.

Tidak ada halaman audit terpisah dan tidak ada filter UI di luar `/settings/logs`; `auditQuerySchema` (`schema.ts:51-61`) sudah mendukung `category`, `severity`, `result`, `action` (substring), `actorId`, `from`/`to`, dan paginasi `pageSize` 10–100, tetapi yang terpakai hari ini hanya `pageSize`.

`getAuditSummary()` menghitung jendela 24 jam dengan membandingkan string ISO secara leksikografis (`service.ts:45-47`); itu benar selama semua timestamp diproduksi dengan `toISOString()` pada zona yang sama. Store sendiri selalu memakai `new Date().toISOString()` (`log-audit.ts:40`), tetapi `timestamp` juga boleh dioverride pemanggil (`schema.ts:48`), jadi formatnya tidak dijamin untuk entry lama.

## Apa yang Mock dan Tidak Durable

Jangan jadikan apa pun di sini sumber kebenaran produksi:

1. **Tidak durable.** Store ada di memori proses. Restart, deploy, atau scale-out multi-instance menghapus seluruh riwayat. Tidak ada flush, tidak ada persistensi, tidak ada ekspor.
2. **Tidak multi-instance.** Dua instance memiliki dua rantai terpisah. `verifyChain()` pada masing-masing instance terlihat utuh, jadi verifikasi tidak memberi rasa aman di deployment berreplica.
3. **Tidak immutable.** `getAuditEntries()` mengembalikan array yang bisa dimodifikasi, dan store tidak memakai `Object.freeze`.
4. **Guard authz ada tapi masih dekoratif.** `requireAuditReader()` di `actions.ts:99-107` sudah memakai `requireSession()`, role minimal admin, dan rate limit per-aktor, serta menulis sendiri ke dalam audit. Tetapi `requireSession()` di `src/lib/rbac.ts:15-17` mengembalikan `{ id: "usr_placeholder", role: "admin" }` untuk **semua** pemanggil, jadi `requireRole()` tidak menolak siapa pun. Kode menyatakannya sendiri di `actions.ts:88-98` dengan `TODO(Sprint 7.3)`. Yang tidak punya guard sama sekali adalah `features/audit/service.ts` dan route `/settings/logs`, yang memanggil service langsung.
5. **Jejak verifikasi integritas sengaja NOOP di production.** `verifyIntegrityWithTimestamp()` mengembalikan state lama tanpa menjalankan verifikasi bila `NODE_ENV === "production"` (`src/features/log-management/lib/schedule.ts:60-68`). State awal adalah `{ lastVerifiedAt: null, lastReport: null }` (`schedule.ts:37-40`). Jadi di production panel akan menampilkan "belum pernah diverifikasi" secara permanen, sementara report live yang dihitung tetap valid. Ini perilaku yang disengaja agar demo tidak mengubah state yang sedang dilihat, tetapi berarti metrik "terakhir diverifikasi" tidak berarti apa-apa di production.
6. ~~**Verifikasi rantai salah positif setelah overflow.**~~ **Sudah diperbaiki.** `verifyChain()` kini menerima `{ fromHash }` dan `buildIntegrityReport()` meneruskan `chainOffset` secara otomatis, sehingga `brokenAtIndex` tidak lagi terjepit di `0` setelah buffer melewati 5000 entry. Laporan baru punya kolom `isPartial` dan `chainOffset` supaya "buffer utuh" tidak disamakan dengan "seluruh riwayat utuh".
7. **Tidak ada alerting.** `src/features/log-management/lib/disposal.ts:117` menyatakan sendiri bahwa integritas "belum ada alert otomatis". Rantai yang rusak hanya terlihat bila seseorang membuka `/settings/logs`.
8. **Tidak ada retensi yang bisa dikonfigurasi.** Yang ada hanya batas jumlah entry global 5000. Tidak ada kebijakan retensi per kategori, tidak ada compliance hold, tidak ada WORM/immutable storage.
9. **Cakupan test masih perlu dilanjutkan.** `store.test.ts`, `log-audit.test.ts`, `integrity.test.ts`, dan `severity.test.ts` sudah ada dan mencakup overflow, chain offset, metadata bound, dan actor masking. Yang belum punya test adalah `actions.ts` dan `service.ts`.
10. ~~**Redaksi bersifat best-effort pada metadata saja.**~~ **Sebagian diperbaiki.** `actor.email` kini dimask oleh `redactActor()` sebelum event masuk store. `host` dan `userAgent` **tidak** disapu — keduanya disimpan apa adanya setelah melewati batas panjang di schema, dan keduanya bisa ikut mengidentifikasi orang.

## Rencana Saat Backend Siap

`store.ts:11-12` sudah mencatat target saat backend siap: pindahkan ke tabel `audit_events` dengan kolom `hash`/`previous_hash` dan index `(timestamp, category, actor_id)`. Saat melakukan migrasi, awasi enam hal berikut, karena semuanya adalah asumsi yang sekarang dibuat store in-memory:

- `getAuditEntries()` harus jadi repository read, bukan array. Consumer-nya sekarang `features/audit/service.ts:46,68` dan `features/log-management/lib/disposal-queue.ts:281`.
- `verifyChain()` tidak akan lagi bisa memverifikasi seluruh rantai dari genesis saat basis data sudah tergerus; laporan perlu menampilkan `droppedEntries` atau rentang yang terverifikasi secara eksplisit, bukan `-1` yang menyiratkan "seluruh riwayat".
- `computeEntryHash()` harus dibekukan sebagai format on-wire. Mengubah field yang di-hash akan membuat seluruh riwayat lama tidak terbaca dan tidak bisa diverifikasi tanpa re-hash yang justru menghapus bukti.
- `AUDIT_ACTIONS` juga harus dibekukan sebagai kontrak (`lib/categories.ts` sudah menyatakan ini sendiri).
- `requireSession()` harus membaca identitas terverifikasi dari server sebelum guard di `actions.ts` dianggap security boundary, dan `features/audit/service.ts` perlu guard sendiri untuk jalur baca yang bukan lewat action. Lihat `docs/SECURITY.md` §A09.
- Redaksi harus tetap di `logAudit()`, bukan di writer, supaya tidak bisa dilewati oleh call site baru.

## Relasi ke Dokumen Lain

| Dokumen | Isi yang relevan |
| --- | --- |
| `docs/ARCHITECTURE.md` §3.2, §10.7, §12.2, §15 | Peta folder, logging/privacy, observability, route `/settings/logs` |
| `docs/SECURITY.md` §A09 | Security Logging and Monitoring Failures |
| `docs/SPRINT.md` §Sprint 7.1 | Status sprint dan item yang tersingkir oleh desain yang lebih baik |
| `src/features/log-management/` | Konsumen terberat: disposal queue, retention, analisis, storage capacity |
