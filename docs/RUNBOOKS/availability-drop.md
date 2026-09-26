# Runbook: availability-drop

Rule: `availability-drop` (`src/config/alerting.ts`), severity `critical`,
kanal Slack, `forMs` 5 menit, kondisi `<= 0,99`.

## Gejala

- Rule `availability-drop` berstatus **Aktif** selama  5 menit.
- Panel Error budget menunjukkan `Ketersediaan` di bawah 0,990.
- SLO `availability` (window 24 jam) bergerak ke arah `critical`.

Default rule: porsi request yang berhasil dilayani turun ke 99% atau lebih
rendah dalam 24 jam terakhir, bersumber dari ringkasan error budget
`availability`.

## Dampak

- Sekitar satu dari seratus request gagal. Numerik 1% terlihat kecil, tapi
  itulah ambang yang disepakati di config. Perhatikan sifat window-nya: dengan window 24 jam,
  rule ini bereaksi lambat terhadap insiden yang baru terjadi dan lebih cepat
  dibanding aturan lain terhadap error yang sudah lama ada.
- Error budget habis lebih cepat bila rule ini sering menyala.

## Diagnosis

1. Buka `/settings/observability` lalu kartu Error budget. Periksa tiga angka:
   `Ketersediaan`, `Error`, dan `Total request`.
   - Kalau `Total request` sangat kecil (mis. di bawah 20), persentase tidak
     bermakna. Ini artefak store yang baru diisi, bukan gangguan layanan.
2. Lihat panel Golden signals dan panel Errors untuk angka 1 jam terakhir, yang
   jauh lebih responsif terhadap insiden baru.
3. Cek `/api/health/ready` untuk status tiap check dan waktu proses berdiri:

   ```bash
   curl -s http://localhost:3000/api/health/ready
   curl -s http://localhost:3000/api/health/live
   ```

4. Bandingkan dengan log aplikasi: cari pesan berlevel `error` dalam 24 jam
   terakhir, lalu kelompokkan berdasarkan pesan.
5. Kalau angka availability naik turun tidak sinkron dengan log, kemungkinan
   besar penyebabnya store in-memory: event yang sudah ter-prune atau
   instance yang baru restart.

## Mitigasi

Keterbatasan template: tidak ada rolling back dari dashboard, tidak ada
failover otomatis, tidak ada spare instance yang dikendalikan template.

Yang bisa dilakukan:

- Menahan deploy yang sedang berjalan.
- Menambah replica bila penyebabnya adalah ketidakcukupan kapasitas.
- Meminta pengguna mengulang aksi bila kesalahannya transien.

Semua mitigasi di atas bersifat operasional. Perbaikan kode tetap perlu patch
terpisah.

## Eskalasi

- Severity `critical`: langsung eskalasi ke pemilik layanan terkait, tanpa
  menunggu konfirmasi dari yang melaporkan.
- Bila `Total request` di bawah 20, eskalasi ke pemilik metrik untuk memvalidasi
  apakah ini noise data, bukan ke pengguna.
- Bila dua aturan berikut menyala bersamaan (`availability-drop` dan
  `error-rate-critical`), perlakukan sebagai satu insiden tunggal.

## Kapan menutup

1. State rule `ok`/`resolved` minimal 15 menit.
2. Ketersediaan di panel Error budget kembali di atas 0,990 pada window 24 jam.
3. SLO `availability` kembali `healthy` atau `warning` dengan alasan tercatat.
4. Penyebab dan tindakan (bila perlu) tercatat.
