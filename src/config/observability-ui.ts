/**
 * Blok copy BARU + helper format angka untuk layer UI observability.
 *
 * Kenapa file ini ada: `src/config/observability.ts`, `src/config/slo.ts`, dan
 * `src/config/alerting.ts` sudah punya entry copy yang lengkap untuk entry
 * yang mereka就叫, dan file-file itu **tidak boleh diubah** oleh lapisan UI.
 * Yang belum punya copy adalah panel baru (golden signals, error budget, SLO,
 * saturasi, alert, kesehatan store, metrik bisnis). Supaya tidak menulis
 * kalimat panjang inline di komponen — aturan AGENTS.md "Copy user-facing dari
 * `src/config/`" — semua kalimat itu dikumpulkan di sini sebagai satu blok
 * copy baru, dan komponen hanya memilih key yang mereka pakai.
 *
 * Yang SENGAJA tidak ada di sini: angka ambang, target SLO, batas cardinality,
 * dan label status. Semua itu sudah tinggal di config/lib yang jadi satu
 * sumber kebenaran (`SLO_STATUS_LABELS`, `ALERT_SEVERITY_LABELS`,
 * `ALERT_STATE_LABELS`, `ERROR_BUDGET_STATUS_LABELS`, `CARDINALITY_LIMITS`,
 * `METRIC_DESCRIPTIONS`). File ini hanya menambah yang belum ada.
 *
 * Import Restrictions: modul ini murni data + fungsi format, tanpa
 * `"use client"` dan tanpa import server-only, jadi aman dipakai dari Server
 * Component mana pun.
 */

/** Label pendek yang belum tersedia di config man pun. */
export const OBSERVABILITY_UI_COPY = {
  common: {
    /** Nilai metrik tidak ada; nol berarti "terukur nol". */
    unmeasured: "Tidak terukur",
    /** Metric key yang belum punya deskripsi di `METRIC_DESCRIPTIONS`. */
    unknownMetric: "Metrik tidak dikenal",
    ratioUnit: "rasio",
    refresh: {
      label: "Muat ulang",
      pending: "Memuat...",
      ariaLabel: "Muat ulang data observability",
    },
  },
  empty: {
    title: "Belum ada data observability",
    description:
      "Semua angka di halaman ini dihitung dari event store in-memory. Isi data demo atau lakukan beberapa aksi (buka halaman, login, jalankan Server Action) lalu muat ulang.",
  },
  goldenSignals: {
    title: "Golden signals",
    description:
      "Empat sinyal inti versi Google SRE (traffic, latency, errors, saturation) untuk 1 jam terakhir.",
    trafficTitle: "Traffic",
    trafficHint: "Request yang diterima server.",
    latencyTitle: "Latency",
    latencyHint: "Persentil durasi request server.",
    errorsTitle: "Errors",
    errorsHint: "Request yang berakhir dengan status error.",
    saturationTitle: "Saturasi",
    saturationHint: "Ringkasan kondisi proses; detail lengkap ada di panel saturasi.",
    requestsLabel: "Request",
    routesLabel: "Route teratas",
    errorRateLabel: "Tingkat error",
    p50: "p50",
    p95: "p95",
    p99: "p99",
    eventLoopLagLabel: "Event loop lag",
    heapUsedLabel: "Heap terpakai",
    routesEmpty: "Belum ada route yang tercatat.",
    noData: "Belum ada data request pada 1 jam terakhir.",
  },
  errorBudget: {
    title: "Error budget",
    description:
      "Sisa anggaran kesalahan untuk SLO ketersediaan. Angka target masih asumsi template dan harus dikalibrasi ulang dengan data produksi.",
    remainingLabel: "Sisa error budget",
    consumedLabel: "Anggaran terpakai",
    availabilityLabel: "Ketersediaan",
    errorsLabel: "Error",
    totalLabel: "Total request",
    windowLabel: "Window",
    evaluatedAtLabel: "Dievaluasi",
    noDataNote:
      "Belum ada request tercatat, jadi error budget tidak dapat dihitung. Ini bukan berarti anggaran masih utuh.",
  },
  slo: {
    title: "SLO dan SLI",
    description:
      "Target SLO dari event in-memory. Semua status `unknown` sampai ada data di window terkait.",
    columns: {
      objective: "Indikator",
      status: "Status",
      value: "Nilai",
      target: "Target",
      window: "Window",
      burnRate: "Burn rate",
      budget: "Sisa budget",
    },
    targetPrefix: "Target",
    comparisonLte: "maks",
    comparisonGte: "min",
    noBudget: "Tidak ada",
    burnRateHint:
      "Burn rate di sini satu window, bukan multi-window burn rate Prometheus: 1,0 berarti anggaran terbakar seiring waktu berjalan.",
  },
  saturation: {
    title: "Saturasi runtime",
    description:
      "Kondisi proses Node.js dari event runtime terakhir dalam 1 jam. Kolom tanpa event menampilkan status tidak terukur, bukan nol.",
    eventLoopLagLabel: "Event loop lag",
    heapUsedLabel: "Heap terpakai",
    rssLabel: "Resident set (RSS)",
    activeRequestsLabel: "Request aktif",
    cpuUserLabel: "CPU user",
    uptimeLabel: "Uptime proses",
    noDataNote:
      "Belum ada event runtime di store, jadi semua kolom tidak terukur. Angka muncul setelah instrumentation mengirim sampel.",
  },
  alerts: {
    title: "Alert rules",
    description:
      "Mesin alert in-process dengan state machine ok → pending → firing → resolved. Bukan sistem paging produksi.",
    columns: {
      rule: "Rule",
      severity: "Severity",
      state: "State",
      value: "Nilai",
      since: "Sejak",
      runbook: "Runbook",
    },
    dryRunNote:
      "Mode dry-run aktif: notifikasi tidak dikirim, hanya dievaluasi dan dicatat.",
    slackMissingNote:
      "Slack webhook belum dikonfigurasi, jadi rule dengan kanal Slack tidak bisa mengirim apa pun.",
    dryRunTitle: "Kanal notifikasi",
    slackMissingTitle: "Slack webhook",
    runbookNote: "Dokumen runbook ada di repository pada path di bawah.",
    valuePrefix: "Nilai",
    thresholdPrefix: "Ambang",
    stateSummary: "Ringkasan",
    firing: "Aktif",
    pending: "Menunggu",
    ok: "Normal",
  },
  storeHealth: {
    title: "Kesehatan store metrik",
    description:
      "Kondisi event store in-memory: jumlah event, umur data, cardinality, dan kebijakan retensi metrik.",
    totalEventsLabel: "Total event",
    oldestEventLabel: "Event terlama",
    topMetricsLabel: "Metrik teratas",
    topMetricsHint: "Jumlah event dan jumlah series unik per metrik.",
    eventsLabel: "Event",
    seriesLabel: "Series",
    cardinalityTitle: "Batas cardinality",
    perTagLabel: "Nilai unik per key",
    maxTagKeysLabel: "Jumlah key maksimum",
    totalSeriesLabel: "Series maksimum",
    retentionTitle: "Retensi metrik",
    retentionDaysLabel: "Batas retensi store",
    retentionTierUnit: "hari (hot/warm/cold)",
    retentionVolatileNote:
      "Seluruh state ini volatile: hilang setiap restart atau deploy, jadi jangan dibaca sebagai retensi durable.",
    volatileNote:
      "State in-memory: seluruh angka hilang saat proses restart, dan tidak durable.",
    emptyEvents: "Belum ada event tercatat.",
    noOldestEvent: "Belum ada event.",
  },
  business: {
    title: "Metrik bisnis",
    description:
      "DAU/MAU berbasis aktivitas login, tingkat keberhasilan login dan MFA, serta funnel login. Bukan pengguna aktif produk keseluruhan.",
    dauLabel: "DAU (aktor login 24 jam)",
    mauLabel: "MAU (aktor login 30 hari)",
    ratioLabel: "Rasio DAU/MAU",
    authSuccessLabel: "Keberhasilan login",
    mfaSuccessLabel: "Keberhasilan MFA",
    funnelLabel: "Funnel login",
    funnelHint:
      "Jumlah event per tahap login. Tahap tanpa event tidak ditampilkan, bukan diisi nol.",
    empty: "Belum ada aktivitas login yang tercatat.",
  },
} as const;

const NUMBER_LOCALE = "id-ID";

/**
 * Format angka sesuai satuan metrik, bukan per baris tabel.
 *
 * `unit: "1"` ambigu di model metrik template ini: dipakai untuk rasio
 * (0.05 = 5%) sekaligus untuk count (300 series). Nilainya dibedakan lewat
 * besaran: rasio selalu 0..1, sedangkan count integer di atas 1. Ini
 * penyederhanaan yang disengaja dan hanya berlaku di layer tampilan.
 *
 * Satuan `"count"` dipakai komponen ketika nilainya pasti count (mis. jumlah
 * request atau request aktif) sehingga `0` tidak pernah dirender sebagai
 * "0,00%".
 */
export function formatByUnit(value: number, unit: string): string {
  if (!Number.isFinite(value)) {
    return OBSERVABILITY_UI_COPY.common.unmeasured;
  }

  switch (unit) {
    case "1":
      return Math.abs(value) <= 1
        ? `${(value * 100).toFixed(2)}%`
        : Math.round(value).toLocaleString(NUMBER_LOCALE);
    case "ms":
      return `${formatNumber(value, 1)} ms`;
    case "s":
      return formatDurationSeconds(value);
    case "By":
      return formatBytes(value);
    case "USD":
      return `$${formatNumber(value, 2)}`;
    default:
      return formatNumber(value, 2);
  }
}

function formatNumber(value: number, digits: number): string {
  return value.toLocaleString(NUMBER_LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

/** Durasi dalam detik: detik, menit, atau jam — depending besarannya. */
function formatDurationSeconds(seconds: number): string {
  if (seconds >= 3_600) {
    return `${formatNumber(seconds / 3_600, 1)} jam`;
  }

  if (seconds >= 60) {
    return `${formatNumber(seconds / 60, 1)} mnt`;
  }

  return `${formatNumber(seconds, 0)} s`;
}

const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

function formatBytes(bytes: number): string {
  let scaled = Math.abs(bytes);
  let unitIndex = 0;

  while (scaled >= 1024 && unitIndex < BYTE_UNITS.length - 1) {
    scaled /= 1024;
    unitIndex += 1;
  }

  const sign = bytes < 0 ? "-" : "";

  return `${sign}${formatNumber(scaled, unitIndex === 0 ? 0 : 1)} ${BYTE_UNITS[unitIndex]}`;
}

/** Format ISO timestamp menjadi string lokal, atau fallback saat null/invalid. */
export function formatTimestamp(value: string | null, fallback: string): string {
  if (!value) {
    return fallback;
  }

  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    return fallback;
  }

  return new Date(timestamp).toLocaleString("id-ID");
}

/** Nilai 0..1 sebagai persentase bulat, di-clamp supaya tidak > 100. */
export function toPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, value * 100));
}

/** Nada warna status, dipetakan ke token semantic `risk-*` yang ada. */
export type StatusTone = "healthy" | "warning" | "critical" | "unknown";

export const STATUS_BADGE_CLASS: Record<StatusTone, string> = {
  healthy: "bg-risk-low/10 text-risk-low",
  warning: "bg-risk-medium/10 text-risk-medium",
  critical: "bg-risk-critical/10 text-risk-critical",
  unknown: "bg-muted text-muted-foreground",
};

export const STATUS_TEXT_CLASS: Record<StatusTone, string> = {
  healthy: "text-risk-low",
  warning: "text-risk-medium",
  critical: "text-risk-critical",
  unknown: "text-muted-foreground",
};
