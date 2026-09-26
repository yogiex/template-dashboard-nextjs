import { beforeEach, describe, expect, it } from "vitest";

import { SLO_DEFINITIONS, type SloDefinition } from "@/config/slo";
import { METRIC_NAMES } from "@/features/observability/lib/constants";
import {
  computeErrorBudget,
  computeSlos,
  sloStatusFor,
  type SloResult,
} from "@/features/observability/lib/slo";
import { pushEvent, resetStore } from "@/features/observability/lib/store";
import type { MetricEvent } from "@/features/observability/types";

/**
 * Basis waktu diambil sekali dari jam sistem, bukan dari konstanta tetap:
 * `pruneExpiredEvents()` memakai `Date.now()` dan retensi 7 hari, sehingga
 * timestamp buatan yang terlalu lama akan dibuang saat prune berjalan. Nilai
 * `NOW` tetap konstan selama satu kali jalan test, jadi hasil evaluasinya
 * deterministik.
 */
const NOW = Date.now();
const DAY_MS = 24 * 60 * 60 * 1000;

let sequence = 0;

function makeEvent(overrides: Partial<MetricEvent> = {}): MetricEvent {
  sequence += 1;

  return {
    id: `evt-${sequence}`,
    timestamp: new Date(NOW).toISOString(),
    name: METRIC_NAMES.HTTP_SERVER_REQUEST_COUNT,
    kind: "counter",
    value: 1,
    tags: {},
    ...overrides,
  };
}

function pushRequests(count: number, errors = 0, now = NOW): void {
  // Event tersebar merata dari `now - window` sampai `now` supaya window benar
  // benar terisi penuh: `fractionOfWindowElapsed` = 1 sehingga burn rate terbaca
  // sebagai porsi budget yang terpakai. Total event dijaga di bawah batas store
  // 5000 supaya tidak ada yang terpotong diam-diam.
  const spread = (index: number): string =>
    new Date(now - DAY_MS + (index * DAY_MS) / count).toISOString();

  for (let index = 0; index < count; index += 1) {
    pushEvent(makeEvent({ timestamp: spread(index) }));
  }

  const spreadError = (index: number): string =>
    new Date(now - DAY_MS + (index * DAY_MS) / errors).toISOString();

  for (let index = 0; index < errors; index += 1) {
    pushEvent(
      makeEvent({
        name: METRIC_NAMES.HTTP_SERVER_ERROR_COUNT,
        timestamp: spreadError(index),
      }),
    );
  }
}

function resultOf(results: SloResult[], key: string): SloResult {
  const found = results.find((result) => result.key === key);

  if (!found) {
    throw new Error(`SLO ${key} tidak ada di hasil.`);
  }

  return found;
}

/** Definisi uji dengan ambang status yang mudah diprediksi. */
const TEST_DEFINITION: SloDefinition = {
  key: "availability",
  label: "Uji",
  description: "Definisi uji",
  target: 0.99,
  comparison: "gte",
  unit: "1",
  window: "24h",
  errorBudget: true,
  warnRatio: 0.5,
  criticalRatio: 1,
};

beforeEach(() => {
  sequence = 0;
  resetStore();
});

describe("computeSlos tanpa data", () => {
  it("tidak pernah melaporkan healthy saat store kosong", () => {
    const results = computeSlos(NOW);

    expect(results).toHaveLength(4);
    expect(results.every((result) => result.status === "unknown")).toBe(true);
    expect(results.every((result) => result.value === 0)).toBe(true);
  });

  it("menuliskan errorBudgetRemaining null untuk SLO tanpa data", () => {
    const results = computeSlos(NOW);

    for (const result of results) {
      expect(result.errorBudgetRemaining).toBeNull();
    }
  });

  it("menandai ringkasan error budget sebagai belum ada data", () => {
    const summary = computeErrorBudget(NOW);

    expect(summary.hasData).toBe(false);
    expect(summary.status).toBe("unknown");
    expect(summary.errors).toBe(0);
    expect(summary.total).toBe(0);
  });
});

describe("sloStatusFor", () => {
  it("healthy saat nilai jauh lebih baik dari target", () => {
    expect(sloStatusFor(TEST_DEFINITION, 1)).toBe("healthy");
    expect(sloStatusFor(TEST_DEFINITION, 0.999)).toBe("healthy");
  });

  it("warning saat lebih dari separuh error budget habis", () => {
    // 0.995: bad = 0.005, budget = 0.01, terpakai 50% -> tepat di batas warning.
    expect(sloStatusFor(TEST_DEFINITION, 0.995)).toBe("warning");
    expect(sloStatusFor(TEST_DEFINITION, 0.994)).toBe("warning");
  });

  it("critical saat error budget habis sepenuhnya", () => {
    expect(sloStatusFor(TEST_DEFINITION, 0.99)).toBe("critical");
    expect(sloStatusFor(TEST_DEFINITION, 0.5)).toBe("critical");
  });

  it("unknown untuk nilai bukan angka", () => {
    expect(sloStatusFor(TEST_DEFINITION, Number.NaN)).toBe("unknown");
  });

  it("memakai rumus berbeda untuk SLO lte dan gte", () => {
    const lte: SloDefinition = { ...TEST_DEFINITION, comparison: "lte", target: 0.5 };
    const gte: SloDefinition = { ...TEST_DEFINITION, comparison: "gte", target: 0.5 };

    // lte: sisa budget = 1 - value/target, jadi 0.2 memakai 40% anggaran.
    // gte: sisa = (value - target)/(1 - target), jadi 0.4 sudah habis total.
    expect(sloStatusFor(lte, 0.2)).toBe("healthy");
    expect(sloStatusFor(gte, 0.4)).toBe("critical");
  });
});

describe("error budget availability", () => {
  it("sisa anggaran 1.0 saat seluruh request berhasil", () => {
    pushRequests(1_000, 0);

    const summary = computeErrorBudget(NOW);

    expect(summary.hasData).toBe(true);
    expect(summary.availability).toBe(1);
    expect(summary.errorBudgetRemaining).toBe(1);
    expect(summary.budgetConsumedRatio).toBe(0);
    expect(summary.status).toBe("healthy");
    expect(summary.total).toBe(1_000);
    expect(summary.errors).toBe(0);
  });

  it("sisa anggaran 0.0 saat seluruh request gagal", () => {
    pushRequests(1_000, 1_000);

    const summary = computeErrorBudget(NOW);

    expect(summary.availability).toBe(0);
    expect(summary.errorBudgetRemaining).toBe(0);
    expect(summary.budgetConsumedRatio).toBe(1);
    expect(summary.status).toBe("critical");
  });

  it("membuang event di luar window", () => {
    pushRequests(10, 0);
    pushEvent(
      makeEvent({
        name: METRIC_NAMES.HTTP_SERVER_ERROR_COUNT,
        timestamp: new Date(NOW - 2 * DAY_MS).toISOString(),
      }),
    );

    const summary = computeErrorBudget(NOW);

    expect(summary.total).toBe(10);
    expect(summary.errors).toBe(0);
  });
});

describe("SLO per metrik", () => {
  it("availability dan error_rate memakai request versus error", () => {
    // 2000 + 5 = 2005 event, masih di bawah batas 5000 event per store.
    pushRequests(2_000, 5);

    const results = computeSlos(NOW);
    const availability = resultOf(results, "availability");
    const errorRate = resultOf(results, "error_rate");

    expect(availability.value).toBeCloseTo(0.9975, 6);
    expect(availability.comparison).toBe("gte");
    expect(availability.unit).toBe("1");
    expect(availability.windowLabel).toBe("24 jam terakhir");
    expect(errorRate.value).toBeCloseTo(0.0025, 6);
    expect(errorRate.comparison).toBe("lte");
  });

  it("latency_p95 mengonversi detik ke milidetik", () => {
    for (const seconds of [0.1, 0.2, 0.3, 0.4, 5]) {
      pushEvent(
        makeEvent({
          name: METRIC_NAMES.HTTP_SERVER_REQUEST_DURATION,
          kind: "histogram",
          value: seconds,
          timestamp: new Date(NOW - 60 * 60 * 1000).toISOString(),
        }),
      );
    }

    const latency = resultOf(computeSlos(NOW), "latency_p95");

    expect(latency.status).not.toBe("unknown");
    expect(latency.unit).toBe("ms");
    expect(latency.target).toBe(SLO_DEFINITIONS.latency_p95.target);
    // 5 sampel: indeks floor(5 * 0.95) = 4 -> sampel terakhir, 5000 ms.
    expect(latency.value).toBe(5_000);
    expect(latency.errorBudgetRemaining).toBeNull();
  });

  it("auth_success_rate memakai rumus gte dari jumlah event", () => {
    for (let index = 0; index < 90; index += 1) {
      pushEvent(
        makeEvent({
          name: METRIC_NAMES.LOGIN_ATTEMPT,
          timestamp: new Date(NOW - index * 60_000).toISOString(),
        }),
      );
    }

    for (let index = 0; index < 90; index += 1) {
      pushEvent(
        makeEvent({
          name: METRIC_NAMES.LOGIN_SUCCESS,
          timestamp: new Date(NOW - index * 60_000).toISOString(),
        }),
      );
    }

    const auth = resultOf(computeSlos(NOW), "auth_success_rate");

    expect(auth.value).toBe(1);
    // Rumus gte: (value - target) / (1 - target) -> 1 saat value = 1.
    expect(auth.errorBudgetRemaining).toBe(1);
    expect(auth.status).toBe("healthy");
    expect(auth.observedRatio).toBeCloseTo(1 / 0.95, 4);
  });

  it("auth_success_rate unknown tanpa percobaan login", () => {
    pushRequests(5, 0);

    const auth = resultOf(computeSlos(NOW), "auth_success_rate");

    expect(auth.status).toBe("unknown");
    expect(auth.errorBudgetRemaining).toBeNull();
  });
});

describe("burn rate", () => {
  it("bernilai 1.0 saat window penuh dan seluruh budget habis", () => {
    pushRequests(1_000, 1_000);

    const availability = resultOf(computeSlos(NOW), "availability");

    expect(availability.burnRate).toBe(1);
    expect(availability.status).toBe("critical");
  });

  it("naik saat data hanya mengisi sebagian kecil window", () => {
    // Satu event di detik terakhir: window 24 jam baru terisi 0.01% ish.
    pushEvent(
      makeEvent({ timestamp: new Date(NOW - 1_000).toISOString() }),
    );
    pushEvent(
      makeEvent({
        name: METRIC_NAMES.HTTP_SERVER_ERROR_COUNT,
        timestamp: new Date(NOW - 1_000).toISOString(),
      }),
    );

    const availability = resultOf(computeSlos(NOW), "availability");

    expect(availability.burnRate).toBeGreaterThan(1);
    expect(availability.errorBudgetRemaining).toBe(0);
  });

  it("bernilai 0 saat target terpenuhi", () => {
    pushRequests(100, 0);

    const availability = resultOf(computeSlos(NOW), "availability");

    expect(availability.burnRate).toBe(0);
    expect(availability.status).toBe("healthy");
  });
});

describe("determinisme", () => {
  it("menghasilkan snapshot identik untuk now yang sama", () => {
    pushRequests(100, 2);

    const first = computeSlos(NOW);
    const second = computeSlos(NOW);

    expect(second).toEqual(first);
    expect(computeErrorBudget(NOW)).toEqual(computeErrorBudget(NOW));
  });

  it("menghormati now tanpa membaca jam sistem", () => {
    pushEvent(
      makeEvent({ timestamp: new Date(NOW - DAY_MS - 1_000).toISOString() }),
    );

    // Event-nya di luar window ketika now dipatok, sehingga tidak ada data.
    expect(computeErrorBudget(NOW).hasData).toBe(false);
    expect(computeErrorBudget(NOW - DAY_MS).hasData).toBe(true);
  });
});
