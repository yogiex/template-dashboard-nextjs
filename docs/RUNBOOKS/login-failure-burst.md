# Runbook: login-failure-burst

Rule: `login-failure-burst` (`src/config/alerting.ts`), severity `warning`,
kanal Slack, `forMs` 2 menit, kondisi `> 0,3`.

Window perhitungan: 15 menit terakhir (`ALERT_LOGIN_BURST_WINDOW_MS`).

## Gejala

- Rule `login-failure-burst` berstatus **Aktif** selama ≥ 2 menit.
- KPI "Login gagal (24 jam)" naik jauh dibanding "Login sukses (24 jam)".
- SLO `auth_success_rate` bergerak ke arah `warning`/`critical`.

Default rule: lebih dari 30% percobaan login gagal dalam 15 menit terakhir.
Rasionya `auth.login.failure` dibagi `auth.login.attempt`; pola ini indikator
awal credential stuffing.

## Dampak

- Kemungkinan ada serangan tebak kredensial terhadap satu atau beberapa akun.
- Pengguna asli yang kredensialnya salah akan terkunci; ini membuat insiden berkembang menjadi masalah akun, bukan sekadar masalah uptime.
- event store tidak menyimpan IP atau email, jadi investigasi sumber serangan
  tidak bisa dilakukan dari halaman ini saja.

## Diagnosis

1. Buka `/settings/observability`. Bandingkan kartu KPI:
   `Login sukses (24 jam)`, `Login gagal (24 jam)`, dan
   `Aktor aktif (1 jam)`.
2. Panel Metrik bisnis → funnel login menunjukkan tahap mana yang turun. Bila
   `Percobaan login` naik tetapi `Login berhasil` stagnan, polanya sesuai dengan
   credential stuffing.
3. Lihat daftar metrik teratas pada kartu Kesehatan store metrik; metrik
   `security.rate_limit` yang ikut naik berarti penyerang sudah menyentuh rate
   limit.
4. Cek log aplikasi untuk pesan terkait rate limit dan akses ditolak:

   ```bash
   curl -s http://localhost:3000/api/health/ready
   ```

   Log sudah melewati `redactTags()`, jadi expectasi minimum: tidak ada email
   mentah di log.
5. Selain itu, data yang tersedia terbatas pada event store
   in-memory. Kalau store penuh atau instance baru restart, rasio ini bisa
   menyesatkan.
6. Pastikan rasio dihitung dari event yang benar. Cek bahwa
   unit test terkait masih hijau bila ada perubahan kode:

   ```bash
   npx vitest run src/features/observability/lib/business-metrics.test.ts
   ```

## Mitigasi

Keterbatasan template: tidak ada blokir IP, tidak ada lockout akun, dan tidak
ada bot challenge di luar MFA yang sudah ada.

Yang bisa dilakukan:

- Pastikan rate limit pada `src/proxy.ts` dan `src/lib/rate-limit.ts` aktif.
- Minta tim security meninjau daftar akun yang paling sering gagal bila datanya
  tersedia di log.
- Aktifkan MFA untuk akun yang ada di garis depan, dan hubungi pengguna
  yang menjadi target lewat kanal tepercaya.
- Menaikkan ambang aturan untuk meredam alarm **tidak** memperbaiki
  masalah keamanan, dan sebaiknya dihindari.

## Eskalasi

- Severity `warning`: eskalasi ke tim security bila rasio tetap di atas 30%
  selama 30 menit, atau bila `security.rate_limit` ikut naik.
- Bila ada indikasi akun privileged yang terdampak, eskalasi ke pemilik
  layanan autentikasi.
- Bila ini terjadi di lingkungan produksi, catatan penting: aturan in-process
  bisa terduplikasi antar instance dan hilang saat restart. Konfirmasi juga
  lewat sumber lain, bukan hanya dashboard ini.

## Kapan menutup

1. Rasio `auth.login.failure / auth.login.attempt` kembali di bawah 30% pada
   window 15 menit penuh.
2. State rule `ok`/`resolved` minimal 10 menit.
3. SLO `auth_success_rate` kembali `healthy` atau `warning` dengan catatan.
4. Jika ada penyerang yang teridentifikasi, tindak lanjutannya ke tim
   security sudah dicatat.
