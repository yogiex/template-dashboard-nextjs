import "server-only";

import {
  ALERT_CHANNEL_LABELS,
  ALERT_ENV_KEYS,
  ALERT_EVALUATION,
  ALERT_LOGIN_BURST_WINDOW_MS,
  ALERT_RULES,
  ALERT_SEVERITY_LABELS,
  ALERT_SUMMARY_FORMATS,
  type AlertChannel,
  type AlertComparison,
  type AlertRuleConfig,
  type AlertSeverity,
} from "@/config/alerting";
import { METRIC_NAMES } from "@/features/observability/lib/constants";
import { getGoldenSignals } from "@/features/observability/lib/golden-signals";
import { computeErrorBudget } from "@/features/observability/lib/slo";
import { getEvents } from "@/features/observability/lib/store";
import { logger } from "@/lib/logger";

/**
 * Mesin alert in-process dengan state machine `ok → pending → firing → resolved`
 * ala Prometheus.
 *
 * Prinsip yang dipegang file ini:
 *
 * 1. **Tidak ada data ≠ kondisi aman.** Nilai metrik yang `null` menghasilkan
 *    `conditionMet: false` dengan `value: null` — bukan `0`. Perlakukan `null`
 *    sebagai nol adalah bug klasik: rule dengan `lte 0` (sisa error budget)
 *    akan langsung "menyala" hanya karena belum ada satu pun request.
 * 2. **Tidak ada fungsi yang melempar exception.** Notifikasi ke pihak ketiga
 *    (Slack) adalah operasi jaringan yang pasti gagal sometime; kegagalan itu
 *    dicatat dan dikembalikan sebagai `delivered: false` + `reason`, bukan
 *    dipropagasi sampai merusak loop evaluasi.
 * 3. **Secret tidak pernah masuk log maupun response.** URL webhook Slack
 *    dibaca dari `process.env`, dipakai sekali, dan tidak pernah ditulis ke
 *    context logger maupun ke `AlertSnapshot`. `channels.slackConfigured` hanya
 *    boolean.
 * 4. **Default aman adalah dry-run.** Tanpa `ALERT_DRY_RUN=false` eksplisit,
 *    tidak ada satu pun permintaan jaringan keluar. Ini penting karena template
 *    ini tidak punya kanal notifikasi yang benar-benar dikonfigurasi.
 * 5. **`now` bisa diinjeksi di semua entry point** supaya state machine bisa
 *    diuji tanpa memalsukan `Date.now()`.
 *
 * Keterbatasan yang harus dibaca sebelum dipakai di produksi: state disimpan di
 * `globalThis` satu proses (lihat catatan di `src/config/alerting.ts`). Tidak
 * ada deduplikasi lintas instance, grouping, inhibition, maupun silence.
 */

export type AlertState = "ok" | "pending" | "firing" | "resolved";

export interface AlertConditionResult {
  met: boolean;
  /** Nilai metrik terukur; `null` berarti tidak terukur, bukan nol. */
  value: number | null;
}

export interface AlertEvaluation {
  ruleId: string;
  name: string;
  severity: AlertSeverity;
  channel: AlertChannel;
  state: AlertState;
  conditionMet: boolean;
  value: number | null;
  threshold: number;
  unit: string;
  /** ISO timestamp mulai kondisi terpenuhi; `null` saat state `ok`. */
  since: string | null;
  runbook: string;
  summary: string;
}

export interface AlertSnapshot {
  evaluatedAt: string;
  alerts: AlertEvaluation[];
  firing: number;
  pending: number;
  ok: number;
  channels: { slackConfigured: boolean; dryRun: boolean };
}

export interface AlertDispatchResult {
  delivered: boolean;
  channel: AlertChannel;
  reason?: string;
}

export interface AlertDispatchReport {
  snapshot: AlertSnapshot;
  attempted: number;
  delivered: number;
}

/** Batas waktu satu permintaan ke Slack; sengaja dibuat pendek. */
const SLACK_TIMEOUT_MS = 5_000;

const RATIO_DIGITS = 4;

/**
 * Cermin window default `getGoldenSignals()`. `golden-signals.ts` tidak
 * mengekspos konstantanya, jadi angka ini harus tetap sinkron dengan sana:
 * kalau windownya berubah, p95 di sini harus ikut berubah agar nilai yang
 * ditampilkan sebagai "sekarang" sama dengan yang dipakai rule.
 */
const GOLDEN_SIGNALS_WINDOW_MS = 60 * 60 * 1000;

const STORE_KEY = Symbol.for("template.observability.alerts");

type RuleRuntime = {
  state: AlertState;
  /** Kapan kondisi mulai terpenuhi (epoch ms); sumber `forMs`. */
  since: number | null;
  lastNotifiedAt: number | null;
  /** Kapan state masuk `resolved`, untuk batas `stateHistoryLimit`. */
  resolvedAt: number | null;
  /** Set `true` hanya pada evaluasi yang menaikkan alarm ke `firing`. */
  justFired: boolean;
  /** Set `true` hanya pada evaluasi yang memindahkan rule keluar `firing`. */
  justResolved: boolean;
};

type AlertStore = {
  /** Key = rule id. */
  rules: Map<string, RuleRuntime>;
};

type GlobalWithStore = typeof globalThis & { [STORE_KEY]?: AlertStore };

function getStore(): AlertStore {
  const globalStore = globalThis as GlobalWithStore;
  const existing = globalStore[STORE_KEY];

  if (existing) {
    return existing;
  }

  const created: AlertStore = { rules: new Map() };
  globalStore[STORE_KEY] = created;

  return created;
}

function round(value: number, digits = RATIO_DIGITS): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const factor = 10 ** digits;

  return Math.round(value * factor) / factor;
}

function toIso(timestamp: number | null): string | null {
  if (timestamp === null || !Number.isFinite(timestamp)) {
    return null;
  }

  return new Date(timestamp).toISOString();
}

function isDryRun(): boolean {
  // Hanya string persis "false" yang mematikan dry-run. `isFlagEnabled()` dari
  // `@/lib/env` tidak dipakai di sini karena semantiknya terbalik: helper itu
  // true untuk "true", sedangkan yang dibutuhkan di sini adalah "aktif kecuali
  // ada yang sengaja bilang false". Env yang tidak di-set sama sekali harus
  // berakhir dry-run, bukan wildcard network egress.
  return process.env[ALERT_ENV_KEYS.alertDryRun] !== "false";
}

function getWebhookUrl(): string | null {
  const raw = process.env[ALERT_ENV_KEYS.slackWebhookUrl]?.trim();

  if (!raw) {
    return null;
  }

  return raw;
}

function compare(value: number, comparison: AlertComparison, threshold: number): boolean {
  switch (comparison) {
    case "gt":
      return value > threshold;
    case "gte":
      return value >= threshold;
    case "lt":
      return value < threshold;
    case "lte":
      return value <= threshold;
    default:
      return false;
  }
}

/**
 * Pembaca metrik per rule. Tiap pembaca mengembalikan `null` saat metriknya
 * memang tidak terukur di store — itu informasi yang wajib dijaga sampai ke
 * `AlertEvaluation`, bukan dikosongkan jadi nol.
 */
type MetricReader = (now: number) => number | null;

/** Rasio `auth.login.failure / auth.login.attempt` dalam window 15 menit. */
function readLoginFailureRatio(now: number): number | null {
  const events = getEvents({
    fromTimestamp: now - ALERT_LOGIN_BURST_WINDOW_MS,
    toTimestamp: now,
  });
  let attempts = 0;
  let failures = 0;

  for (const event of events) {
    if (event.name === METRIC_NAMES.LOGIN_ATTEMPT) {
      attempts += event.value;
      continue;
    }

    if (event.name === METRIC_NAMES.LOGIN_FAILURE) {
      failures += event.value;
    }
  }

  // Tanpa percobaan login tidak ada rasio yang bisa dihitung. Mengembalikan
  // `0` di sini akan membuat burst login gagal "aman" pada sistem yang tidak
  // pernah menerima satu pun percobaan.
  if (attempts <= 0) {
    return null;
  }

  return round(failures / attempts);
}

function readErrorRate(now: number): number | null {
  const signals = getGoldenSignals(now);

  // `errors.rate` bernilai 0 saat `traffic.total` nol; tanpa request tidak
  // ada "tingkat error" yang bisa dilaporkan.
  return signals.traffic.total > 0 ? signals.errors.rate : null;
}

function readLatencyP95(now: number): number | null {
  const samples = getEvents({
    name: METRIC_NAMES.HTTP_SERVER_REQUEST_DURATION,
    fromTimestamp: now - GOLDEN_SIGNALS_WINDOW_MS,
    toTimestamp: now,
  });

  // `getGoldenSignals()` tidak mengekspos jumlah sampel histogram, dan p95-nya
  // bernilai 0 saat tidak ada sampel. Tanpa pemeriksaan ini, layanan tanpa
  // satu pun request akan dilaporkan "latensi 0 ms" — angka yang terlihat
  // sangat sehat padahal tidak terukur.
  if (samples.length === 0) {
    return null;
  }

  return getGoldenSignals(now).latency.overall.p95Ms;
}

function readAvailability(now: number): number | null {
  const budget = computeErrorBudget(now);

  return budget.hasData ? budget.availability : null;
}

function readErrorBudgetRemaining(now: number): number | null {
  const budget = computeErrorBudget(now);

  return budget.hasData ? budget.errorBudgetRemaining : null;
}

function readEventLoopLag(now: number): number | null {
  return getGoldenSignals(now).saturation.eventLoopLagMs;
}

function readHeapPressure(now: number): number | null {
  const saturation = getGoldenSignals(now).saturation;
  const { heapUsedBytes, rssBytes } = saturation;

  if (heapUsedBytes === null || rssBytes === null || rssBytes <= 0) {
    return null;
  }

  return round(heapUsedBytes / rssBytes);
}

const METRIC_READERS: Record<string, MetricReader> = {
  "error-rate-critical": readErrorRate,
  "latency-p95-breach": readLatencyP95,
  "availability-drop": readAvailability,
  "error-budget-exhausted": readErrorBudgetRemaining,
  "login-failure-burst": readLoginFailureRatio,
  "event-loop-lag": readEventLoopLag,
  "heap-pressure": readHeapPressure,
  // Rule `series-cardinality-pressure` sengaja tidak punya pembaca: nilainya
  // belum bisa dihitung tanpa menghitung series unik per metrik, dan rule-nya
  // `enabled: false`. Pembaca yang hilang menghasilkan `value: null`, bukan
  // angka tebakan.
};

function readerFor(ruleId: string): MetricReader | null {
  return METRIC_READERS[ruleId] ?? null;
}

function measureCondition(rule: AlertRuleConfig, now: number): AlertConditionResult {
  const read = readerFor(rule.id);

  if (!read) {
    return { met: false, value: null };
  }

  const value = read(now);

  // `null` berarti tidak terukur. Menganggapnya nol akan membuat rule `gt`/`lte`
  // menghasilkan boolean yang tidak bermakna.
  if (value === null || !Number.isFinite(value)) {
    return { met: false, value: null };
  }

  return { met: compare(value, rule.comparison, rule.threshold), value };
}

/**
 * Kondisi mentah tiap rule, tanpa efek samping ke state machine. Dipakai UI
 * untuk menampilkan "nilai sekarang vs ambang" tanpa mengubah state alert.
 */
export function evaluateRuleConditions(now: number = Date.now()): Record<string, AlertConditionResult> {
  const result: Record<string, AlertConditionResult> = {};

  for (const rule of ALERT_RULES) {
    result[rule.id] = measureCondition(rule, now);
  }

  return result;
}

function getRuntime(store: AlertStore, ruleId: string): RuleRuntime {
  const existing = store.rules.get(ruleId);

  if (existing) {
    return existing;
  }

  const created: RuleRuntime = {
    state: "ok",
    since: null,
    lastNotifiedAt: null,
    resolvedAt: null,
    justFired: false,
    justResolved: false,
  };

  store.rules.set(ruleId, created);

  return created;
}

/**
 * Buang state rule yang tidak lagi ada di config dan state lama yang sudah
 * melewati `stateHistoryLimit`, supaya map tidak tumbuh saat config berubah
 * atau HMR mengevaluasi ulang modul.
 */
function pruneStore(store: AlertStore, now: number): void {
  const knownIds = new Set(ALERT_RULES.map((rule) => rule.id));

  for (const [ruleId, runtime] of [...store.rules]) {
    if (!knownIds.has(ruleId)) {
      store.rules.delete(ruleId);
      continue;
    }

    const isStale =
      runtime.state === "resolved" &&
      runtime.resolvedAt !== null &&
      now - runtime.resolvedAt > ALERT_EVALUATION.stateHistoryLimit;

    if (isStale) {
      store.rules.delete(ruleId);
    }
  }
}

/**
 * Isi template ringkasan. Inputnya sengaja dibuat struktural supaya bisa
 * dipakai oleh `AlertRuleConfig` maupun `AlertEvaluation` tanpa memuat
 * config ke dalam objek hasil evaluasi.
 */
type SummaryInput = {
  severity: AlertSeverity;
  name: string;
  threshold: number;
  unit: string;
};

function buildSummary(
  input: SummaryInput,
  value: number | null,
  template: string,
): string {
  return template
    .replace("{severity}", ALERT_SEVERITY_LABELS[input.severity])
    .replace("{name}", input.name)
    .replace("{value}", value === null ? "-" : String(value))
    .replace("{threshold}", String(input.threshold))
    .replace("{unit}", input.unit);
}

/**
 * Majukan satu rule melalui state machine.
 *
 * `ok → pending`: kondisi baru terpenuhi, `since` dicatat.
 * `pending → firing`: kondisi terus terpenuhi selama `forMs`.
 * `firing → resolved`: kondisi berhenti terpenuhi.
 * `resolved → ok`: lewat `stateHistoryLimit` tanpa pernah menyala lagi.
 *
 * `justFired`/`justResolved` di-reset di awal tiap evaluasi supaya isinya
 * selalu menggambarkan transisi pada pemanggilan yang sedang berjalan.
 */
function advanceRule(
  runtime: RuleRuntime,
  rule: AlertRuleConfig,
  condition: AlertConditionResult,
  now: number,
): void {
  runtime.justFired = false;
  runtime.justResolved = false;

  if (condition.met) {
    runtime.resolvedAt = null;

    if (runtime.state === "firing") {
      // Sudah menyala: tidak ada transisi, tidak ada notifikasi baru.
      return;
    }

    if (runtime.since === null) {
      runtime.since = now;
    }

    if (now - runtime.since >= rule.forMs) {
      runtime.state = "firing";
      runtime.justFired = true;
      return;
    }

    runtime.state = "pending";

    return;
  }

  if (runtime.state === "firing") {
    runtime.state = "resolved";
    runtime.resolvedAt = now;
    runtime.justResolved = true;
    return;
  }

  if (runtime.state === "resolved") {
    if (
      runtime.resolvedAt !== null &&
      now - runtime.resolvedAt > ALERT_EVALUATION.stateHistoryLimit
    ) {
      runtime.state = "ok";
      runtime.since = null;
    }

    return;
  }

  // `ok`/`pending` dengan kondisi tidak terpenuhi: `pending` jatuh kembali ke
  // `ok` dan `since` harus dibuang, kalau tidak streak lama akan dipakai lagi
  // saat kondisi menyala untuk kedua kalinya.
  runtime.state = "ok";
  runtime.since = null;
}

function evaluateRule(
  store: AlertStore,
  rule: AlertRuleConfig,
  now: number,
): AlertEvaluation {
  const runtime = getRuntime(store, rule.id);

  if (!rule.enabled) {
    // Rule nonaktif tidak pernah membaca metrik dan tidak pernah jadi
    // `pending`: selalu `ok`. `justFired`/`justResolved` di-reset supaya
    // transisi yang tertinggal dari versi config sebelumnya tidak ikut terpakai.
    runtime.state = "ok";
    runtime.since = null;
    runtime.resolvedAt = null;
    runtime.justFired = false;
    runtime.justResolved = false;

    return {
      ruleId: rule.id,
      name: rule.name,
      severity: rule.severity,
      channel: rule.channel,
      state: "ok",
      conditionMet: false,
      value: null,
      threshold: rule.threshold,
      unit: rule.unit,
      since: null,
      runbook: rule.runbook,
      summary: buildSummary(rule, null, ALERT_SUMMARY_FORMATS.withoutValue),
    };
  }

  const condition = measureCondition(rule, now);

  advanceRule(runtime, rule, condition, now);

  const since = runtime.state === "ok" ? null : toIso(runtime.since);
  const template =
    runtime.state === "resolved"
      ? ALERT_SUMMARY_FORMATS.resolved
      : condition.value === null
        ? ALERT_SUMMARY_FORMATS.withoutValue
        : ALERT_SUMMARY_FORMATS.withValue;

  return {
    ruleId: rule.id,
    name: rule.name,
    severity: rule.severity,
    channel: rule.channel,
    state: runtime.state,
    conditionMet: condition.met,
    value: condition.value,
    threshold: rule.threshold,
    unit: rule.unit,
    since,
    runbook: rule.runbook,
    summary: buildSummary(rule, condition.value, template),
  };
}

/**
 * Evaluasi seluruh rule. Tidak ada I/O: fungsi ini murni terhadap state
 * global yang dimodifikasi secara sengaja (state machine) dan tidak pernah
 * melempar.
 *
 * Snapshot selalu memuat **semua** rule, termasuk yang `enabled: false`, agar
 * UI bisa menampilkan konfigurasi lengkap dan bukan hanya yang sedang menyala.
 */
export function evaluateAlerts(now: number = Date.now()): AlertSnapshot {
  const store = getStore();

  pruneStore(store, now);

  const alerts = ALERT_RULES.map((rule) => evaluateRule(store, rule, now));
  const dryRun = isDryRun();
  const snapshot: AlertSnapshot = {
    evaluatedAt: toIso(now) ?? new Date(now).toISOString(),
    alerts,
    firing: alerts.filter((alert) => alert.state === "firing").length,
    pending: alerts.filter((alert) => alert.state === "pending").length,
    ok: alerts.filter((alert) => alert.state === "ok").length,
    channels: {
      slackConfigured: getWebhookUrl() !== null,
      dryRun,
    },
  };

  return snapshot;
}

function buildSlackPayload(alert: AlertEvaluation): { text: string } {
  // Hanya teks ringkas; URL webhook tidak pernah ikut ke payload maupun log.
  return {
    text: alert.summary,
  };
}

async function postToSlack(
  url: string,
  alert: AlertEvaluation,
): Promise<AlertDispatchResult> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(buildSlackPayload(alert)),
      signal: AbortSignal.timeout(SLACK_TIMEOUT_MS),
      cache: "no-store",
    });

    if (!response.ok) {
      // Hanya status code yang dicatat; body webhook bisa memantulkan URL.
      logger.warn("Permintaan alert ke Slack ditolak", {
        ruleId: alert.ruleId,
        status: response.status,
      });

      return { delivered: false, channel: "slack", reason: "request-failed" };
    }

    return { delivered: true, channel: "slack" };
  } catch (error) {
    logger.error("Gagal mengirim alert ke Slack", error, { ruleId: alert.ruleId });

    return { delivered: false, channel: "slack", reason: "request-failed" };
  }
}

/**
 * Kirim satu alert ke kanalnya.
 *
 * Tidak pernah melempar: semua kegagalan jaringan dicatat dan dikembalikan
 * sebagai `delivered: false` + `reason` yang bisa ditampilkan UI.
 */
export async function dispatchAlert(
  alert: AlertEvaluation,
  now: number = Date.now(),
): Promise<AlertDispatchResult> {
  try {
    if (isDryRun()) {
      // Sengaja hanya boolezan: `slackConfigured` ditampilkan, URL-nya tidak.
      logger.info("Alert dicegah oleh mode dry-run", {
        ruleId: alert.ruleId,
        severity: alert.severity,
        channel: alert.channel,
        state: alert.state,
        value: alert.value,
        threshold: alert.threshold,
        slackConfigured: getWebhookUrl() !== null,
      });

      return { delivered: false, channel: alert.channel, reason: "dry-run" };
    }

    switch (alert.channel) {
      case "log": {
        logger.warn("Alert aktif", {
          ruleId: alert.ruleId,
          severity: alert.severity,
          value: alert.value,
          threshold: alert.threshold,
          unit: alert.unit,
          runbook: alert.runbook,
        });

        return { delivered: true, channel: "log", reason: "logged" };
      }
      case "none": {
        logger.info("Alert tanpa kanal notifikasi", { ruleId: alert.ruleId });

        return { delivered: false, channel: "none", reason: "channel-disabled" };
      }
      case "email": {
        // Tidak ada provider email di template ini. Melempar error "tidak
        // didukung" lebih jujur daripada diam-diam tidak mengirim.
        logger.warn("Kanal email belum diimplementasikan", { ruleId: alert.ruleId });

        return {
          delivered: false,
          channel: "email",
          reason: "channel-not-implemented",
        };
      }
      case "slack": {
        const url = getWebhookUrl();

        if (url === null) {
          logger.info("Kanal Slack belum dikonfigurasi", { ruleId: alert.ruleId });

          return { delivered: false, channel: "slack", reason: "not-configured" };
        }

        return postToSlack(url, alert);
      }
      default: {
        return { delivered: false, channel: alert.channel, reason: "channel-disabled" };
      }
    }
  } catch (error) {
    // Pengaman terakhir: `logger` sendiri bisa gagal pada environment yang
    // sangat dibatasi, dan fungsi ini tidak boleh melempar ke pemanggil.
    try {
      logger.error("Kesalahan tak terduga saat dispatch alert", error, {
        ruleId: alert.ruleId,
        at: toIso(now),
      });
    } catch {
      // Diabaikan dengan sengaja: tidak ada lagi yang bisa dicatat.
    }

    return { delivered: false, channel: alert.channel, reason: "request-failed" };
  }
}

async function notifyResolved(
  store: AlertStore,
  alert: AlertEvaluation,
  now: number,
): Promise<void> {
  const runtime = store.rules.get(alert.ruleId);

  // Resolve selalu dicatat di log, apa pun konfigurasi kanalnya: ini jejak
  // audit bahwa ada alarm yang turun, dan satu-satunya kanal yang selalu ada.
  logger.info("Alert sudah normal kembali", {
    ruleId: alert.ruleId,
    severity: alert.severity,
    channel: alert.channel,
    channelLabel: ALERT_CHANNEL_LABELS[alert.channel],
    at: toIso(now),
  });

  if (alert.channel === "log" || alert.channel === "none") {
    return;
  }

  const result = await dispatchAlert(
    { ...alert, state: "resolved", summary: buildSummary(alert, alert.value, ALERT_SUMMARY_FORMATS.resolved) },
    now,
  );

  if (!result.delivered) {
    logger.info("Notifikasi resolve tidak terkirim", {
      ruleId: alert.ruleId,
      reason: result.reason,
    });
  }

  if (runtime) {
    runtime.lastNotifiedAt = now;
  }
}

/**
 * Siklus lengkap: evaluasi → dispatch yang memang diizinkan → laporan.
 *
 * Aturan dispatch:
 * - Notifikasi **hanya** saat transisi masuk `firing` (bukan tiap tick selama
 *   alarm menyala). Ini yang mencegah satu insiden jadi puluhan pesan.
 * - `cooldownMs` menjadi pengaman kedua: kalau rule yang sama menyala lagi
 *   dalam masa cooldown, notifikasi ditahan. Sifat alert yang masih menyala
 *   tidak mengulang notifikasi.
 * - `maxDispatchesPerEvaluation` membatasi jumlah kiriman per pemanggilan.
 *
 * Fungsi ini tidak pernah melempar.
 */
export async function evaluateAndDispatchAlerts(
  now: number = Date.now(),
): Promise<AlertDispatchReport> {
  const store = getStore();
  const snapshot = evaluateAlerts(now);
  let attempted = 0;
  let delivered = 0;
  let limitReached = false;

  for (const alert of snapshot.alerts) {
    const runtime = store.rules.get(alert.ruleId);

    if (!runtime) {
      continue;
    }

    if (runtime.justResolved) {
      await notifyResolved(store, alert, now);
      runtime.justResolved = false;
      continue;
    }

    if (!runtime.justFired) {
      continue;
    }

    runtime.justFired = false;

    if (limitReached) {
      logger.warn("Batas dispatch per evaluasi tercapai", {
        ruleId: alert.ruleId,
        limit: ALERT_EVALUATION.maxDispatchesPerEvaluation,
      });
      continue;
    }

    if (
      runtime.lastNotifiedAt !== null &&
      now - runtime.lastNotifiedAt < ALERT_EVALUATION.cooldownMs
    ) {
      logger.info("Alert ditahan oleh cooldown rule", {
        ruleId: alert.ruleId,
        remainingMs: ALERT_EVALUATION.cooldownMs - (now - runtime.lastNotifiedAt),
      });
      continue;
    }

    attempted += 1;
    runtime.lastNotifiedAt = now;
    const result = await dispatchAlert(alert, now);

    if (result.delivered) {
      delivered += 1;
    }

    if (attempted >= ALERT_EVALUATION.maxDispatchesPerEvaluation) {
      limitReached = true;
    }
  }

  return { snapshot, attempted, delivered };
}

/**
 * Condition runtime tiap rule untuk keperluan diagnostik dan UI. Hanya berisi tiga
 * field yang memang dijanjikan kontrak; detail transisi (jika sedang menyala)
 * ada di `evaluateAlerts()`.
 */
export function getAlertStateSnapshot(): Record<
  string,
  { state: AlertState; since: number | null; lastNotifiedAt: number | null }
> {
  const store = getStore();
  const result: Record<string, { state: AlertState; since: number | null; lastNotifiedAt: number | null }> = {};

  for (const rule of ALERT_RULES) {
    const runtime = store.rules.get(rule.id);

    if (!runtime) {
      result[rule.id] = { state: "ok", since: null, lastNotifiedAt: null };
      continue;
    }

    result[rule.id] = {
      state: runtime.state,
      since: runtime.since,
      lastNotifiedAt: runtime.lastNotifiedAt,
    };
  }

  return result;
}

/** Bersihkan seluruh state; dipakai test dan saat data demo diisi ulang. */
export function resetAlertState(): void {
  getStore().rules.clear();
}
