# Runbook: heap-pressure

Rule: `heap-pressure` (`src/config/alerting.ts`), severity `info`,
kanal `log`, `forMs` 10 menit, kondisi `> 0,85`.

Metriknya adalah rasio `nodejs.memory.heap_used_bytes` dibagi
`nodejs.memory.rss_bytes`.

## Gejala

- Rule `heap-pressure` berstatus **Aktif** selama ≥ 10 menit.
- Panel Saturasi runtime menunjukkan `Heap terpakai` dan `Resident set (RSS)`
  yang tidak lagi sebanding: heap mendekati RSS.
- `Event loop lag` kadang ikut naik karena GC sering berjalan.

Default rule: rasio heap terpakai terhadap RSS melewati 0,85. Ini indikasi
memory leak sebelum proses kena OOM.

## Dampak

- Risiko OOM kill. Mesin akan membunuh proses tanpa peringatan, dan karena
  seluruh state observability in-memory, semua riwayat metrik ikut hilang.
- Latensi naik tidak stabil saat GC terjadi.

## Diagnosis

1. Buka `/settings/observability` → panel Saturasi runtime. Hitung sendiri
   rasio `Heap terpakai / RSS`; nilainya harus cocok dengan ambang 0,85.
2. Bandingkan `Uptime proses` dengan tren `Heap terpakai`:
   - heap naik seiring uptime → indikasi leak.
   - heap naik lalu turun → kemungkinan cache yang wajar, bukan leak.
3. Lihat `Request aktif`. Buffer request yang menumpuk pada satu instance juga
   menaikkan RSS.
4. Data sumbernya adalah sampel tiap 30 detik dari
   `src/lib/runtime-metrics.ts`; sampel disimpan sebagai event metrik, bukan
   time-series, jadi simpan catatan manual bila perlu membandingkan.
5. Probe:

   ```bash
   curl -s http://localhost:3000/api/health/metrics | grep nodejs   # butuh HEALTH_METRICS_ENABLED=true
   curl -s http://localhost:3000/api/health/ready
   ```

6. Batasan: store hanya menahan 5000 event. Kalau penuh, sampel runtime baru
   bisa langsung terbuang, dan panel bisa terlihat lebih sehat dari kenyataan.

## Mitigasi

Keterbatasan template: tidak ada memory profiler, tidak ada heap snapshot
otomatis, tidak ada alert ke OOM killer.

Yang bisa dilakukan:

- Menambah replica untuk mengurangi jumlah request per instance.
- Menahan fitur yang menahan objek besar di memori.
- Restart instance sebagai tindakan terakhir: mengembalikan memori, tetapi
  menghapus seluruh metrik dan menjawab insiden ini.

Perbaikan ada di kode: cari tempat yang menahan array, Map, atau cache tanpa
batas, dan tambahkan batas eksplisit.

## Eskalasi

- Severity `info`, kanal `log`: tidak ada notifikasi ke kanal mana pun. Rule
  ini praktis hanya terbaca lewat dashboard, bukan melalui halaman.
- Eskalasi ke pemilik runtime/infra bila rasio bertahan di atas 0,85 selama 1
  jam tanpa membaik atau justru memburuk.
- Bila proses benar-benar kena OOM kill, eskalasi sebagai insiden proses,
  bukan hanya sebagai masalah memori.

## Kapan menutup

1. State rule `ok`/`resolved` minimal 20 menit (2× `forMs`).
2. Rasio heap/RSS di bawah 0,85 pada sampel runtime terbaru.
3. `Event loop lag` tetap di bawah 100 ms.
4. Penyebab dan tindakan (bila perlu) tercatat.
