import { beforeEach, describe, expect, it } from "vitest";

import { BUSINESS_FUNNEL_STEPS } from "@/config/slo";
import { computeBusinessMetrics } from "@/features/observability/lib/business-metrics";
import { METRIC_NAMES } from "@/features/observability/lib/constants";
import { pushEvent, resetStore } from "@/features/observability/lib/store";
import type { MetricEvent } from "@/features/observability/types";

/** Lihat catatan di `slo.test.ts`: `NOW` harus dekat jam sistem agar tidak
 * dibuang `pruneExpiredEvents()`. */
const NOW = Date.now();
const DAY_MS = 24 * 60 * 60 * 1000;

let sequence = 0;

function makeEvent(overrides: Partial<MetricEvent> = {}): MetricEvent {
  sequence += 1;

  return {
    id: `evt-${sequence}`,
    timestamp: new Date(NOW).toISOString(),
    name: METRIC_NAMES.LOGIN_ATTEMPT,
    kind: "counter",
    value: 1,
    tags: {},
    ...overrides,
  };
}

function pushActivity(
  name: string,
  actorId: string,
  count: number,
  at = NOW,
): void {
  for (let index = 0; index < count; index += 1) {
    pushEvent(
      makeEvent({ name, actorId, timestamp: new Date(at - index * 1_000).toISOString() }),
    );
  }
}

beforeEach(() => {
  sequence = 0;
  resetStore();
});

describe("computeBusinessMetrics tanpa data", () => {
  it("tidak mengarang metrik saat store kosong", () => {
    const snapshot = computeBusinessMetrics(NOW);

    expect(snapshot.hasData).toBe(false);
    expect(snapshot.dau).toBe(0);
    expect(snapshot.mau).toBe(0);
    expect(snapshot.dauMauRatio).toBe(0);
    expect(snapshot.authSuccessRate).toBeNull();
    expect(snapshot.mfaSuccessRate).toBeNull();
    expect(snapshot.funnel).toEqual([]);
  });
});

describe("DAU dan MAU", () => {
  it("menghitung aktor unik dari event berbeda", () => {
    // Aktor A dan B aktif hari ini, aktor C hanya 10 hari lalu.
    pushActivity(METRIC_NAMES.LOGIN_ATTEMPT, "usr_a", 3);
    pushActivity(METRIC_NAMES.LOGIN_ATTEMPT, "usr_b", 2);
    pushActivity(METRIC_NAMES.LOGIN_ATTEMPT, "usr_c", 1, NOW - 10 * DAY_MS);

    const snapshot = computeBusinessMetrics(NOW);

    expect(snapshot.dau).toBe(2);
    expect(snapshot.mau).toBe(3);
    expect(snapshot.dauMauRatio).toBeCloseTo(2 / 3, 4);
  });

  it("mengabaikan aktor yang hanya muncul di luar 30 hari", () => {
    pushActivity(METRIC_NAMES.LOGIN_ATTEMPT, "usr_lama", 1, NOW - 40 * DAY_MS);

    expect(computeBusinessMetrics(NOW).mau).toBe(0);
  });

  it("mengabaikan event tanpa actorId", () => {
    pushEvent(makeEvent());

    expect(computeBusinessMetrics(NOW).mau).toBe(0);
  });
});

describe("tingkat keberhasilan", () => {
  it("menghitung auth_success_rate dari attempt dan success", () => {
    pushActivity(METRIC_NAMES.LOGIN_ATTEMPT, "usr_a", 9);
    pushActivity(METRIC_NAMES.LOGIN_SUCCESS, "usr_a", 8);
    pushActivity(METRIC_NAMES.LOGIN_FAILURE, "usr_a", 1);

    const snapshot = computeBusinessMetrics(NOW);

    expect(snapshot.authSuccessRate).toBeCloseTo(8 / 9, 4);
    expect(snapshot.mfaSuccessRate).toBeNull();
  });

  it("menghitung mfa_success_rate dari tantangan dan keberhasilan MFA", () => {
    pushActivity(METRIC_NAMES.MFA_CHALLENGE, "usr_a", 4);
    pushActivity(METRIC_NAMES.MFA_SUCCESS, "usr_a", 3);

    expect(computeBusinessMetrics(NOW).mfaSuccessRate).toBe(0.75);
  });

  it("bernilai null saat denominator nol", () => {
    pushActivity(METRIC_NAMES.LOGIN_SUCCESS, "usr_a", 3);

    const snapshot = computeBusinessMetrics(NOW);

    expect(snapshot.authSuccessRate).toBeNull();
    expect(snapshot.mfaSuccessRate).toBeNull();
  });
});

describe("funnel", () => {
  it("hanya memuat step yang punya data dengan urutan tetap", () => {
    pushActivity(METRIC_NAMES.LOGIN_ATTEMPT, "usr_a", 10);
    pushActivity(METRIC_NAMES.LOGIN_SUCCESS, "usr_a", 6);
    // Tantangan dan keberhasilan MFA sengaja tidak ada.

    const { funnel } = computeBusinessMetrics(NOW);

    expect(funnel).toEqual([
      { step: "Percobaan login", count: 10 },
      { step: "Login berhasil", count: 6 },
    ]);
  });

  it("memuat keempat step saat semua event tersedia", () => {
    pushActivity(METRIC_NAMES.LOGIN_ATTEMPT, "usr_a", 10);
    pushActivity(METRIC_NAMES.LOGIN_SUCCESS, "usr_a", 8);
    pushActivity(METRIC_NAMES.MFA_CHALLENGE, "usr_a", 5);
    pushActivity(METRIC_NAMES.MFA_SUCCESS, "usr_a", 4);

    const { funnel } = computeBusinessMetrics(NOW);

    expect(funnel.map((step) => step.step)).toEqual(
      BUSINESS_FUNNEL_STEPS.map((step) => step.label),
    );
    expect(funnel.map((step) => step.count)).toEqual([10, 8, 5, 4]);
  });
});

describe("determinisme", () => {
  it("menghasilkan snapshot identik untuk now yang sama", () => {
    pushActivity(METRIC_NAMES.LOGIN_ATTEMPT, "usr_a", 2);
    pushActivity(METRIC_NAMES.LOGIN_SUCCESS, "usr_a", 1);

    expect(computeBusinessMetrics(NOW)).toEqual(computeBusinessMetrics(NOW));
  });
});
