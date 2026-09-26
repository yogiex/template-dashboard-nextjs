import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ALERT_ENV_KEYS, ALERT_EVALUATION, ALERT_RULES } from "@/config/alerting";
import {
  dispatchAlert,
  evaluateAlerts,
  evaluateAndDispatchAlerts,
  evaluateRuleConditions,
  getAlertStateSnapshot,
  resetAlertState,
  type AlertEvaluation,
} from "@/features/observability/lib/alerting";
import { METRIC_NAMES } from "@/features/observability/lib/constants";
import { pushEvent, resetStore } from "@/features/observability/lib/store";
import { logger } from "@/lib/logger";
import type { MetricEvent } from "@/features/observability/types";

/**
 * Semua test memakai `now` yang diinjeksi, bukan jam sistem, supaya state
 * machine `forMs` bisa diuji tanpa memalsukan `Date.now()`. Satu-satunya
 * tempat yang membaca jam sistem adalah `pushEvent()` (untuk pruning
 * periodik), dan event buatan selalu bertimestamp di dalam window 1 jam
 * terakhir sehingga tidak pernah ikut terbuang.
 */
const NOW = Date.now();
const MINUTE = 60_000;

const WEBHOOK_URL = "https://hooks.slack.test/services/T000/B000/token-rahasia";

let sequence = 0;
let savedEnv: Record<string, string | undefined>;

function makeEvent(overrides: Partial<MetricEvent> = {}): MetricEvent {
  sequence += 1;

  return {
    id: `evt-${sequence}`,
    timestamp: new Date(NOW - MINUTE).toISOString(),
    name: METRIC_NAMES.HTTP_SERVER_REQUEST_COUNT,
    kind: "counter",
    value: 1,
    tags: {},
    ...overrides,
  };
}

/** Isi event yang membuat `errors.rate` = 0,1 (di atas ambang 0,05). */
function pushFailingTraffic(): void {
  for (let index = 0; index < 100; index += 1) {
    pushEvent(makeEvent({ value: 1 }));
  }

  for (let index = 0; index < 10; index += 1) {
    pushEvent(
      makeEvent({ name: METRIC_NAMES.HTTP_SERVER_ERROR_COUNT, value: 1 }),
    );
  }
}

function pushEventLoopLag(value: number, at: number): void {
  pushEvent(
    makeEvent({
      name: METRIC_NAMES.NODEJS_EVENT_LOOP_LAG,
      value,
      timestamp: new Date(at).toISOString(),
    }),
  );
}

function findAlert(snapshot: ReturnType<typeof evaluateAlerts>, ruleId: string): AlertEvaluation {
  const found = snapshot.alerts.find((alert) => alert.ruleId === ruleId);

  if (!found) {
    throw new Error(`Alert ${ruleId} tidak ada di snapshot.`);
  }

  return found;
}

function ruleFor(ruleId: string) {
  const found = ALERT_RULES.find((rule) => rule.id === ruleId);

  if (!found) {
    throw new Error(`Rule ${ruleId} tidak ada di config.`);
  }

  return found;
}

/** Logger asli di-spy supaya bisa diperiksa tanpa membanjiri output test. */
function spyOnLogger() {
  return {
    info: vi.spyOn(logger, "info").mockImplementation(() => {}),
    warn: vi.spyOn(logger, "warn").mockImplementation(() => {}),
    error: vi.spyOn(logger, "error").mockImplementation(() => {}),
  };
}

beforeEach(() => {
  sequence = 0;
  resetStore();
  resetAlertState();
  savedEnv = {
    [ALERT_ENV_KEYS.slackWebhookUrl]: process.env[ALERT_ENV_KEYS.slackWebhookUrl],
    [ALERT_ENV_KEYS.alertDryRun]: process.env[ALERT_ENV_KEYS.alertDryRun],
  };

  // Default template: tanpa kanal, dry-run aktif.
  delete process.env[ALERT_ENV_KEYS.slackWebhookUrl];
  delete process.env[ALERT_ENV_KEYS.alertDryRun];
});

afterEach(() => {
  for (const key of Object.keys(savedEnv)) {
    const value = savedEnv[key];

    if (value === undefined) {
      delete process.env[key];
      continue;
    }

    process.env[key] = value;
  }

  vi.unstubAllGlobals();
});

describe("evaluateAlerts tanpa data", () => {
  it("menampilkan semua rule dan tidak pernah menganggap null sebagai 0", () => {
    const snapshot = evaluateAlerts(NOW);

    // Semua rule ada, termasuk yang `enabled: false`, supaya UI bisa
    // menampilkan konfigurasi lengkap.
    expect(snapshot.alerts).toHaveLength(ALERT_RULES.length);
    expect(snapshot.alerts.map((alert) => alert.ruleId)).toEqual(
      ALERT_RULES.map((rule) => rule.id),
    );

    const errorBudget = findAlert(snapshot, "error-budget-exhausted");

    // Ini yang paling penting: tanpa data, sisa error budget adalah `null`,
    // bukan 0. Kalau nonlocal, rule `lte 0` akan langsung menyala.
    expect(errorBudget.conditionMet).toBe(false);
    expect(errorBudget.value).toBeNull();
    expect(errorBudget.state).toBe("ok");
  });

  it("conditionMet false untuk semua metrik yang tidak terukur", () => {
    const conditions = evaluateRuleConditions(NOW);

    for (const rule of ALERT_RULES) {
      // `series-cardinality-pressure` tidak punya pembaca metrik, jadi
      // `value` selalu `null` sampai reader-nya ditambahkan.
      expect(conditions[rule.id].met).toBe(false);
      expect(conditions[rule.id].value).toBeNull();
    }
  });

  it("tidak pernah menyalakan rule yang dinonaktifkan", () => {
    pushEventLoopLag(5_000, NOW - MINUTE);

    const snapshot = evaluateAlerts(NOW + 60 * MINUTE);
    const disabled = findAlert(snapshot, "series-cardinality-pressure");

    expect(disabled.state).toBe("ok");
    expect(disabled.conditionMet).toBe(false);
    expect(disabled.value).toBeNull();
  });

  it("menandai kanal sebagai belum terkonfigurasi dan dry-run aktif", () => {
    const snapshot = evaluateAlerts(NOW);

    expect(snapshot.channels).toEqual({ slackConfigured: false, dryRun: true });
  });
});

describe("state machine forMs", () => {
  it("ok saat kondisi belum terpenuhi, pending saat baru terpenuhi, firing setelah forMs", () => {
    const rule = ruleFor("error-rate-critical");

    expect(evaluateAlerts(NOW).firing).toBe(0);

    pushFailingTraffic();

    const pending = findAlert(evaluateAlerts(NOW), "error-rate-critical");

    expect(pending.conditionMet).toBe(true);
    expect(pending.state).toBe("pending");
    expect(pending.since).toBe(new Date(NOW).toISOString());
    expect(pending.value).toBeCloseTo(0.1, 4);

    // Tepat sebelum `forMs` masih pending: alarm tidak boleh menyala lebih
    // awal hanya karena satu sampel nyumba.
    const almost = findAlert(
      evaluateAlerts(NOW + rule.forMs - 1),
      "error-rate-critical",
    );

    expect(almost.state).toBe("pending");

    const firing = findAlert(
      evaluateAlerts(NOW + rule.forMs),
      "error-rate-critical",
    );

    expect(firing.state).toBe("firing");
    expect(firing.since).toBe(new Date(NOW).toISOString());
  });

  it("kembali ke ok dan membuang since saat pending gagal terkonfirmasi", () => {
    const rule = ruleFor("error-rate-critical");

    pushFailingTraffic();
    expect(findAlert(evaluateAlerts(NOW), "error-rate-critical").state).toBe("pending");

    // Data dihapus sebelum `forMs` tercapai: rule harus kembali ke ok dan
    // `since` dibuang, kalau tidak streak lama akan dipakai lagi.
    resetStore();

    const back = findAlert(
      evaluateAlerts(NOW + rule.forMs - 1),
      "error-rate-critical",
    );

    expect(back.state).toBe("ok");
    expect(back.since).toBeNull();
  });

  it("firing -> resolved lalu kembali ke ok setelah stateHistoryLimit", () => {
    const rule = ruleFor("error-rate-critical");
    const resolvedAt = NOW + rule.forMs + MINUTE;

    pushFailingTraffic();
    // Evaluasi pertama mencatat `since`, jadi `forMs` terukur dari saat itu.
    expect(findAlert(evaluateAlerts(NOW), "error-rate-critical").state).toBe("pending");

    expect(findAlert(evaluateAlerts(NOW + rule.forMs), "error-rate-critical").state).toBe("firing");

    resetStore();

    const resolved = findAlert(evaluateAlerts(resolvedAt), "error-rate-critical");

    expect(resolved.state).toBe("resolved");
    expect(getAlertStateSnapshot()["error-rate-critical"].state).toBe("resolved");

    const recovered = findAlert(
      evaluateAlerts(resolvedAt + ALERT_EVALUATION.stateHistoryLimit + 1),
      "error-rate-critical",
    );

    expect(recovered.state).toBe("ok");
    expect(recovered.since).toBeNull();
  });

  it("resetAlertState mengembalikan state awal", () => {
    pushFailingTraffic();
    evaluateAlerts(NOW);
    evaluateAlerts(NOW + ruleFor("error-rate-critical").forMs);

    expect(getAlertStateSnapshot()["error-rate-critical"].state).toBe("firing");

    resetAlertState();

    const state = getAlertStateSnapshot();

    for (const rule of ALERT_RULES) {
      expect(state[rule.id]).toEqual({ state: "ok", since: null, lastNotifiedAt: null });
    }
  });
});

describe("evaluateAndDispatchAlerts", () => {
  it("mengirim tepat satu kali saat transisi ke firing dan tidak mengulang meski cooldown lewat", async () => {
    process.env[ALERT_ENV_KEYS.alertDryRun] = "false";
    const spies = spyOnLogger();
    const rule = ruleFor("event-loop-lag");
    const firingAt = NOW + rule.forMs;

    pushEventLoopLag(500, NOW - MINUTE);

    expect(findAlert(evaluateAlerts(NOW), "event-loop-lag").state).toBe("pending");

    pushEventLoopLag(500, firingAt - MINUTE);
    const first = await evaluateAndDispatchAlerts(firingAt);

    expect(findAlert(first.snapshot, "event-loop-lag").state).toBe("firing");
    expect(first.attempted).toBe(1);
    expect(first.delivered).toBe(1);
    expect(getAlertStateSnapshot()["event-loop-lag"].lastNotifiedAt).toBe(firingAt);

    // Masih menyala pada evaluasi berikutnya: tidak ada transisi baru, jadi
    // tidak ada notifikasi baru.
    pushEventLoopLag(500, firingAt);
    const second = await evaluateAndDispatchAlerts(firingAt + MINUTE);

    expect(findAlert(second.snapshot, "event-loop-lag").state).toBe("firing");
    expect(second.attempted).toBe(0);
    expect(second.delivered).toBe(0);

    // Bahkan setelah cooldown (30 menit) lewat, alert yang tetap menyala
    // tidak mengirim ulang: satu insiden = satu notifikasi.
    pushEventLoopLag(500, firingAt + 31 * MINUTE);
    const third = await evaluateAndDispatchAlerts(firingAt + 32 * MINUTE);

    expect(third.attempted).toBe(0);
    expect(third.delivered).toBe(0);
    expect(spies.warn).toHaveBeenCalledTimes(1);
  });

  it("menahan notifikasi saat rule menyala lagi di dalam masa cooldown", async () => {
    process.env[ALERT_ENV_KEYS.alertDryRun] = "false";
    spyOnLogger();
    const rule = ruleFor("error-rate-critical");
    const firingAt = NOW + rule.forMs;

    pushFailingTraffic();
    await evaluateAndDispatchAlerts(NOW);
    await evaluateAndDispatchAlerts(firingAt);
    expect(getAlertStateSnapshot()["error-rate-critical"].lastNotifiedAt).toBe(firingAt);

    // Kondisi normal: rule resolved dan notifikasi resolve ikut dikirim, jadi
    // `lastNotifiedAt` bergeser ke waktu resolve.
    resetStore();
    const resolvedReport = await evaluateAndDispatchAlerts(firingAt + 2 * MINUTE);

    expect(findAlert(resolvedReport.snapshot, "error-rate-critical").state).toBe("resolved");
    expect(getAlertStateSnapshot()["error-rate-critical"].lastNotifiedAt).toBe(
      firingAt + 2 * MINUTE,
    );

    // Menyala lagi 5 menit setelah resolve: masih di dalam cooldown 30 menit,
    // jadi notifikasi ditahan walau transisi ke firing-nya nyata.
    pushFailingTraffic();
    const secondFiringAt = firingAt + 2 * MINUTE + rule.forMs;
    const report = await evaluateAndDispatchAlerts(secondFiringAt);
    const alert = findAlert(report.snapshot, "error-rate-critical");

    expect(alert.state).toBe("firing");
    expect(report.attempted).toBe(0);
    expect(report.delivered).toBe(0);
    // `lastNotifiedAt` tidak digeser karena tidak ada kiriman baru.
    expect(getAlertStateSnapshot()["error-rate-critical"].lastNotifiedAt).toBe(
      firingAt + 2 * MINUTE,
    );
  });

  it("mencatat resolve di log walau kanal tidak ada", async () => {
    const spies = spyOnLogger();
    const rule = ruleFor("event-loop-lag");
    const firingAt = NOW + rule.forMs;

    pushEventLoopLag(500, NOW - MINUTE);
    await evaluateAndDispatchAlerts(NOW);
    await evaluateAndDispatchAlerts(firingAt);
    spies.info.mockClear();

    resetStore();
    const report = await evaluateAndDispatchAlerts(firingAt + MINUTE);

    expect(findAlert(report.snapshot, "event-loop-lag").state).toBe("resolved");
    expect(report.attempted).toBe(0);
    expect(spies.info).toHaveBeenCalledWith(
      "Alert sudah normal kembali",
      expect.objectContaining({ ruleId: "event-loop-lag" }),
    );
  });
});

describe("dispatchAlert", () => {
  it("dry-run default tidak pernah memanggil fetch", async () => {
    process.env[ALERT_ENV_KEYS.slackWebhookUrl] = WEBHOOK_URL;

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const snapshot = evaluateAlerts(NOW);
    const alert = findAlert(snapshot, "error-rate-critical");
    const result = await dispatchAlert(alert, NOW);

    expect(result.delivered).toBe(false);
    expect(result.reason).toBe("dry-run");
    expect(result.channel).toBe("slack");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(snapshot.channels).toEqual({ slackConfigured: true, dryRun: true });
  });

  it("kirim ke Slack lewat fetch dan tidak pernah membocorkan URL webhook", async () => {
    process.env[ALERT_ENV_KEYS.slackWebhookUrl] = WEBHOOK_URL;
    process.env[ALERT_ENV_KEYS.alertDryRun] = "false";

    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);
    const spies = spyOnLogger();

    const alert = findAlert(evaluateAlerts(NOW), "error-rate-critical");
    const result = await dispatchAlert(alert, NOW);

    expect(result.delivered).toBe(true);
    expect(result.channel).toBe("slack");
    expect(result.reason).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(url).toBe(WEBHOOK_URL);
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "content-type": "application/json" });
    expect(init.signal).toBeDefined();

    const body = JSON.parse(String(init.body)) as { text: string };

    expect(typeof body.text).toBe("string");
    expect(body.text).toBe(alert.summary);

    // Konteks logger tidak boleh memuat URL webhook: URL itu bearer token.
    for (const spy of [spies.info, spies.warn, spies.error]) {
      for (const call of spy.mock.calls) {
        expect(JSON.stringify(call)).not.toContain(WEBHOOK_URL);
        expect(JSON.stringify(call)).not.toContain("token-rahasia");
      }
    }
  });

  it("melaporkan not-configured tanpa melempar exception", async () => {
    process.env[ALERT_ENV_KEYS.alertDryRun] = "false";
    spyOnLogger();

    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const alert = findAlert(evaluateAlerts(NOW), "error-rate-critical");
    const result = await dispatchAlert(alert, NOW);

    expect(result).toEqual({
      delivered: false,
      channel: "slack",
      reason: "not-configured",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("tidak melempar saat fetch ditolak dan melaporkan request-failed", async () => {
    process.env[ALERT_ENV_KEYS.slackWebhookUrl] = WEBHOOK_URL;
    process.env[ALERT_ENV_KEYS.alertDryRun] = "false";

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("koneksi ditolak")));
    spyOnLogger();

    const alert = findAlert(evaluateAlerts(NOW), "error-rate-critical");

    await expect(dispatchAlert(alert, NOW)).resolves.toEqual({
      delivered: false,
      channel: "slack",
      reason: "request-failed",
    });
  });

  it("tidak melempar saat Slack membalas status error", async () => {
    process.env[ALERT_ENV_KEYS.slackWebhookUrl] = WEBHOOK_URL;
    process.env[ALERT_ENV_KEYS.alertDryRun] = "false";

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    spyOnLogger();

    const alert = findAlert(evaluateAlerts(NOW), "error-rate-critical");

    await expect(dispatchAlert(alert, NOW)).resolves.toEqual({
      delivered: false,
      channel: "slack",
      reason: "request-failed",
    });
  });

  it("menyatakan kanal email belum diimplementasikan, bukan diam-diam gagal", async () => {
    process.env[ALERT_ENV_KEYS.alertDryRun] = "false";
    spyOnLogger();

    const alert = findAlert(evaluateAlerts(NOW), "error-rate-critical");

    await expect(dispatchAlert({ ...alert, channel: "email" }, NOW)).resolves.toEqual({
      delivered: false,
      channel: "email",
      reason: "channel-not-implemented",
    });
  });

  it("mencatat alert di log untuk kanal log", async () => {
    process.env[ALERT_ENV_KEYS.alertDryRun] = "false";
    const spies = spyOnLogger();

    const alert = findAlert(evaluateAlerts(NOW), "event-loop-lag");

    await expect(dispatchAlert(alert, NOW)).resolves.toEqual({
      delivered: true,
      channel: "log",
      reason: "logged",
    });
    expect(spies.warn).toHaveBeenCalledWith(
      "Alert aktif",
      expect.objectContaining({ ruleId: "event-loop-lag" }),
    );
  });
});

describe("evaluateRuleConditions", () => {
  it("mengembalikan nilai terukur hanya untuk metrik yang memang ada", () => {
    pushFailingTraffic();
    pushEventLoopLag(500, NOW - MINUTE);

    const conditions = evaluateRuleConditions(NOW);

    expect(conditions["error-rate-critical"].value).toBeCloseTo(0.1, 4);
    expect(conditions["error-rate-critical"].met).toBe(true);
    expect(conditions["event-loop-lag"].value).toBe(500);
    expect(conditions["event-loop-lag"].met).toBe(true);
    // Tidak ada data durasi: p95 tidak terukur.
    expect(conditions["latency-p95-breach"].value).toBeNull();
    expect(conditions["latency-p95-breach"].met).toBe(false);
  });

  it("tidak ada kondisi yang terpenuhi saat store kosong", () => {
    const conditions = evaluateRuleConditions(NOW);

    for (const ruleId of Object.keys(conditions)) {
      expect(conditions[ruleId].met).toBe(false);
      expect(conditions[ruleId].value).toBeNull();
    }
  });
});
