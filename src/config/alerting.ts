/**
 * Definisi alert rule dan parameter mesin alert.
 *
 * CATATAN PENTING — ini template **in-process**, bukan sistem alerting produksi.
 *
 * `src/features/observability/lib/alerting.ts` menyimpan state alert di
 * `globalThis` milik satu proses Node.js. Konsekuensinya:
 *
 * - Berjalan di multi-instance (Vercel, Kubernetes, beberapa worker) berarti
 *   setiap instance punya state sendiri: alarm bisa terkirim N kali, atau
 *   tidak terkirim sama sekali kalau request Evaluation jatuh di instance yang
 *   salah. Tidak ada deduplikasi lintas instance dan tidak ada persistensi.
 * - State hilang saat restart/deploy, sehingga `forMs` terputus di tengah jalan.
 * - Tidak ada inhibition, grouping, silence, atau routing per tim.
 *
 * Untuk produksi, aturan dan ambang di bawah harus dipindahkan ke Alertmanager
 * atau Prometheus (`prometheus.yml` + `rules/*.yml` + Alertmanager) dengan
 * dedup via instance label dan grouping per `alertname`. File ini lalu berubah
 * menjadi **dokumentasi** ambang yang dipakai, bukan eksekutor.
 *
 * Angka ambang di bawah dipilih agar dashboard demo terlihat hidup. Semuanya
 * perlu dikalibrasi ulang setelah ada data production sungguhan; jangan jadikan
 * nilai ini paging threshold tanpa penyesuaian.
 *
 * Seluruh file ini hanya berisi konstanta non-secret dan copy Bahasa
 * Indonesia. Tidak ada I/O, tidak ada pembacaan `process.env` di sini — nama
 * key env ada di `ALERT_ENV_KEYS`, nilainya dibaca lib.
 */

export type AlertSeverity = "critical" | "warning" | "info";

export type AlertChannel = "slack" | "email" | "log" | "none";

export type AlertComparison = "gt" | "gte" | "lt" | "lte";

export interface AlertRuleConfig {
  /** Id stabil kebab-case; dipakai sebagai kunci state dan di URL. */
  id: string;
  name: string;
  description: string;
  severity: AlertSeverity;
  /**
   * Kanal tujuan notifikasi. `email` sengaja ada di tipe tapi belum
   * diimplementasikan di lib: mengirim email butuh provider + daftar
   * penerima, dan menebak-nebak diam-diam lebih buruk daripada openly
   * reporting "belum didukung".
   */
  channel: AlertChannel;
  /**
   * Lama kondisi harus terus terpenuhi sebelum alarm naik ke `firing`.
   * Ini yang mencegah satu sampel nyumba jadi halaman. `0` berarti tanpa
   * jeda (setara `for: 0m` di Prometheus).
   */
  forMs: number;
  comparison: AlertComparison;
  /** Ambang dalam satuan `unit`. Untuk metrik rasio nilainya 0..1, bukan persen. */
  threshold: number;
  unit: string;
  /**
   * Path(runbook) yang harus dibaca sebelum menangani alarm. Path di bawah
   * memakai bentuk kanonik `docs/RUNBOOKS/<id>.md`; berkas-berkas itu
   * dibuat oleh agent lain (dokumentasi runbook), bukan oleh file konfigurasi
   * ini. Tapi rule yang dipakai tidak boleh menunjuk dokumen fiktif, jadi
   * kalau `docs/RUNBOOKS/` belum ada, path itu adalah kontrak yang harus
   * dipenuhi, bukan tautan yang sudah hidup.
   */
  runbook: string;
  enabled: boolean;
}

/**
 * Window 15 menit untuk rasio `auth.login.failure / auth.login.attempt`.
 * Dipakai lib, bukan ditulis inline di situ supaya hanya ada satu sumber.
 */
export const ALERT_LOGIN_BURST_WINDOW_MS = 15 * 60 * 1000;

export const ALERT_RULES: AlertRuleConfig[] = [
  {
    id: "error-rate-critical",
    name: "Tingkat error melonjak",
    description:
      "Lebih dari 5% request yang diterima server berakhir dengan status error dalam 1 jam terakhir. Sumber: golden signals `errors.rate`.",
    severity: "critical",
    channel: "slack",
    forMs: 5 * 60 * 1000,
    comparison: "gt",
    threshold: 0.05,
    unit: "1",
    runbook: "docs/RUNBOOKS/error-rate-critical.md",
    enabled: true,
  },
  {
    id: "latency-p95-breach",
    name: "Latensi p95 melewati ambang",
    description:
      "Persentil ke-95 durasi request server melewati 1000 ms dalam 1 jam terakhir. Sumber: golden signals `latency.overall.p95Ms`.",
    severity: "warning",
    channel: "slack",
    forMs: 2 * 60 * 1000,
    comparison: "gt",
    threshold: 1_000,
    unit: "ms",
    runbook: "docs/RUNBOOKS/latency-p95-breach.md",
    enabled: true,
  },
  {
    id: "availability-drop",
    name: "Ketersediaan layanan turun",
    description:
      "Porsi request yang berhasil dilayani turun ke 99% atau lebih rendah dalam 24 jam terakhir. Sumber: ringkasan error budget `availability`.",
    severity: "critical",
    channel: "slack",
    forMs: 5 * 60 * 1000,
    comparison: "lte",
    threshold: 0.99,
    unit: "1",
    runbook: "docs/RUNBOOKS/availability-drop.md",
    enabled: true,
  },
  {
    id: "error-budget-exhausted",
    name: "Error budget habis",
    description:
      "Sisa error budget SLO ketersediaan sudah 0 dalam 24 jam terakhir. Sumber: ringkasan error budget `errorBudgetRemaining`.",
    severity: "critical",
    channel: "slack",
    forMs: 60 * 1000,
    comparison: "lte",
    threshold: 0,
    unit: "1",
    runbook: "docs/RUNBOOKS/error-budget-exhausted.md",
    enabled: true,
  },
  {
    id: "login-failure-burst",
    name: "Burst login gagal",
    description:
      "Lebih dari 30% percobaan login gagal dalam 15 menit terakhir. Rasio `auth.login.failure` dibagi `auth.login.attempt`; pola ini indikator awal credential stuffing.",
    severity: "warning",
    channel: "slack",
    forMs: 2 * 60 * 1000,
    comparison: "gt",
    threshold: 0.3,
    unit: "1",
    runbook: "docs/RUNBOOKS/login-failure-burst.md",
    enabled: true,
  },
  {
    id: "event-loop-lag",
    name: "Event loop macet",
    description:
      "Penundaan event loop Node.js melewati 100 ms. Ini membuat semua request/antrian dalam proses ikut lambat, bukan cuma satu handler. Sumber: golden signals `saturation.eventLoopLagMs`.",
    severity: "warning",
    channel: "log",
    forMs: 5 * 60 * 1000,
    comparison: "gt",
    threshold: 100,
    unit: "ms",
    runbook: "docs/RUNBOOKS/event-loop-lag.md",
    enabled: true,
  },
  {
    id: "heap-pressure",
    name: "Tekanan memori heap",
    description:
      "Rasio heap terpakai terhadap RSS melewati 0,85. Indikasi memory leak sebelum proses kena OOM. Sumber: golden signals `saturation.heapUsedBytes` dibagi `rssBytes`.",
    severity: "info",
    channel: "log",
    forMs: 10 * 60 * 1000,
    comparison: "gt",
    threshold: 0.85,
    unit: "1",
    runbook: "docs/RUNBOOKS/heap-pressure.md",
    enabled: true,
  },
  {
    // Sengaja `enabled: false`: ambangnya masih harus disamakan dengan
    // CARDINALITY_LIMITS.totalSeries (300), dan file konfigurasi tidak boleh
    // mengimpor lib. Selama menunggu penyelarasan itu, rule tetap tampil di
    // snapshot dengan state `ok` supaya jelas bahwa ia ada dan belum aktif.
    id: "series-cardinality-pressure",
    name: "Jumlah series metric membengkak",
    description:
      "Jumlah series unik melewati 300. Values sementara belum disamakan dengan CARDINALITY_LIMITS.totalSeries, jadi rule ini sengaja dinonaktifkan sampai ada backend time-series sungguhan.",
    severity: "info",
    channel: "none",
    forMs: 15 * 60 * 1000,
    comparison: "gt",
    threshold: 300,
    unit: "1",
    runbook: "docs/RUNBOOKS/series-cardinality-pressure.md",
    enabled: false,
  },
];

/**
 * Parameter mesin alert. `forMs` per rule ada di `ALERT_RULES`; yang di sini
 * adalah perilaku lintas rule.
 */
export const ALERT_EVALUATION: {
  /** Jarak antar evaluasi yang wajar saat dipanggil dari interval server. */
  intervalMs: number;
  /**
   * Lama state `resolved` bertahan sebelum otomatis kembali ke `ok`. Angka ini
   * juga membatasi pertumbuhan state: entry yang sudah lama dibuang.
   */
  stateHistoryLimit: number;
  /** Jeda minimal sebelum rule yang sama boleh mengirim notifikasi lagi. */
  cooldownMs: number;
  /** Pengaman: maksimal notifikasi yang dikirim dalam satu kali evaluasi. */
  maxDispatchesPerEvaluation: number;
} = {
  intervalMs: 60_000,
  stateHistoryLimit: 5 * 60 * 1000,
  cooldownMs: 30 * 60 * 1000,
  maxDispatchesPerEvaluation: 5,
};

/**
 * Nama key environment untuk alerting. Hanya nama, bukan nilai: file config
 * tidak pernah menyentuh `process.env` dan tidak boleh menulis secret.
 *
 * `ALERT_SLACK_WEBHOOK_URL` tidak pernah di-log dan tidak pernah dikembalikan
 * ke client — URL webhook Slack pada dasarnya bearer token.
 */
export const ALERT_ENV_KEYS: {
  slackWebhookUrl: string;
  alertDryRun: string;
} = {
  slackWebhookUrl: "ALERT_SLACK_WEBHOOK_URL",
  alertDryRun: "ALERT_DRY_RUN",
};

/**
 * Template ringkasan alarm. Nilai `{value}` diisi lib; saat nilai metrik `null`
 * (tidak terukur) lib memilih `ALERT_SUMMARY_WITHOUT_VALUE` supaya halaman
 * tidak pernah menampilkan angka palsu.
 */
export const ALERT_SUMMARY_FORMATS = {
  withValue: "[{severity}] {name}: {value} {unit} (ambang {threshold} {unit}).",
  withoutValue: "[{severity}] {name}: melewati ambang {threshold} {unit}, nilai tidak terukur.",
  resolved: "[{severity}] {name}: kondisi sudah normal kembali.",
} as const;

/** Label Bahasa Indonesia untuk layer UI. */
export const ALERT_SEVERITY_LABELS: Record<AlertSeverity, string> = {
  critical: "Kritis",
  warning: "Perlu perhatian",
  info: "Informasi",
};

export const ALERT_CHANNEL_LABELS: Record<AlertChannel, string> = {
  slack: "Slack webhook",
  email: "Email (belum diimplementasikan)",
  log: "Log aplikasi",
  none: "Tidak ada kanal",
};

export const ALERT_STATE_LABELS: Record<string, string> = {
  ok: "Normal",
  pending: "Menunggu konfirmasi",
  firing: "Aktif",
  resolved: "Sudah normal",
};

/** Alasan pengiriman yang gagal; dipakai UI untuk menjelaskan, bukan error. */
export const ALERT_DELIVERY_REASON_LABELS: Record<string, string> = {
  "dry-run": "Mode dry-run aktif, tidak ada permintaan jaringan.",
  "not-configured": "Kanal belum dikonfigurasi di environment.",
  "channel-disabled": "Kanal rule ini sengaja dimatikan.",
  "channel-not-implemented": "Kanal ini belum diimplementasikan di template.",
  "cooldown": "Masih dalam masa cooldown rule.",
  "dispatch-limit": "Batas dispatch per evaluasi sudah tercapai.",
  "request-failed": "Permintaan ke kanal gagal atau timeout.",
  logged: "Tercatat di log aplikasi.",
};
