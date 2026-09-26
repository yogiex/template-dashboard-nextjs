# Observability

Dokumen ini untuk developer yang baru pertama kali menyentuh
`src/features/observability/`. Tujuannya bukan membuat template ini terlihat
seperti sistem observability produksi, tapi menjelaskan apa yang **benar-benar**
ada di kode, apa yang **tidak** ada, dan mengapa batasannya seperti itu.

Semua pernyataan di bawah diverifikasi terhadap kode pada repo ini. Kalau ada
angka yang merupakan asumsi template, angka itu ditandai eksplisit.

---

## 1. Arsitektur: 4 pilar dan posisi template ini

Empat pilar observability adalah **metrics**, **logs**, **traces**, dan
**profiling**.

| Pilar | Status di template ini | Sumber |
| --- | --- | --- |
| Metrics | Ada, in-process, in-memory | `src/features/observability/lib/store.ts` |
| Logs | Ada, siap produksi (pino + redaksi) | `src/lib/logger.ts`, `docs/` untuk kebijakan retensi log |
| Traces | **Belum ada.** Hanya korelasi lewat header W3C `traceparent` | `src/lib/trace-context.ts`, `src/proxy.ts` |
| Profiling | **Belum ada** | — |

Artinya: halaman ini menampilkan metrik dan golden signals, bukan tracing dan
bukan profiling. Kalau ada kebutuhan "lihat alur request satu user dari
browser sampai database", jawabannya belum ada di repo ini.

Semua angka metrik dihitung ulang **per request** dari event yang tersimpan di
memori satu proses Node.js. Tidak ada database, tidak ada time-series database,
tidak ada exporter.

---

## 2. Peta file

| File | Tugasnya (satu kalimat) |
| --- | --- |
| `lib/store.ts` | Menyimpan event metrik di `globalThis` dengan batas 5000 event dan retensi default 7 hari. |
| `lib/track.ts` | Satu-satunya jalan masuk pencatatan event (`trackMetric`, `withMetric`); tidak pernah melempar dan tidak pernah menggagalkan request. |
| `lib/aggregate.ts` | Menggabungkan event menjadi time series (`rollup`), ringkasan statistik (`summarize`), dan grid heatmap (`heatmap`). |
| `lib/cardinality.ts` | Membatasi pertumbuhan series: `buildSeriesKey` dan `applyCardinalityLimits` menahan jumlah nilai tag unik. |
| `lib/normalize-route.ts` | Mengubah path mentah menjadi route template (`/users/123` → `/users/:id`) supaya tag tidak meledak. |
| `lib/slo.ts` | Menghitung SLI, status SLO, error budget, dan burn rate satu window. |
| `lib/golden-signals.ts` | Menghitung traffic, latency, errors, dan saturation beserta rincian per route. |
| `lib/business-metrics.ts` | Menghitung DAU/MAU, tingkat keberhasilan login dan MFA, serta funnel login. |
| `lib/alerting.ts` | Mesin alert in-process dengan state machine `ok → pending → firing → resolved`. |
| `lib/metric-retention.ts` | Menjelaskan kebijakan retensi metrik per kelompok metrik dan tier hot/warm/cold. |
| `src/proxy.ts` | Satu-satunya tempat metrik HTTP (`http.server.*`) dan correlation id dibuat. |
| `src/instrumentation.ts` | Mengaktifkan sampler runtime Node.js (event loop lag, heap, RSS, CPU, uptime). |
| `src/lib/trace-context.ts` | Membuat dan mempropagasi `traceparent` versi W3C; bukan distributed tracing. |
| `lib/constants.ts` | Satu sumber nama metrik, satuan, kunci tag OTel, dan deskripsi metrik. |
| `service.ts` | Service layer yang menyusun data untuk halaman: tidak ada komponen yang menyentuh `lib/store` langsung. |
| `components/*` | Layer UI Server Component, kecuali `observability-refresh-button.tsx` yang kecil dan interaktif. |

---

## 3. Cara kerja store

- **Satu proses.** Store ditempel di `globalThis` dengan kunci
  `Symbol.for("template.metrics.store")` supaya tidak ikut ter-reset saat HMR
  atau saat modul dievaluasi ulang.
- **Batas keras 5000 event** dan **2000 sampel per histogram**. Event paling
  lama yang keluar ketika kuota penuh. Setelah penuh, metrik yang berbasis
  window panjang (mis. 24 jam) bisa kehilangan event lebih awal dari yang
  terlihat di UI.
- **Cardinality dijaga.** Setiap event melewati `applyCardinalityLimits()` dengan
  batas `CARDINALITY_LIMITS`: 300 series per metrik, 20 nilai unik per key tag,
  8 key tag maksimal. Nilai yang melewati batas dilipat ke `_other`; event tetap
  tersimpan utuh, hanya tag-nya yang digabung.
- **Retensi default 7 hari** (`DEFAULT_RETENTION_MS`). Pruning berjalan setiap
  256 kali `pushEvent()`, bukan di setiap push, supaya biaya amortisasi tetap
  O(1).
- **Route dinormalisasi** sebelum dipakai sebagai tag, lewat `normalizeRoute()`
  di `src/proxy.ts`. Tanpa itu, `/users/123` dan `/users/456` akan menjadi dua
  series yang berbeda.

Konsekuensi yang harus jujur diucapkan di mana pun metrik ini dipakai:

1. **Single-instance.** Deployment multi-instance (Vercel, Kubernetes, beberapa
   worker) akan menghasilkan angka yang tidak bisa dijumlahkan, karena setiap
   instance punya store sendiri.
2. **Hilang saat restart.** Deploy, scale-to-zero, atau OOM kill menghapus
   seluruh riwayat metrik.
3. **Tidak durable.** Tidak ada yang ditulis ke disk atau jaringan.

Selama tiga hal di atas belum ditangani, halaman observability **tidak boleh**
dipakai sebagai sumber keputusan produksi maupun sumber angka paging.

---

## 4. Tabel metrik

Nama, satuan, dan sumber taken dari `lib/constants.ts`. Tidak ada metrik yang
diregistrasikan di luar tabel ini.

| Nama metrik | Kind | Satuan | Sumber |
| --- | --- | --- | --- |
| `auth.login.attempt` | counter | — | `auth/actions.ts` (percobaan login) |
| `auth.login.success` | counter | — | `auth/actions.ts` (login berhasil, termasuk yang lanjut ke MFA) |
| `auth.login.failure` | counter | — | `auth/actions.ts` (kredensial salah) |
| `auth.mfa.challenge` | counter | — | `auth/actions.ts` (login berhenti di MFA) |
| `auth.mfa.success` | counter | — | `auth/actions.ts` (kode MFA terverifikasi) |
| `auth.mfa.failure` | counter | — | `auth/actions.ts` (kode salah/kedaluwarsa) |
| `security.rate_limit` | counter | — | `src/proxy.ts` (request ditolak rate limit) |
| `security.access_denied` | counter | — | kontrol otorisasi |
| `nav.page_view` | counter | — | client navigation |
| `nav.command_menu.open` | counter | — | command menu |
| `data.user.create` / `data.user.update` / `data.user.delete` | counter | — | `roles`/`role` Server Actions |
| `data.contact.message` | counter | — | formulir kontak |
| `app.server_action.latency` | histogram | `ms` | `withMetric()` di sekitar Server Action |
| `http.server.request.duration` | histogram | `s` | `src/proxy.ts` (durasi di lapisan Proxy) |
| `http.server.request.count` | counter | `1` | `src/proxy.ts` |
| `http.server.error.count` | counter | `1` | `src/proxy.ts` (status ≥ 500 yang terlihat Proxy) |
| `http.server.active.requests` | gauge | `1` | `src/proxy.ts` (jumlah request in-flight) |
| `nodejs.event_loop.lag` | gauge | `ms` | `src/lib/runtime-metrics.ts` (interval 30 detik) |
| `nodejs.memory.heap_used_bytes` | gauge | `By` | `src/lib/runtime-metrics.ts` |
| `nodejs.memory.rss_bytes` | gauge | `By` | `src/lib/runtime-metrics.ts` |
| `process.cpu.user_ms` | counter | `ms` | `src/lib/runtime-metrics.ts` |
| `process.uptime_seconds` | gauge | `s` | `src/lib/runtime-metrics.ts` |
| `observability.ingest.bytes` | counter | `By` | nama metrics dislocation untuk exporter; belum ada pengirim |
| `observability.cost_usd` | counter | `USD` | estimasi biaya ingestion; belum ada pengirim |

> Kesetaraan satuan yang perlu diperhatikan: `http.server.request.duration`
> disimpan dalam **detik** (konvensi OTel), sedangkan
> `app.server_action.latency` disimpan dalam **milidetik**. `lib/slo.ts` dan
> `lib/golden-signals.ts` sudah mengonversikan ke milidetik saat menghitung
> persentil. Kalau menambah metrik baru, ikuti salah satu dari dua konvensi ini
> dan jangan mencampur di dalam satu agregat.

---

## 5. SLO, SLI, dan error budget

### Definisi

- **SLI** = angka yang diukur dari event, misalnya `availability =
  1 - (http.server.error.count / http.server.request.count)`.
- **SLO** = target atas SLI itu dalam satu window, plus arah deem
  (`lte` atau `gte`).
- **Error budget** = porsi kesalahan yang masih boleh terjadi sebelum target
  dilanggar.

Empat SLO template ada di `src/config/slo.ts` dan dihitung ulang di
`lib/slo.ts`:

| Key | Window | Target | Arah | Punya error budget |
| --- | --- | --- | --- | --- |
| `availability` | 24 jam | 0,999 | `gte` | Ya |
| `latency_p95` | 1 jam | 500 ms | `lte` | Tidak (latensi bukan hasil biner) |
| `error_rate` | 24 jam | 0,005 | `lte` | Ya |
| `auth_success_rate` | 24 jam | 0,95 | `gte` | Ya |

### ASUMSI TEMPLATE — angka target bukan SLO final

Seluruh angka target di atas **dipilih agar dashboard demo terlihat hidup**.
 target yang terlalu longgar membuat SLO tidak berguna; terlalu ketat membuat
halaman selalu merah..distribusi latensi nyata, jumlah error per window, dan
tingkat keberhasilan login yang sebenarnya belum pernah diukur di repo ini.
 Sebelum SLO ini dipakai di produksi, kalibrasi ulang dengan data nyata dan
tulis siapa yang menyetelnya.

### Rumus error budget

Untuk SLI rasio dengan `gte` (mis. availability dengan target `T`):

```
remaining = clamp01((value - T) / (1 - T))
consumed  = 1 - remaining
```

Untuk SLI rasio dengan `lte` (mis. error rate dengan target `T`):

```
remaining = clamp01(1 - value / T)
```

Keduanya di-clamp ke rentang 0..1. Melewati target berarti anggaran habis
(0), bukan negatif. `ERROR_BUDGET_POLICY.freezeOnExhausted` sengaja `false`:
template ini tidak punya mekanisme release freeze, jadi mengaktifkan flag itu
hanya akan menampilkan janji yang tidak dijalankan.

### Burn rate: bedakan dari Prometheus

`SloResult.burnRate` dihitung sebagai:

```
burnRate = consumedBudget / fractionOfWindowElapsed
```

dengan `fractionOfWindowElapsed` = porsi window yang benar-benar sudah terisi
data (di-clamp ke 0,01..1). Ini **burn rate satu window**, bukan
multi-window burn rate seperti di Prometheus/Google SRE yang menggabungkan
window pendek (mis. 5 menit) dan window panjang (mis. 1 jam) dengan bobot
eksponensial agar tidak memicu alarm pada insiden yang sudah selesai.

Konsekuensinya: pendekatan satu window lebih sederhana tapi lebih berisik.
Beberapa request error tunggal di awal window bisa menaikkan status.
Karena itu `burnRate` di sini **tidak boleh** dipakai langsung sebagai paging
threshold.

### Tanpa data ≠ sehat

`lib/slo.ts` dan UI yang consomenya selalu membaca flag `hasData` /
status `unknown` lebih dulu. Tanpa data, semua SLO berstatus `unknown` dan
angka turunannya ditampilkan sebagai "Tidak terukur". `ErrorBudgetSummary.errorBudgetRemaining`
bertipe `number` dan bernilai `1` saat `hasData: false` — angka itu placeholder
supaya tidak `NaN`, **bukan** "anggaran masih utuh". Halaman ini selalu
memeriksa `hasData` sebelum menampilkan angka.

---

## 6. Alerting

### Daftar rule

Semua rule ada di `src/config/alerting.ts` (`ALERT_RULES`):

| Id | Severity | Kanal | Ambang | `forMs` | Default |
| --- | --- | --- | --- | --- | --- |
| `error-rate-critical` | critical | Slack | `> 0,05` dalam 1 jam | 5 menit | aktif |
| `latency-p95-breach` | warning | Slack | `> 1000 ms` dalam 1 jam | 2 menit | aktif |
| `availability-drop` | critical | Slack | `<= 0,99` dalam 24 jam | 5 menit | aktif |
| `error-budget-exhausted` | critical | Slack | `<= 0` sisa budget 24 jam | 1 menit | aktif |
| `login-failure-burst` | warning | Slack | `> 0,3` dalam 15 menit | 2 menit | aktif |
| `event-loop-lag` | warning | log | `> 100 ms` | 5 menit | aktif |
| `heap-pressure` | info | log | `> 0,85` rasio heap/RSS | 10 menit | aktif |
| `series-cardinality-pressure` | info | none | `> 300` series | 15 menit | **nonaktif** (`enabled: false`) |

`series-cardinality-pressure` sengaja dinonaktifkan: nilainya 300 masih harus
disamakan dengan `CARDINALITY_LIMITS.totalSeries`, dan file config tidak boleh
mengimpor lib. Rule tetap tampil di tabel dengan status normal supaya jelas
bahwa ia ada dan belum aktif.

> Semua ambang di atas adalah **asumsi template** yang dipilih agar demo
> terlihat hidup. Jangan jadikan nilai ini paging threshold sebelum
> dikalibrasi dengan data produksi.

### State machine

```
ok ──(kondisi terpenuhi)──▶ pending ──(bertahan ≥ forMs)──▶ firing
                            │                                   │
                            └──(kondisi hilang)──▶ ok            └──(kondisi hilang)──▶ resolved
                                                                                        │
                                                                  (stateHistoryLimit)  ▼
                                                                                        ok
```

- `pending` mencegah satu sampel nyumba langsung menjadi halaman.
- `resolved` bertahan sebentar (`ALERT_EVALUATION.stateHistoryLimit`), lalu
  kembali ke `ok`.
- `since` adalah timestamp saat kondisi mulai terpenuhi, bukan saat notifikasi
  dikirim.
- Nilai metrik yang `null` (tidak terukur) menghasilkan `conditionMet: false`
  dengan `value: null` — **bukan** `0`. Tanpa aturan ini, rule seperti
  `error-budget-exhausted` (`lte 0`) akan menyala hanya karena belum ada data.

### Cooldown dan dispatch

- `cooldownMs` 30 menit: rule yang sama tidak mengirim notifikasi lagi dalam
  masa itu, meski masih `firing`.
- `maxDispatchesPerEvaluation` 5: pengaman agar satu evaluasi tidak meledakkan
  banyak permintaan jaringan.
- Kegagalan pengiriman (timeout, DNS, 5xx Slack) dicatat dan dikembalikan
  sebagai `delivered: false` + alasan; tidak pernah dilempar keluar dari lib.

### Dry-run dan Slack

- **Default aman adalah dry-run.** Tanpa `ALERT_DRY_RUN=false` eksplisit,
  tidak ada satu pun permintaan jaringan keluar. Alert hanya dievaluasi dan
  dicatat di log aplikasi.
- Untuk mengaktifkan Slack, set `ALERT_SLACK_WEBHOOK_URL` (nilai URL-nya
  sendiri tidak pernah di-log dan tidak pernah dikirim ke client;
  `channels.slackConfigured` hanya boolean) **dan** set `ALERT_DRY_RUN=false`.
- Kanal `email` ada di tipe tapi belum diimplementasikan: mengirim email butuh
  provider dan daftar penerima, dan menebak-nebak diam-diam lebih buruk
  daripada melaporkan "belum didukung".

### Kenapa in-process tidak cocok produksi

1. **Tidak ada state bersama antar instance.** Alert bisa terkirim N kali (N =
   jumlah instance), atau tidak terkirim sama sekali bila request evaluasi jatuh
   di instance yang salah. Tidak ada deduplikasi lintas instance.
2. **State hilang saat restart/deploy**, sehingga `forMs` terputus di tengah
   jalan dan alarm bisa hilang.
3. **Tidak ada grouping, inhibition, maupun silence.** Lima rule yang menyala
   bersamaan menjadi lima pesan terpisah, dan tidak ada cara membungkusnya jadi
   satu insiden.
4. **Tidak ada routing per tim** dan tidak ada integrasi dengan on-call
   schedule.
5. **Tidak ada riwayat.**Begitu `resolved` lewat masa
   `stateHistoryLimit`, jejaknya hilang; tidak ada yang bisa ditanya "berapa
   kali rule ini menyala minggu lalu".

Untuk produksi, pindahkan aturan dan ambangnya ke Alertmanager/Prometheus
(`prometheus.yml` + `rules/*.yml`), pakai dedup via label instance, dan jadikan
`src/config/alerting.ts` sebagai **dokumentasi** ambang, bukan eksekutor.

---

## 7. Golden signals dan pemetaan RED/USE

Empat golden signals (Google SRE) yang dihitung `lib/golden-signals.ts` untuk
window 1 jam:

- **Traffic** — `http.server.request.count`, rincian per route.
- **Latency** — persentil p50/p95/p99 dari `http.server.request.duration`,
  dibagi detik ke milidetik.
- **Errors** — `http.server.error.count` dan rasionya terhadap traffic.
- **Saturation** — sampel runtime terakhir (event loop lag, heap, RSS, request
  aktif, CPU, uptime).

Pemetaan ke RED dan USE:

| Golden signal | RED (Request-driven) | USE (Utilization-driven) |
| --- | --- | --- |
| Traffic | Rate of requests | — |
| Errors | Error rate | — |
| Latency | Latency | — |
| Saturation | — | Utilisation, queueing, throttling |

Batasan yang harus diingat: latency di sini mengukur waktu di lapisan Proxy
(`src/proxy.ts`), **bukan** latency end-to-end yang dilihat pengguna. Proxy
mengembalikan `NextResponse.next()` sebelum React merender, sehingga angkanya
selalu lebih kecil daripada total request time. Status error juga hanya yang
terlihat Proxy: request yang diteruskan dengan `NextResponse.next()` tercatat
200 walau render berikutnya gagal. Error render harus dicatat lewat
`onRequestError` atau `error.tsx`.

---

## 8. Retensi metrik vs retensi log

Keduanya berbeda dan tidak boleh dicampur:

- **Retensi metrik** — `src/features/observability/lib/metric-retention.ts`.
  Bentuknya masa hot/warm/cold per kelompok metrik, batas yang benar-benar dipakai
  dipakai store adalah `DEFAULT_RETENTION_MS` (7 hari). Dasar: kebutuhan
  operasional, bukan kewajiban regulasi.
- **Retensi log/audit** — `RETENTION_POLICIES` di
  `src/features/log-management/lib/storage.ts` dengan tier
  `hot | warm | cold | archive`, disposal berjenjang di
  `src/features/log-management/lib/disposal.ts`, dan jalur legal-hold.

Isi kebijakan log tidak dicantumkan di sini supaya tidak ada dua sumber
kebijakan yang bisa berbeda. Baca langsung dari folder `log-management`.

Tidak ada retensi metrics yang bisa diklaim durable: state-nya in-memory dan
hilang saat restart.

---

## 9. Tracing: yang ada bukan distributed tracing

Yang benar-benar ada:

- `src/lib/trace-context.ts` membuat, memvalidasi, dan memformat header
  `traceparent` versi W3C (format `00-<trace-id>-<span-id>-<flags>`).
- `src/proxy.ts` meneruskan `traceparent` masuk, dan mengembalikan correlation id
  lewat response header.

Yang **tidak** ada:

- Tidak ada span, tidak ada hubungan parent/child antar layanan.
- Tidak ada exporter, tidak ada collector.
- Tidak ada sampling strategy: setiap request yang lewat proxy menghasilkan
  correlation id, tidak ada yang di-drop berdasarkan aturan.

OpenTelemetry SDK **sengaja tidak dipasang**. Alasannya:

1. Tanpa collector, SDK hanya menambah dependency dan bundle size tanpa
   pernah mengirim apa pun.
2. Trace context saja sudah memberi manfaat terbesar untuk template ini
   (correlation id di log).
3. Penempatan instrumentation mengikuti kebutuhan nyata, bukan daftar paket
   default.

Untuk tracing sungguhan, minimal perlu: collector (OTLP), SDK di server dengan
propagator W3C, exporter (OTLP atau Prometheus), sampling head/tail yang
disesuaikan trafik, dan retry/buffer saat collector tidak terjangkau.

---

## 10. Gap yang perlu ditutup

1. **Multi-instance.** Butuh state bersama: time-series database, atau minimal
   sticky routing plus agregasi lintas instance.
2. **Durable storage.** Metrik harus keluar dari memori ke storage yang bertahan
   lewat restart (Prometheus, VictoriaMetrics, ClickHouse).
3. **Exporter.** Tidak ada satu pun metrik yang keluar dari proses.
4. **Sampling strategy.** Semua request diinstrumentasi; belum ada sampling head
   atau tail, jadi volume akan memblaster saat trafik naik.
5. **Deteksi anomali berbasis ML.** Yang ada baru UEBA berbasis aturan
   (`src/features/ueba/`) untuk perilaku aktor, bukan anomali metrik.
6. **Koreksi status error render** lewat `onRequestError`, supaya
   `http.server.error.count` tidak hanya melihat error lapisan Proxy.
7. **Kalibrasi SLO dan ambang alert** dengan data produksi.
8. **Tracing**: exporter, sampling, dan retensi span.

---

## 11. Testing

Menjalankan seluruh test observability:

```bash
npx vitest run src/features/observability
```

Yang diuji, per berkas:

| Berkas test | Fokus |
| --- | --- |
| `store.test.ts` | batas 5000 event, pruning retensi, counter/histogram, reset. |
| `cardinality.test.ts` | `buildSeriesKey`, pelipatan tag ke `_other`, batas per key dan jumlah key. |
| `normalize-route.test.ts` | substitusi segmen dinamis, idempotensi, truncation. |
| `slo.test.ts` | perhitungan SLI, status healthy/warning/critical, error budget, burn rate, kasus tanpa data. |
| `golden-signals.test.ts` | agregasi traffic/latency/errors per route, persentil, kasus `null` pada saturation. |
| `business-metrics.test.ts` | DAU/MAU, rasio, funnel, rate `null` bila denominator nol. |
| `alerting.test.ts` | state machine `ok → pending → firing → resolved`, cooldown, dry-run, `forMs`, `value: null`. |
| `metric-retention.test.ts` | pemilihan policy per metrik, tier berdasarkan usia, ringkasan. |

Semua fungsi entry point menerima `now` yang bisa diinjeksi, sehingga test tidak
perlu memalsukan `Date.now()`. `server-only` di-stub di `vitest.config.ts`.

---

## 12. Runbook

Satu file per rule alert, di `docs/RUNBOOKS/`:

- `docs/RUNBOOKS/error-rate-critical.md`
- `docs/RUNBOOKS/latency-p95-breach.md`
- `docs/RUNBOOKS/availability-drop.md`
- `docs/RUNBOOKS/error-budget-exhausted.md`
- `docs/RUNBOOKS/login-failure-burst.md`
- `docs/RUNBOOKS/event-loop-lag.md`
- `docs/RUNBOOKS/heap-pressure.md`
- `docs/RUNBOOKS/series-cardinality-pressure.md`

Path yang sama persis ditunjuk oleh `AlertRuleConfig.runbook` di
`src/config/alerting.ts`, jadi rule yang dipakai tidak pernah menunjuk dokumen
fiktif.
