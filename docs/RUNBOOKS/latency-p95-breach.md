# Runbook: latency-p95-breach

Rule: `latency-p95-breach` (`src/config/alerting.ts`), severity `warning`,
kanal Slack, `forMs` 2 menit, kondisi `> 1000 ms`.

## Gejala

- Rule `latency-p95-breach` berstatus **Aktif** selama ≥ 2 menit.
- Panel Golden signals → Latency menunjukkan p95 di atas 1000 ms.
- SLO `latency_p95` (window 1 jam) berstatus `warning` atau `critical` dengan
  target 500 ms.

Default rule: persentil ke-95 durasi request server melewati 1000 ms dalam 1 jam
terakhir, bersumber dari golden signals `latency.overall.p95Ms`.

## Dampak

- Pengguna akan merasa halaman yang memuat data lambat dimuat akan lambat dimuat.
- Perbedaan dengan SLO: rule memakai ambang 1000 ms, SLO memakai 500 ms. Jadi
  SLO bisa `warning` sementara rule masih `ok`.

## Diagnosis

1. Buka `/settings/observability` → Golden signals → Latency. Bandingkan p50,
   p95, dan p99.
   - p50 rendah tetapi p95 tinggi → biasanya ada sebagian request lambat
     (query berat, cache miss, lock kontensi).
   - p50, p95, p99 naik bersamaan → masalah sistemik (CPU, I/O, event loop).
2. Lihat rincian per route pada baris "Route teratas" panel Traffic untuk
   mencari route yang menjadi kontributor terbesar.
3. Cek event loop lag di panel Saturasi runtime. Event loop macet dan latensi
   p95 biasanya bergerak searah.
4. Probe instance:

   ```bash
   curl -s http://localhost:3000/api/health/ready
   curl -s http://localhost:3000/api/health/metrics | grep http_server_request_duration   # butuh HEALTH_METRICS_ENABLED=true
   ```

5. Ingat batas pengukuran: `http.server.request.duration` mengukur durasi di
   lapisan Proxy (`src/proxy.ts`), bukan total request time yang dilihat
   pengguna. Angka ini selalu lebih kecil daripada latensi sebenarnya.
6. Pastikan store tidak penuh: `Total event` mendekati 5000 berarti sampel
   window bisa tidak lengkap.

## Mitigasi

Keterbatasan template: tidak ada tombol throttling, tidak ada auto-scale, dan
tidak ada fallback data di level halaman. Yang bisa dilakukan:

- Mengurangi trafik dengan menahan deploy atau mematikan fitur berat.
- Menambah replica bila penyebabnya kapasitas.
- Me-reload halaman penuh pengguna akan mengulang request yang sama; hindari memakainya sebagai mitigasi.

Perbaikan yang sebenarnya ada di kode (query, cache, atau pemrosesan
Server Action), bukan di dashboard.

## Eskalasi

- Severity `warning`: eskalasi kalau p95 tetap di atas 1000 ms selama 30 menit.
- Selain p95, p99 juga naik jauh → eskalasi ke pemilik runtime
  (infra), bukan hanya pemilik fitur.
- Jika disertai rule `event-loop-lag` aktif, perlakukan sebagai satu insiden.

## Kapan menutup

1. State rule kembali `ok`/`resolved` minimal 10 menit (≥ 5× `forMs`).
2. p95 di bawah 1000 ms pada window 1 jam penuh, dan SLO `latency_p95`
   kembali `healthy`.
3. Penyebab dan tindakan (bila perlu) tercatat.
