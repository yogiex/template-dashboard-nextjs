/**
 * Perhitungan SLO/SLI, error budget, dan burn rate dari event store in-memory.
 *
 * Prinsip yang dipegang file ini:
 *
 * 1. **Jangan pernah melaporkan "sehat" saat tidak ada data.** Tanpa data,
 *    status selalu `unknown` dan angka turunan bernilai `null`. Ini kesalahan
 *    paling umum di dashboard SLO: layanan yang tidak terpantau terlihat
 *    "100% sehat" hanya karena tidak ada metrik sama sekali.
 * 2. **Angka tidak pernah di-hardcode di sini.** Target, ambang status, dan
 *    seluruh copy user-facing berasal dari `src/config/slo.ts`.
 * 3. **Fungsi tidak pernah melempar exception** dan deterministik terhadap
 *    parameter `now`, sehingga bisa diuji tanpa memalsukan `Date.now()`.
 *
 * Keterbatasan yang perlu diketahui pembaca: data berasal dari store in-memory
 * (maks 5000 event, retensi 7 hari) yang hilang saat restart. Angka di sini
 * bukan SLA produksi dan tidak pernah layak dipakai sebagai dasar kontrak
 * dengan pengguna.
 */

import {
  ERROR_BUDGET_POLICY,
  SLO_DEFINITIONS,
  SLO_ORDER,
  SLO_WINDOW_LABELS,
  type SloDefinition,
  type SloKey,
} from "@/config/slo";
import { getWindowMs } from "@/features/observability/lib/aggregate";
import { METRIC_NAMES } from "@/features/observability/lib/constants";
import { getEvents } from "@/features/observability/lib/store";

export type SloStatus = "healthy" | "warning" | "critical" | "unknown";

export interface SloResult {
  key: SloKey;
  label: string;
  description: string;
  status: SloStatus;
  /** Nilai SLI terukur dalam satuan `unit`; 0 bila tidak ada data. */
  value: number;
  target: number;
  comparison: "lte" | "gte";
  unit: string;
  /** Kode window seperti di config, contoh: `24h`. */
  window: string;
  /** Window versi Bahasa Indonesia, contoh: `24 jam terakhir`. */
  windowLabel: string;
  /** `value / target`; > 1 berarti lebih baik dari target untuk SLO `gte`. */
  observedRatio: number;
  /**
   * Kecepatan pembakaran error budget dibanding laju normal: 1.0 berarti
   * budget terpakai seiring waktu yang berjalan, > 1 berarti lebih cepat dari
   * seharusnya. Pendekatan sederhana satu window, bukan multi-window burn rate
   * milik Prometheus.
   */
  burnRate: number;
  /** Sisa error budget 0..1; `null` bila SLO ini tidak punya error budget. */
  errorBudgetRemaining: number | null;
}

export interface ErrorBudgetSummary {
  status: SloStatus;
  availability: number;
  errorBudgetRemaining: number;
  budgetConsumedRatio: number;
  errors: number;
  total: number;
  windowLabel: string;
  evaluatedAt: string;
  /**
   * `false` berarti tidak ada data request sama sekali. Saat `false`, angka
   * `availability`, `errorBudgetRemaining`, dan `budgetConsumedRatio` tidak
   * bermakna — UI wajib menampilkan empty state, bukan angka.
   */
  hasData: boolean;
}

const DIGITS = 4;
const MS_DIGITS = 2;

function clamp01(value: number): number {
  if (Number.isNaN(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits = DIGITS): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const factor = 10 ** digits;

  return Math.round(value * factor) / factor;
}

function safeRatio(numerator: number, denominator: number): number | null {
  if (denominator <= 0) {
    return null;
  }

  return numerator / denominator;
}

function percentileOf(values: number[], percentile: number): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);

  // Mengikuti sampling `summarize()` di `lib/aggregate.ts` supaya p95 SLO dan
  // kartu latensi di halaman observability tidak berbeda angka.
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * percentile))] ?? 0;
}

/**
 * Sisa error budget untuk satu SLI rasio.
 *
 * SLI rasio selalu punya "porsi yang diperbolehkan gagal" (budget):
 * - `gte` (mis. availability, target 0.999): porsi gagal yang diizinkan adalah
 *   `1 - target`. Terpakai = `(1 - value) - (1 - target)`, jadi
 *   `remaining = 1 - terpakai / (1 - target) = (value - target) / (1 - target)`.
 *   value = 1 (semua sukses) -> 1 (budget utuh); value = 0 (semua gagal) -> 0.
 * - `lte` (mis. error rate, target 0.005): nilai itu sendiri adalah porsi
 *   buruk dan `target` adalah batas yang diizinkan, jadi
 *   `remaining = 1 - value / target`.
 *
 * Kedua bentuk di-clamp ke 0..1: melewati target berarti anggaran habis (0),
 * dan nilai di bawah nol tidak mungkin terjadi pada data yang masuk akal.
 */
function errorBudgetRemaining(definition: SloDefinition, value: number): number {
  if (definition.comparison === "lte") {
    if (definition.target <= 0) {
      // Target nol tidak menyisakan budget: error sekecil apa pun berarti habis.
      return value > 0 ? 0 : 1;
    }

    return clamp01(1 - (safeRatio(value, definition.target) ?? 1));
  }

  if (definition.target >= 1) {
    // Target 100% tidak menyisakan ruang error budget; value 1 dianggap utuh.
    return value >= 1 ? 1 : 0;
  }

  return clamp01(safeRatio(value - definition.target, 1 - definition.target) ?? 0);
}

/** Porsi error budget yang sudah terpakai, 0..1+. */
function budgetConsumedRatio(definition: SloDefinition, value: number): number {
  if (!definition.errorBudget) {
    return 0;
  }

  return clamp01(1 - errorBudgetRemaining(definition, value));
}

/**
 * Seberapa jauh nilai melewati target dalam satuan "error budget penuh".
 * Dipakai untuk SLO tanpa error budget (latensi): 0.5 berarti 50% lebih lambat
 * dari target, 0 berarti tepat di target atau lebih baik.
 */
function deviationRatio(definition: SloDefinition, value: number): number {
  if (definition.comparison === "lte") {
    return Math.max(0, safeRatio(value - definition.target, definition.target) ?? 0);
  }

  if (definition.target <= 0) {
    return 0;
  }

  return Math.max(0, safeRatio(definition.target - value, definition.target) ?? 0);
}

function statusForRatio(definition: SloDefinition, ratio: number): SloStatus {
  if (!Number.isFinite(ratio) || ratio < 0) {
    return "unknown";
  }

  if (ratio >= definition.criticalRatio) {
    return "critical";
  }

  if (ratio >= definition.warnRatio) {
    return "warning";
  }

  return "healthy";
}

/**
 * Status satu SLO dari nilai SLI-nya saja (window dianggap penuh, jadi
 * `fractionOfWindowElapsed = 1`).
 */
export function sloStatusFor(
  definition: SloDefinition,
  value: number,
): SloStatus {
  if (!Number.isFinite(value)) {
    return "unknown";
  }

  const ratio = definition.errorBudget
    ? budgetConsumedRatio(definition, value)
    : deviationRatio(definition, value);

  return statusForRatio(definition, ratio);
}

type WindowStats = {
  requests: number;
  errors: number;
  /** Durasi request dalam detik, apa adanya seperti yang disimpan event. */
  durations: number[];
  loginAttempts: number;
  loginSuccesses: number;
  /** Timestamp event tertua di dalam window; dipakai untuk burn rate. */
  earliestTimestamp: number | null;
  /** Jumlah event apa pun di dalam window. */
  eventCount: number;
};

function readWindowStats(windowMs: number, now: number): WindowStats {
  const fromTimestamp = now - windowMs;
  const events = getEvents({ fromTimestamp, toTimestamp: now });
  const durations: number[] = [];
  let requests = 0;
  let errors = 0;
  let loginAttempts = 0;
  let loginSuccesses = 0;
  let earliestTimestamp: number | null = null;

  for (const event of events) {
    const timestamp = Date.parse(event.timestamp);

    if (Number.isNaN(timestamp)) {
      continue;
    }

    earliestTimestamp =
      earliestTimestamp === null ? timestamp : Math.min(earliestTimestamp, timestamp);

    switch (event.name) {
      case METRIC_NAMES.HTTP_SERVER_REQUEST_COUNT:
        requests += event.value;
        break;
      case METRIC_NAMES.HTTP_SERVER_ERROR_COUNT:
        errors += event.value;
        break;
      case METRIC_NAMES.HTTP_SERVER_REQUEST_DURATION:
        durations.push(event.value);
        break;
      case METRIC_NAMES.LOGIN_ATTEMPT:
        loginAttempts += event.value;
        break;
      case METRIC_NAMES.LOGIN_SUCCESS:
        loginSuccesses += event.value;
        break;
      default:
        break;
    }
  }

  return {
    requests,
    errors,
    durations,
    loginAttempts,
    loginSuccesses,
    earliestTimestamp,
    eventCount: events.length,
  };
}

type SloMeasurement = {
  value: number;
  hasData: boolean;
};

function measure(
  key: SloKey,
  stats: WindowStats,
): SloMeasurement {
  switch (key) {
    case "availability": {
      const rate = safeRatio(stats.errors, stats.requests);

      return {
        hasData: rate !== null,
        value: rate === null ? 0 : clamp(1 - rate, 0, 1),
      };
    }
    case "error_rate": {
      const rate = safeRatio(stats.errors, stats.requests);

      return {
        hasData: rate !== null,
        value: rate === null ? 0 : clamp(rate, 0, 1),
      };
    }
    case "latency_p95": {
      // Histogram OTel untuk durasi disimpan dalam detik; SLO ini dalam ms.
      const secondsToMs = stats.durations.map((value) => value * 1_000);

      return {
        hasData: secondsToMs.length > 0,
        value: round(percentileOf(secondsToMs, 0.95), MS_DIGITS),
      };
    }
    case "auth_success_rate": {
      const rate = safeRatio(stats.loginSuccesses, stats.loginAttempts);

      return {
        hasData: rate !== null,
        value: rate === null ? 0 : clamp(rate, 0, 1),
      };
    }
    default:
      return { hasData: false, value: 0 };
  }
}

/**
 * Burn rate sederhana: `(1 - remaining) / fractionOfWindowElapsed`.
 *
 * `fractionOfWindowElapsed` = porsi window yang benar-benar sudah terisi data,
 * di-clamp ke rentang `[0.01, 1]`. Untuk window penuh nilainya 1.0 sehingga
 * burnRate = porsi budget yang terpakai. Kalau data baru muncul di 10 menit
 * terakhir dari window 24 jam, burn rate melonjak karena budget yang sama
 * dibakar jauh lebih cepat dari jadwalnya.
 *
 * Catatan: ini **bukan** multi-window burn rate seperti di Prometheus
 * (short window + long window dengan bobot eksponensial). Pendekatan satu
 * window ini lebih sederhana tapi lebih berisik: satu request error tunggal di
 * awal window bisa menaikkan status. Jangan jadikan ini paging threshold tanpa
 * penyesuaian.
 */
function burnRateFor(
  definition: SloDefinition,
  value: number,
  hasData: boolean,
  windowMs: number,
  earliestTimestamp: number | null,
  now: number,
): number {
  if (!hasData) {
    return 0;
  }

  if (!definition.errorBudget) {
    return round(deviationRatio(definition, value));
  }

  const span = earliestTimestamp === null ? windowMs : now - earliestTimestamp;
  const fractionOfWindowElapsed = clamp(span / windowMs, 0.01, 1);
  const consumed = budgetConsumedRatio(definition, value);

  return round(consumed / fractionOfWindowElapsed);
}

function buildResult(
  definition: SloDefinition,
  measurement: SloMeasurement,
  stats: WindowStats,
  now: number,
): SloResult {
  const { hasData, value } = measurement;
  const windowMs = getWindowMs(definition.window);
  const burnRate = burnRateFor(
    definition,
    value,
    hasData,
    windowMs,
    stats.earliestTimestamp,
    now,
  );

  return {
    key: definition.key,
    label: definition.label,
    description: definition.description,
    // Untuk SLO ber-anggaran, `burnRate` sudah mencakup porsi budget yang
    // terpakai; untuk SLO latensi, `burnRate` berisi deviasi relatif terhadap
    // target. Keduanya dimensionless sehingga ambang config bisa dipakai sama.
    status: hasData ? statusForRatio(definition, burnRate) : "unknown",
    value: definition.unit === "1" ? round(value, 6) : value,
    target: definition.target,
    comparison: definition.comparison,
    unit: definition.unit,
    window: definition.window,
    windowLabel: SLO_WINDOW_LABELS[definition.window],
    observedRatio: round(safeRatio(value, definition.target) ?? 0),
    burnRate,
    errorBudgetRemaining: definition.errorBudget && hasData
      ? round(errorBudgetRemaining(definition, value), 6)
      : null,
  };
}

/**
 * Semua SLO template, diurutkan sesuai `SLO_ORDER`.
 *
 * SLO dengan window 24h dan 1h dihitung dari event yang jatuh di dalam window
 * masing-masing, bukan dari counter kumulatif atau histogram seluruh store —
 * `summarize()`/`getCounters()` tidak bisa difilter per window.
 */
export function computeSlos(now: number = Date.now()): SloResult[] {
  const statsCache = new Map<number, WindowStats>();

  const statsFor = (window: SloDefinition["window"]): WindowStats => {
    const cached = statsCache.get(getWindowMs(window));

    if (cached) {
      return cached;
    }

    const stats = readWindowStats(getWindowMs(window), now);

    statsCache.set(getWindowMs(window), stats);

    return stats;
  };

  return SLO_ORDER.map((key) => {
    const definition = SLO_DEFINITIONS[key];
    const stats = statsFor(definition.window);

    return buildResult(definition, measure(key, stats), stats, now);
  });
}

/**
 * Ringkasan error budget dari SLO ketersediaan (window 24 jam). Dipisah dari
 * `computeSlos()` karena ini angkanonumber tunggal yang dipakai halaman
 * ringkasan dan banner freeze.
 */
export function computeErrorBudget(now: number = Date.now()): ErrorBudgetSummary {
  const definition = SLO_DEFINITIONS.availability;
  const windowMs = getWindowMs(definition.window);
  const stats = readWindowStats(windowMs, now);
  const measurement = measure("availability", stats);
  const { hasData, value } = measurement;
  const result = buildResult(definition, measurement, stats, now);

  return {
    status: hasData ? result.status : "unknown",
    availability: hasData ? round(value, 6) : 0,
    // Tanpa data, sisa anggaran ditulis 1 (utuh) hanya supaya angka tidak NaN.
    // `hasData: false` adalah sinyal yang wajib dibaca UI lebih dulu.
    errorBudgetRemaining: hasData ? (result.errorBudgetRemaining ?? 0) : 1,
    budgetConsumedRatio: hasData ? round(1 - (result.errorBudgetRemaining ?? 0)) : 0,
    errors: round(stats.errors, MS_DIGITS),
    total: round(stats.requests, MS_DIGITS),
    windowLabel: ERROR_BUDGET_POLICY.windowLabel,
    evaluatedAt: new Date(now).toISOString(),
    hasData,
  };
}
