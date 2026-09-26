# Runbook: event-loop-lag

Rule: `event-loop-lag` (`src/config/alerting.ts`), severity `warning`,
kanal `log`, `forMs` 5 menit, kondisi `> 100 ms`.

## Gejala

- Rule `event-loop-lag` berstatus **Aktif** selama ≥ 5 menit.
- Panel Saturasi runtime → `Event loop lag` di atas 100 ms.
- Panel Saturasi runtime → `Request aktif` naik pada saat yang sama.
- aturan `latency-p95-breach` sering menyala bersamaan.

Default rule: penundaan event loop Node.js melewati 100 ms. Ini membuat semua
request dan antrian dalam proses ikut lambat, bukan hanya satu handler.
Sumbernya golden signals `saturation.eventLoopLagMs`.

## Dampak

- Seluruh request yang dilayani proses ini melambat, karena satu event loop
  hanya bisa menjalankan satu task sinkron pada satu waktu.
- Dampaknya luas: pekerjaan berat yang diblokir (JSON besar, sinkronisasi file,
  kriptografi) menghentikan timer, API, dan UI sekaligus.

## Diagnosis

1. Buka `/settings/observability` → panel Saturasi runtime. Baca
   `Event loop lag`, `Heap terpakai`, `RSS`, `CPU user`, dan `Uptime proses`.
   Kolom "Tidak terukur" berarti belum ada sampel runtime di store, bukan nol.
2. Bandingkan dengan panel Golden signals → Latency. Keduanya harus bergerak
   searah.
3. Sampler runtime berjalan tiap 30 detik
   (`src/lib/runtime-metrics.ts`, interval default 30.000 ms) dan hanya di
   runtime Node.js. Kalau kolomnya tidak pernah terisi, `src/instrumentation.ts`
   mungkin gagal dimuat; itu bukan tanda layanan sehat.
4. Cek probe:

   ```bash
   curl -s http://localhost:3000/api/health/ready
   curl -s http://localhost:3000/api/health/live
   ```

5. Bisa juga melihat dari panel metrik teratas, atau membuka
   `/api/health/metrics` (butuh `HEALTH_METRICS_ENABLED=true`):

   ```bash
   curl -s http://localhost:3000/api/health/metrics | grep nodejs
   ```

6. Ingat: seluruh angka berasal dari store in-memory per instance. Pada
   deployment multi-instance, nilai ini hanya menggambarkan satu instance.

## Mitigasi

Keterbatasan template: tidak ada worker thread, tidak ada queue, tidak ada
auto-scaling, dan tidak ada kontrol concurrency di level aplikasi.

Yang bisa dilakukan:

- Menambah replica agar beban terbagi antar instance.
- Menahan deploy yang sedang berjalan bila deploy itu penyebabnya.
- Menurangi trafik dengan menahan fitur yang paling banyak memakai CPU.
- Restart instance **hanya** sebagai tindakan terakhir, dan diingat bahwa
  restart menghapus seluruh riwayat metrik.

Perbaikan yang sebenarnya ada di kode: pindahkan pekerjaan CPU-bound ke
worker thread atau offload ke proses lain.

## Eskalasi

- Severity `warning`, kanal `log`: tidak ada notifikasi Slack. Karena itu
  insiden ini biasanya ditemukan lewat dashboard, bukan lewat halaman.
- Eskalasi ke pemilik runtime/infra bila lag bertahan lebih dari 30 menit.
- Bila simultan dengan `heap-pressure`, perlakukan sebagai satu insiden
  (indikasi memory leak yang membuat GC berjalan lama).

## Kapan menutup

1. State rule `ok`/`resolved` minimal 15 menit (3× `forMs`).
2. `Event loop lag` di bawah 100 ms pada sampel runtime terbaru.
3. Golden signals → Latency p95 kembali di bawah ambang SLO `latency_p95`.
4. Penyebab dan tindakan (bila perlu) tercatat.
