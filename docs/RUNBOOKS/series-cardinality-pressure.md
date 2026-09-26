# Runbook: series-cardinality-pressure

Rule: `series-cardinality-pressure` (`src/config/alerting.ts`), severity
`info`, kanal `none`, `forMs` 15 menit, kondisi `> 300`.

**Status rule: nonaktif (`enabled: false`).** Rule ini sengaja tidak dievaluasi
sebagai alarm karena ambangnya (300) belum disamakan dengan
`CARDINALITY_LIMITS.totalSeries` di `src/features/observability/lib/cardinality.ts`,
dan file config tidak boleh mengimpor lib. Di halaman
`/settings/observability` rule ini tetap tampil dengan status normal supaya
jelas bahwa ia ada dan belum aktif.

Dokumen ini tetap ditulis karena `AlertRuleConfig.runbook` menunjuknya, dan
menunjuk dokumen fiktif adalah hal yang tidak boleh dibiarkan.

## Gejala

- Halaman `/settings/observability` → kartu Kesehatan store metrik, bagian
  "Batas cardinality": bandingkan `Series maksimum` (300) dengan jumlah series
  unik saat ini.
- Jumlah series mendekati 300 per metrik.
- Route pada tag mulai muncul sebagai `_other`, hasil pelipatan nilai tag oleh
  `applyCardinalityLimits()`.

## Dampak

- Tanpa batas cardinality, satu tag yang tidak stabil (mis. path mentah berisi
  ID) bisa membuat ribuan series dan membuat penyimpanan membengkak.
- Setelah `_other` muncul, rincian per route jadi tidak berguna untuk diagnosis
  karena route asli sudah terlipat.

## Diagnosis

1. Buka `/settings/observability` → kartu Kesehatan store metrik.
   - Baris `Total event`, `Event terlama`, dan `Series maksimum` ada di tiga
     kartu ringkas bagian atas.
   - Daftar "Metrik teratas" menampilkan jumlah event dan jumlah series unik per
     metrik.
2. Bandingkan jumlah series unik dengan `CARDINALITY_LIMITS`: 300 series per
   metrik, 20 nilai unik per key tag, 8 key tag maksimal.
3. Cari penyebab tag yang tidak stabil:
   - Pastikan route lewat `normalizeRoute()` di `src/proxy.ts`, sehingga
     `/users/123` menjadi `/users/:id`.
   - Pastikan tag tidak memuat nilai acak, email, IP mentah, atau nilai
     `userId` mentah.
4. Uji aturan normalisasi langsung:

   ```bash
   npx vitest run src/features/observability/lib/cardinality.test.ts
   npx vitest run src/features/observability/lib/normalize-route.test.ts
   ```

5. Kalau `_other` mulai sering muncul, catat metrik mana yang penyebabnya
   (nilainya hasil pelipatan, bukan nilai asli).

## Mitigasi

Keterbatasan template: batas cardinality sudah ada di kode dan berjalan
otomatis, jadi "mitigasi" di sini berarti menjaga dan menyetel ulang batas itu
sendiri, bukan merespons alarm.

- Naikkan batas hanya bila storage benar-benar mampu menanggungnya.
- Turunkan batas bila `_other` terlalu sering muncul dan diagnosis route
  menjadi gagal. Batas terlalu rendah membuat sinyal hilang diam-diam.
- Pastikan semua route dinormalisasi; ini perbaikan yang paling sering benar.
- Mengabaikan tag yang tidak stabil lebih baik daripada membiarkannya membuat
  series tak terbatas.

## Eskalasi

- Severity `info`, kanal `none`, dan rule nonaktif: tidak ada paging. Kalau
  `_other` mendominasi, eskalasi ke pemilik metrik atau pemilik fitur yang
  mengirim tag tersebut.
- Bila storage mulai penuh, eskalasi ke pemilik runtime/infra.

## Kapan menutup

Tidak ada insiden yang dibuka dari rule ini selama statusnya nonaktif. Yang
menjadi kriteria "selesai":

1. Jumlah series unik per metrik kembali jauh di bawah 300, atau batasnya
   disetel ulang dengan alasan tercatat.
2. `_other` tidak lagi muncul pada metrik yang sedang ditelusuri.
3. Uji `cardinality.test.ts` dan `normalize-route.test.ts` tetap hijau.
4. Keputusan soal mengaktifkan atau tidak rule ini tercatat di
   `src/config/alerting.ts` beserta alasannya.
