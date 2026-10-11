# 12 — Anti-Patterns

Dikelompokkan berdasarkan area. Format: `- ❌ <larangan> — <alasan singkat>`.

Sumber: `AGENTS.md` (root) bagian "Prinsip yang Paling Sering Dilanggar", `docs/CONVENTIONS.md`, `docs/SECURITY.md`, `docs/ERROR-HANDLING.md`, dan kondisi nyata repo yang diverifikasi pada 2026-09.

## Arsitektur

- ❌ `PageShell` dipakai di luar `(dashboard)` — `(public)/layout.tsx` dan `AuthShell` sudah punya `<main>` sendiri; memakai `PageShell` menghasilkan `<main>` ganda dan layout rusak.
- ❌ Menulis `<main>` di `page.tsx` — kepemilikan `<main>` ada di shell layout, bukan di halaman.
- ❌ Query database langsung dari komponen presentasional atau Client Component — `service.ts` adalah satu-satunya pintu data.
- ❌ Business logic di `src/components/ui/` — folder itu primitive upstream; variasi aplikasi taruh di `src/components/custom/` atau `features/<x>/components/`.
- ❌ Menambah route segment tanpa alasan — setiap folder route berarti permukaan URL, metadata, dan sitemap yang harus dirawat.
- ❌ Access control di dalam komponen — autentikasi dan otorisasi milik boundary server.
- ❌ Folder kosong yang hanya dibuat untuk memenuhi struktur — struktur tumbuh dari kebutuhan nyata.
- ❌ Ganti struktur folder, config, atau status fitur tanpa memperbarui `docs/ARCHITECTURE.md` §3.1, §15, §16 di commit yang sama — dokumentasi jadi berbohong.
- ❌ Menambah fitur role/permission baru sebelum duplikat `src/features/role/` vs `src/features/roles/` diputuskan — memaksakan keputusan yang belum diambil.
- ❌ Copy user-facing string ke dalam komponen — sumbernya `src/config/`.
- ❌ Membiarkan `role/` dan `roles/` makin divergen — duplikat yang dibiarkan adalah technical debt berbayar bunga.

## Data

- ❌ Access data tanpa `import "server-only"` di `service.ts` — batas server/client tidak lagi terjaga.
- ❌ `params`/`searchParams` yang tidak di-`await` — keduanya Promise di App Router modern; accessing langsung itu bug.
- ❌ Input eksternal tanpa validasi Zod di server — `params`, `searchParams`, form data, cookie, body, dan hasil fetch semuanya tidak tepercaya.
- ❌ Query di Client Component — memindahkan data dan secret ke browser.
- ❌ Meneruskan data non-serializable ke Client Component — server function, object database, atau Date mentah bisa merusak serialisasi RSC.
- ❌ Cache data spesifik user sebagai shared cache — bisa bocor antar user.
- ❌ State mock yang tertinggal setelah backend nyata terpasang — `src/features/user/service.ts` masih menyimpan array di module scope; itu batas mock, bukan arsitektur final.
- ❌ Pagination/sort/filter yang tidak dibatasi — `page` dan `pageSize` harus punya batas atas di schema, bukan dipercaya dari client.
- ❌ Mencampur sanitasi input, query, dan logika storage di komponen — validasi di boundary server, transformasi di service.

## Security

- ❌ `dangerouslySetInnerHTML` tanpa sanitasi ketat dan review — permukaan XSS langsung.
- ❌ Membiarkan detail error internal bocor ke client — stack trace, query SQL, nilai environment, atau pesan exception mentah bisa membocorkan struktur sistem.
- ❌ Hanya mengandalkan `proxy.ts`/middleware sebagai security boundary — proxy adalah guard awal, bukan pengganti verifikasi di Server Action/Route Handler/service.
- ❌ Melewatkan verifikasi kepemilikan resource (IDOR) — "sudah login" bukan berarti "boleh akses resource ini".
- ❌ Default allow di RBAC — `requireRole` harus default deny; `src/lib/rbac.ts` adalah tempat yang benar.
- ❌ Balas `FORBIDDEN` untuk resource milik user lain —-existence dibocorkan; balas `NOT_FOUND`.
- ❌ SQL mentah yang dirangkai dengan input user — selalu parameterized query/ORM API.
- ❌ Menggunakan input user untuk membentuk URL, redirect, atau nama file tanpa allowlist — SSRF dan open redirect.
- ❌ `NEXT_PUBLIC_` pada nilai sensitif — prefix itu berarti publik; cookie session dan token internal tidak pernah ikut.
- ❌ Menaruh secret di `src/config/`, source, log, screenshot, atau dokumentasi — secret hanya di `.env.local` atau secret manager.
- ❌ Commit `.env*` — hanya `.env.example` (nama variabel, contoh non-secret) yang boleh masuk repo.
- ❌ Melewati rate limit pada endpoint sensitif — login, reset password, dan contact wajib punya batas percobaan.
- ❌ Using identifier mentah (email penuh) sebagai key rate limit atau label log — truncate/hash dulu supaya tidak jadi PII yang bocor.
- ❌ Mematikan autofill dengan `readOnly`/`onFocus` atau menyuntik `autoComplete` semantic per-field (`email`, `current-password`, `one-time-code`) — pakai default `autoComplete="off"` di primitive `Input`/`Textarea` + `autoComplete="off"` pada `<form>`.
- ❌ Menganggap security header yang ada (nosniff, DENY, Referrer-Policy, Permissions-Policy) sebagai pengganti CSP — CSP belum ada dan itu gap yang diketahui.
- ❌ `npm install <paket>` tanpa review — menjalankan lifecycle script dan bisa menarik dependency rentan yang menggagalkan `npm audit --audit-level=high` di CI.

## Kode

- ❌ `any` sebagai default — pakai `unknown` untuk input belum tervalidasi lalu persempit dengan schema atau type guard.
- ❌ Type assertion untuk menjinakkan compiler (`as`, `as unknown as`, `false as true`) — assertion menyamarkan bug; ubah schema-nya.
- ❌ `useState` untuk nilai yang bisa diturunkan — hitung saat render, jangan simpan state duplikat.
- ❌ `console.log` untuk debugging yang tertinggal — pakai `logger` terstruktur (`src/lib/logger.ts`) tanpa PII.
- ❌ Nama generik seperti `utils.ts` atau `data.ts` — nama file harus menjelaskan tanggung jawabnya.
- ❌ Duplikasi validasi yang sama di beberapa tempat — schema single source, di-*compose* dengan `.extend()`/`.merge()`/`.pick()`/`.omit()`.
- ❌ `import` runtime untuk type saja — pakai `import type`.
- ❌ `enum` untuk data runtime yang sering berubah — union type atau object constant.
- ❌ Inline style untuk nilai visual yang bisa diekspresikan lewat Tailwind atau CSS variable.
- ❌ Menjalankan `npm run build` sambil mengklaim build sudah hijau — jalankan, tunggu selesai, baca outputnya.

## UI/UX

- ❌ `asChild` pada `Button` — Base UI memakai prop `render={<Link … />}`.
- ❌ `FormItem` tanpa `space-y-2`, input form tanpa `h-10`, atau field tanpa `space-y-5` — ritme form jadi tidak konsisten dengan halaman lain.
- ❌ Hex, arbitrary value, atau warna hardcode (mis. `emerald`) di komponen — pakai token semantic dari `globals.css`.
- ❌ `href="#"` sebagai placeholder di footer/header — link harus menuju route yang benar-benar ada.
- ❌ Missing state fokus, disabled, loading, empty, atau error — komponen interaktif tanpa state ini terasa rusak.
- ❌ Menyalin daftar warna di komponen di beberapa tempat — buat token/konstanta bersama.
- ❌ Mengubah style global demi satu komponen — pakai variant atau wrapper yang terisolasi.
- ❌ Heading tidak berurutan, `alt` hilang, atau label form tidak terhubung — gagal di audit aksesibilitas.
- ❌ Copy statis yang seharusnya berasal dari config — teks di komponen tidak bisa diubah tanpa menyentuh kode.
- ❌ Menampilkan pesan error mentah dari server — yang tampil ke user harus pesan generik yang aman.

## Error Handling

- ❌ `throw` dari Server Action tanpa `try/catch` — exception yang tidak tertangani menjadi 500 dan butuh pesan yang bisa ditampilkan.
- ❌ `console.error(error)` tanpa kode yang bisa dicari — kalau tetap perlu, gunakan `logger.error` dengan nama event yang stabil.
- ❌ Mengyhanturkan detail internal (query, nilai env, stack trace) ke client — production harus generik.
- ❌ Error boundary dianggap menangkap event handler — `error.tsx` hanya menangkap render/rethrow; form `onSubmit` harus `try/catch` sendiri.
- ❌ Satu pesan error untuk semua kegagalan — pisahkan validasi yang diharapkan dari error internal; kode error harus bisa dibedakan client.
- ❌ Sengaja melempar exception dari route untuk "melewati" validasi — route lebih baik me-render 404/null dengan benar.
- ❌ Toute halaman yang tidak punya `not-found.tsx`/`error.tsx` padahal data bisa hilang — fallback yang tidak ada menghasilkan blank page.
- ❌ Menampilkan pesan exception mentah sebagai pesan user — pakai `AppError.userMessage`.

## Git

- ❌ `git commit` / `git push` / `git merge` tanpa perintah eksplisit user — "selesaikan tasknya" bukan izin commit; izin berlaku sekali, tidak berantai.
- ❌ `git add .` atau `git add -A` — working tree repo ini punya 90+ file termodifikasi; `git add .` akan mencampur perubahan orang lain. Stage file spesifik saja.
- ❌ `git commit --no-verify` atau mem-bypass hook — kalau hook gagal, perbaiki penyebabnya.
- ❌ `git reset --hard`, `git checkout -- .`, `git clean -fd`, `git stash` tanpa izin — perintah itu membuang pekerjaan yang belum di-commit.
- ❌ `git checkout <branch>` untuk berpindah konteks — bisa menimpa file yang sedang dimodifikasi.
- ❌ Force-push atau amend commit milik orang lain.
- ❌ Mengubah `git config` (user, hooks, rebase) tanpa diminta.
- ❌ Membuang `package-lock.json` dari commit — lockfile justru **wajib** di-commit (`docs/SECURITY.md` A08, CI pakai `npm ci`). Yang tidak boleh masuk `.env*`, `node_modules/`, `.next/`, secret, `*.pem`.
- ❌ Commit message tanpa scope atau dalam Bahasa Inggris huruf besar — repo memakai `type(scope): description` lowercase imperative.
- ❌ Membuat branch atau tag tanpa diminta.

## Testing

- ❌ `npm test` atau "test lulus" tanpa menjalankannya — runner (Vitest) sudah terpasang; **jalankan dulu** dan laporkan hasil apa adanya. Verifikasi minimum: `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run build`.
- ❌ Menambah test tapi tidak menjalankan `npm test` sampai hijau, atau diam-diam menurunkan include/threshold agar verde.
- ❌ File test di luar `src/**/*.test.ts(x)` — `include` di `vitest.config.ts` tidak akan memUNGkitnya.
- ❌ Menambah script/dependency test tanpa persetujuan user.
- ❌ Test hanya happy path — jalur negatif (401/403/404/IDOR) justru yang paling sering menggigit.
- ❌ Mock `requireSession()` selalu `admin` lalu menyimpulkan otorisasi aman — authz justru lapisan yang sedang diuji.
- ❌ Test yang bergantung pada urutan eksekusi atau `localStorage` tanpa reset.
- ❌ Menurunkan threshold coverage atau mengubah test agar CI hijau.
- ❌ Menaruh credential mock (`demo@example.com` / `password123`) di test yang jalan di CI publik.

## Performance

- ❌ `"use client"` di layout besar atau di `src/app/layout.tsx` hanya untuk satu child interaktif — pecah ke leaf, kurangi client boundary.
- ❌ `useSearchParams` tanpa `<Suspense>` — memicu seluruh route jadi client-side render.
- ❌ Import seluruh library charting di server tanpa memo boundary — chart berat harus lazy-loaded; lihat pola di `src/features/dashboard/components/`.
- ❌ `useEffect` untuk fetch data yang bisa diambil di server — menunda render dan menambah beban client.
- ❌ Unbounded list/table tanpa pagination atau virtualisasi.
- ❌ `useMemo`/`useCallback` untuk nilai murah — hook dengan dependency salah membuat bug staleness tanpa manfaat nyata.
- ❌ Cache client untuk data yang berubah di server tanpa invalidasi.

## Dependency

- ❌ Menambah dependency tanpa bertanya user — wajib izin eksplisit di setiap kasus, tanpa pengecualian.
- ❌ `npm install` paket untuk masalah yang bisa diselesaikan dengan `src/lib/` atau primitive yang sudah ada.
- ❌ Hasil `npm audit` diabaikan — CI gagal pada severity high/critical.
- ❌ Memperbarui ke major version tanpa rencana migrasi.
- ❌ Menambah runner/linter/formatter baru tanpa persetujuan terpisah — mengubah alur kerja seluruh repo.
- ❌ Menempelkan source dependency ke `src/` lalu mengeditnya — pin versi saja, jangan fork diam-diam.

## AI Agent Khusus

Bagian ini mengikat agent lebih ketat daripada developer manusia.

- ❌ Mengklaim "test lulus" tanpa menjalankan `npm test` — runner sudah terpasang, jadi tidak ada alasan. Kalau gagal, laporkan apa adanya.
- ❌ Melewati `npm run lint` / `npx tsc --noEmit` / `npm run build` dan tetap menyatakan selesai.
- ❌ Mengarang nama file, komponen, atau route yang tidak ada — verifikasi `ls`/`glob` dulu sebelum menyebut path.
- ❌ Mengutip isi dokumen sebagai fakta tanpa memverifikasi terhadap kode — dokumentasi repo pernah usang; `docs/CONVENTIONS.md` pernah mengklaim tidak ada service layer padahal `src/features/*/service.ts` sudah ada.
- ❌ Menjalankan `npm install`, `npm audit fix --force`, atau `npm update` tanpa izin.
- ❌ Menjalankan `git` yang mengubah history atau index tanpa izin.
- ❌ Menulis file di luar scope task yang diminta — empat file rules ini adalah satu-satunya yang boleh dibuat tanpa minta.
- ❌ Menyentuh file lain (source, docs, config) saat tugas hanya meminta dokumentasi.
- ❌ Menutupi kegagalan build/lint dengan mengubah konfigurasi — laporkan gagalnya.
- ❌ Menyebutkan "sudah diperbaiki" sebelum `npm run lint`, `npx tsc --noEmit`, dan `npm run build` benar-benar dijalankan.
- ❌ Mengabaikan instruksi AGENTS.md root karena "agak verbose" — tabel file→dokumen di sana ituAturan, bukan saran.
- ❌ Menebak-nebak konvensi ketika bisa membaca kode yang sudah ada — `src/features/contact/actions.ts` adalah referensi Server Action yang benar.
- ❌ Berhenti di tengah lalu diam saja — kalau ada bagian yang tidak jelas, tanya user.

## Hierarchy Prioritas

Saat dua aturan bertentangan, ikuti urutan berikut. Yang atas mengalahkan yang bawah.

1. **Security** — kebocoran secret, authz/IDOR, injeksi, XSS, SSRF. Tidak ada yang lebih tinggi dari ini.
2. **Data integrity** — kebenaran data, validasi boundary, tidak kehilangan/merusak record, transaksi yang benar.
3. **Aksesibilitas** — keyboard, focus, label, kontras, elemen semantik. Fitur yang tidak bisa diakses bukan fitur.
4. **Arsitektur** — boundary server/client, service layer, route group, dependency direction.
5. **Konvensi** — naming, spacing, token warna, struktur file, gaya commit.
6. **Performa** — optimasi. Tidak pernah mengorbankan 1–5 demi 6.

Contoh penyelesaian konflik:

- "Tapi `react-hook-form` lebih cepat" → Performa (6) kalah dari Konvensi (5). Pakai pola repo.
- "Tapi validasi ini bikin UI lambat" → Performa kalah dari Data integrity (2).
- "Tapi user minta feature tanpa auth check" → Security (1) menang; bilang tidak bisa tanpa authz.
- "Tapi testnya belum ada, jadi skip" — test runner sudah terpasang; yang wajib dilakukan menulis regression test (lihat `09-testing.md`), bukan melewati verifikasi.

## Kalau Ragu: Tanya User

Hal-hal yang **wajib** diklarifikasi, bukan diasumsikan:

- Menambah dependency baru.
- Menambah fitur role/permission (masih ada duplikat `role/` vs `roles/`).
- Mengubah auth, session, atau token handling.
- Menambah route publik baru (implikasi SEO/sitemap).
- Menghapus atau memindahkan file yang dipakai fitur lain.
- Menjalankan perintah yang mengubah working tree di luar edits tugas (install, git add/commit, update lockfile).
- Menyusun ulang struktur folder.
- Kapan dokumentasi dan status sprint perlu diperbarui.

Lebih baik satu pertanyaan daripada satu asumsi yang salah. Kalau user tidak menjawab dalam konteks yang tersedia, pilih opsi yang paling konservatif (menolak akses > mengizinkan; default deny > default allow; tidak commit > commit).
