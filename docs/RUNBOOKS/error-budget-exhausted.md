# Runbook: error-budget-exhausted

Rule: `error-budget-exhausted` (`src/config/alerting.ts`), severity `critical`,
kanal Slack, `forMs` 1 menit, kondisi `<= 0`.

## Gejala

- Rule `error-budget-exhausted` berstatus **Aktif** selama ≥ 1 menit.
- Panel Error budget menunjukkan `Sisa error budget` di 0,0%.
- Kartu Error budget menampilkan badge "Anggaran habis".

Default rule: sisa error budget SLO ketersediaan sudah 0 dalam 24 jam
terakhir, bersumber dari ringkasan error budget `errorBudgetRemaining`.

## Dampak

- Secara operasional: anggaran untuk fitur baru habis, prioritas
  bergeser ke perbaikan dan stabilisasi.
- `ERROR_BUDGET_POLICY.freezeOnExhausted` sengaja `false`, jadi template ini
  **tidak** membekukan release secara otomatis. Tidak ada janji otomatis apa
  pun; tindakan harus diambil manusia.

## Diagnosis

1. Buka `/settings/observability` → kartu Error budget. Baca
   `Sisa error budget`, `Ketersediaan`, `Error`, dan `Total request`.
2. Periksa tanda pengaman di halaman ini: kartu Error budget menampilkan
   catatan "Belum ada request tercatat..." bila `hasData` false. Kalau catatan
   itu muncul, angka `errorBudgetRemaining` yang 1 adalah placeholder, bukan
   anggaran utuh. Jangan perlakukan sebagai anggaran habis atau aman.
3. Lihat SLO `availability` di tabel SLO: kolom `Sisa budget` harus 0,0%
   sementara statusnya `critical`.
4. Telusuri sumber error memakai panel Golden signals dan daftar metrik
   teratas pada kartu Kesehatan store metrik.
5. Bandingkan dengan log aplikasi untuk memastikan error berasal dari layanan,
   bukan dari data demo. Jalankan:

   ```bash
   npx vitest run src/features/observability   # memastikan perhitungan SLO masih sesuai unit test
   curl -s http://localhost:3000/api/health/ready
   ```

## Mitigasi

Keterbatasan template: tidak ada mekanisme freeze, tidak ada penguncian branch,
tidak ada pembatalan deploy dari dashboard.

Yang bisa dilakukan secara manual:

- Menahan rilis fitur baru dan memfokuskan kerja pada perbaikan.
- Menyalakan proteksi: aktifkan rate limit lebih ketat lewat env yang tersedia,
  atau nonaktifkan fitur yang bermasalah dari sisi UI.
- Mengkalibrasi ulang target SLO **hanya** bila target lamanya memang tidak sesuai
  dengan kemampuan layanan, dan catat alasannya. Menurunkan target supaya
  angka terlihat hijau tanpa memperbaiki apa pun adalah tindakan yang salah.

## Eskalasi

- Severity `critical`, `forMs` hanya 1 menit: verifikasi dalam 15 menit bahwa
  ini bukan noise data.
- Bila anggaran habis karena window 24 jam yang akan berganti, dukung
  penanganan sampai jendela berikutnya; eskalasi ke pemilik layanan bila kondisi
  berlanjut lebih dari 2 jam.
- Bila tidak ada pemilik teknis yang bisa dihubungi, eskalasi ke manajer.

## Kapan menutup

1. State rule kembali `ok`/`resolved`.
2. Sisa error budget di panel Error budget lebih besar dari 0 pada window 24
   jam penuh.
3. SLO `availability` kembali `healthy` atau `warning`.
4. Keputusan kebijakan (beku rilis atau tidak) tercatat tertulis.
