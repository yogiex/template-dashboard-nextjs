# Runbook: error-rate-critical

Rule: `error-rate-critical` (`src/config/alerting.ts`), severity `critical`,
kanal Slack, `forMs` 5 menit, kondisi `> 0,05`.

## Gejala

- Di halaman `/settings/observability`, rule `error-rate-critical` berstatus
  **Aktif** (state `firing`) selama ≥ 5 menit.
- Panel Golden signals → Errors menunjukkan `rate` di atas 5% dalam 1 jam.
- SLO `error_rate` (24 jam) berpotensi ikut `warning`/`critical`.

Default rule: lebih dari 5% request yang diterima server berakhir dengan status
error dalam 1 jam terakhir, bersumber dari golden signals `errors.rate`.

## Dampak

- Karena `http.server.error.count` hanya menghitung status ≥ 500 yang terlihat
  lapisan Proxy, sebagian besar dampaknya adalah request yang benar-benar gagal
  dilayani pengguna, bukan error render yang lolos.
- Error budget SLO ketersediaan terkuras lebih cepat dari jadwal, sehingga
  prioritas kerja bergeser ke stabilisasi.

## Diagnosis

1. Buka `/settings/observability` dan baca panel Golden signals → Errors. Lihat juga daftar "Route teratas" pada panel Traffic: apakah error terpusat di satu
   route atau merata.
2. Periksa tab "Metrik teratas" pada kartu Kesehatan store metrik untuk melihat
   metrik apa yang melonjak.
3. Cek probe:

   ```bash
   curl -s http://localhost:3000/api/health/live
   curl -s http://localhost:3000/api/health/ready
   ```

   `/api/health/ready` mengembalikan JSON berisi status tiap check.
4. Optionally, exposes metrik dalam format Prometheus (butuh
   `HEALTH_METRICS_ENABLED=true`, default 404):

   ```bash
   curl -s http://localhost:3000/api/health/metrics | grep http_server
   ```

5. Pastikan bukan artefak data: store in-memory hanya 5000 event. Kalau
   `Total event` di kartu Kesehatan store sudah mendekati 5000, angka window
   bisa tidak lengkap dan rule bisa salah menyala.
6. Lihat log aplikasi untuk pesan `error` terbaru; logger sudah meredaksi PII.

## Mitigasi

Template ini frontend-only, jadi mitigasi yang tersedia terbatas pada:

- Menutup atau menonaktifkan fitur yang relevan lewat UI.
- Menambah kapasitas instance bila penyebabnya beban.
- Menghapus data demo dari store dengan reload halaman penuh (halaman penuh
  **tidak** menghapus store; hanya restart proses yang mengosongkannya).

Mitigasi di sini **tidak** termasuk perbaikan kode. Kalau penyebabnya di dalam
kode, mitigasinya adalah patch, bukan dashboard.

## Eskalasi

- Severity `critical`: eskalasi ke pemilik backend/service yang menerima
  request tersebut.
- Jika tidak ada pemilik yang jelas dalam 15 menit, eskalasi ke on-call
  engineer.
- Ingatkan: state alert in-process hilang saat restart, jadi setelah restart
  rule akan kembali `ok` tanpa bukti insiden benar-benar selesai.

## Kapan menutup

Tutup insiden hanya setelah **semua** berlaku:

1. State rule kembali `ok` atau `resolved` minimal 15 menit (2× `forMs`).
2. Panel Errors menunjukkan rate di bawah 5% pada window 1 jam penuh.
3. Penyebabnya teridentifikasi dan tercatat, meskipun perbaikannya belum selesai.
