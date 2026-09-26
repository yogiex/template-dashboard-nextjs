/**
 * Definisi SLO/SLI dan kebijakan error budget.
 *
 * CATATAN PENTING: seluruh angka target di bawah ini adalah **asumsi template**,
 * bukan SLO final. Nilainya dipilih agar dashboard terlihat hidup saat diisi
 * data demo, dan harus ditinjau ulang setelah ada data production sungguhan:
 * target yang terlalu longgar membuat SLO tidak berguna, terlalu ketat membuat
 * halaman selalu merah. Proses kalibrasi target (distribusi latensi nyata,
 * jumlah error per window, tingkat keberhasilan login) bukan bagian template.
 *
 * Semua copy Bahasa Indonesia dan hanya konstanta non-secret di file ini;
 * komponen maupun `lib/slo.ts` tidak boleh menulis string tampil inline.
 */

export type SloKey = "availability" | "latency_p95" | "error_rate" | "auth_success_rate";

export type SloComparison = "lte" | "gte";

export type SloWindow = "1h" | "24h" | "7d";

export interface SloDefinition {
  key: SloKey;
  label: string;
  description: string;
  /**
   * Nilai target dalam satuan `unit`. Untuk metrik rasio (`unit: "1"`) nilainya
   * pada rentang 0..1, bukan persen.
   */
  target: number;
  /**
   * Arah deem: `gte` berarti nilai HARUS >= target (mis. availability),
   * `lte` berarti nilai HARUS <= target (mis. error rate).
   */
  comparison: SloComparison;
  unit: string;
  window: SloWindow;
  /** Apakah SLO ini punya error budget yang bisa dihitung. */
  errorBudget: boolean;
  /**
   * `warnRatio` = porsi error budget yang boleh habis sebelum status jadi
   * `warning`. `criticalRatio` = porsi yang boleh habis sebelum status jadi
   * `critical`. Keduanya dalam rentang 0..1, dan `criticalRatio >= warnRatio`.
   */
  warnRatio: number;
  criticalRatio: number;
}

export const SLO_DEFINITIONS: Record<SloKey, SloDefinition> = {
  availability: {
    key: "availability",
    label: "Ketersediaan layanan",
    description:
      "Porsi request yang berhasil dilayani dalam 24 jam terakhir. Sumber: perbandingan request masuk dan request yang berakhir error.",
    target: 0.999,
    comparison: "gte",
    unit: "1",
    window: "24h",
    errorBudget: true,
    warnRatio: 0.5,
    criticalRatio: 1,
  },
  latency_p95: {
    key: "latency_p95",
    label: "Latensi p95",
    description:
      "Persentil ke-95 durasi pemrosesan request server dalam 1 jam terakhir. SLO ini tidak punya error budget karena latensi bukan hasil biner.",
    target: 500,
    comparison: "lte",
    unit: "ms",
    window: "1h",
    errorBudget: false,
    warnRatio: 0.5,
    criticalRatio: 1,
  },
  error_rate: {
    key: "error_rate",
    label: "Tingkat error",
    description:
      "Porsi request yang berakhir dengan status error dalam 24 jam terakhir, dibatasi oleh total request yang diterima.",
    target: 0.005,
    comparison: "lte",
    unit: "1",
    window: "24h",
    errorBudget: true,
    warnRatio: 0.5,
    criticalRatio: 1,
  },
  auth_success_rate: {
    key: "auth_success_rate",
    label: "Tingkat keberhasilan login",
    description:
      "Porsi login yang berhasil dari seluruh percobaan login dalam 24 jam terakhir.",
    target: 0.95,
    comparison: "gte",
    unit: "1",
    window: "24h",
    errorBudget: true,
    warnRatio: 0.5,
    criticalRatio: 1,
  },
};

export interface ErrorBudgetPolicy {
  windowLabel: string;
  freezeOnExhausted: boolean;
  notes: string;
}

/**
 * Kebijakan error budget. `freezeOnExhausted` sengaja `false`: template ini
 * belum punya mekanisme release freeze, jadi mengaktifkan flag tersebut hanya
 * akan menampilkan janji yang tidak dijalankan.
 */
export const ERROR_BUDGET_POLICY: ErrorBudgetPolicy = {
  windowLabel: "24 jam terakhir",
  freezeOnExhausted: false,
  notes:
    "Error budget dihitung dari event in-memory sehingga hilang saat restart. Anggaran habis berarti prioritas bergeser ke perbaikan: stabilisasi, bukan fitur baru. Angka target di halaman ini masih asumsi template dan perlu disesuaikan dengan data production.",
};

/** Urutan SLO sesuai urutan definition di atas; dipakai UI agar konsisten. */
export const SLO_ORDER = [
  "availability",
  "latency_p95",
  "error_rate",
  "auth_success_rate",
] as const satisfies readonly SloKey[];

/** Label window SLO dalam Bahasa Indonesia; `SloResult.windowLabel` memakai ini. */
export const SLO_WINDOW_LABELS: Record<SloWindow, string> = {
  "1h": "1 jam terakhir",
  "24h": "24 jam terakhir",
  "7d": "7 hari terakhir",
};

/**
 * Label step funnel login dalam Bahasa Indonesia, urut dari atas ke bawah.
 * Disimpan di config agar teks tampil tidak ditulis inline di logika
 * (AGENTS.md rule 7). Kunci `key` dipakai `lib/business-metrics.ts` untuk
 * mencocokkan event sumber; hanya step yang punya data yang dirender.
 */
export const BUSINESS_FUNNEL_STEPS: { key: string; label: string }[] = [
  { key: "attempt", label: "Percobaan login" },
  { key: "success", label: "Login berhasil" },
  { key: "mfa_challenge", label: "Tantangan MFA" },
  { key: "mfa_success", label: "MFA berhasil" },
];

/** Label status SLO dalam Bahasa Indonesia untuk layer UI. */
export const SLO_STATUS_LABELS: Record<string, string> = {
  healthy: "Sehat",
  warning: "Perlu perhatian",
  critical: "Kritis",
  unknown: "Belum ada data",
};

/** Label status dalam Bahasa Indonesia untuk ringkasan error budget. */
export const ERROR_BUDGET_STATUS_LABELS: Record<string, string> = {
  healthy: "Anggaran masih aman",
  warning: "Anggaran hampir habis",
  critical: "Anggaran habis",
  unknown: "Belum ada data",
};

/** Nama sumber metrik yang dipakai tiap SLO; dipakai untuk penjelasan UI. */
export const SLO_SOURCE_NOTES: Record<SloKey, string> = {
  availability:
    "Dihitung dari http.server.request.count dan http.server.error.count.",
  latency_p95:
    "Dihitung dari histogram http.server.request.duration, dikonversi detik ke milidetik.",
  error_rate:
    "Dihitung dari http.server.error.count dibagi http.server.request.count.",
  auth_success_rate:
    "Dihitung dari auth.login.success dibagi auth.login.attempt.",
};
