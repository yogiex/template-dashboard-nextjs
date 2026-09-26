import { beforeEach, describe, expect, it } from "vitest";

import { METRIC_NAMES } from "@/features/observability/lib/constants";
import {
  getPolicyForMetric,
  getRetentionWindowMs,
  getTierForAge,
  listMetricRetentionPolicies,
  listUnclassifiedMetrics,
  METRIC_RETENTION_POLICIES,
  summarizeRetention,
  type MetricRetentionPolicy,
} from "@/features/observability/lib/metric-retention";
import {
  DEFAULT_RETENTION_MS,
  pushEvent,
  resetStore,
} from "@/features/observability/lib/store";
import type { MetricEvent } from "@/features/observability/types";

/**
 * `now` selalu diinjeksi supaya batas tier bisa diuji pada angka yang persis,
 * bukan "sekitar 7 hari". `NOW` diambil dari jam sistem karena `pushEvent()`
 * memakai `Date.now()` untuk pruning periodik; event buatan selalu baru
 * sehingga tidak pernah ikut terbuang.
 */
const NOW = Date.now();
const DAY_MS = 24 * 60 * 60 * 1000;

/** Policy uji dengan batas tier yang mudah dihitung: 1/2/3 hari. */
const TEST_POLICY: MetricRetentionPolicy = {
  id: "uji",
  label: "Policy uji",
  description: "Policy dengan batas tier 1, 2, dan 3 hari.",
  hotDays: 1,
  warmDays: 2,
  coldDays: 3,
  legalBasis: "Kebutuhan uji.",
  autoApply: false,
};

function policyById(id: string): MetricRetentionPolicy {
  const found = METRIC_RETENTION_POLICIES.find((policy) => policy.id === id);

  if (!found) {
    throw new Error(`Policy ${id} tidak ada di konfigurasi.`);
  }

  return found;
}

let sequence = 0;

function makeEvent(overrides: Partial<MetricEvent> = {}): MetricEvent {
  sequence += 1;

  return {
    id: `evt-${sequence}`,
    timestamp: new Date(NOW - DAY_MS).toISOString(),
    name: METRIC_NAMES.HTTP_SERVER_REQUEST_COUNT,
    kind: "counter",
    value: 1,
    tags: {},
    ...overrides,
  };
}

beforeEach(() => {
  sequence = 0;
  resetStore();
});

describe("getTierForAge", () => {
  it("memakai batas setengah terbuka di hotDays, warmDays, dan coldDays", () => {
    // hot: [0, 1 hari)
    expect(getTierForAge(0, TEST_POLICY)).toBe("hot");
    expect(getTierForAge(DAY_MS - 1, TEST_POLICY)).toBe("hot");

    // 1 hari sudah keluar dari hot.
    expect(getTierForAge(DAY_MS, TEST_POLICY)).toBe("warm");
    expect(getTierForAge(3 * DAY_MS - 1, TEST_POLICY)).toBe("warm");

    // 1 + 2 = 3 hari sudah keluar dari warm.
    expect(getTierForAge(3 * DAY_MS, TEST_POLICY)).toBe("cold");
    expect(getTierForAge(6 * DAY_MS - 1, TEST_POLICY)).toBe("cold");

    // 1 + 2 + 3 = 6 hari sudah masuk dispose.
    expect(getTierForAge(6 * DAY_MS, TEST_POLICY)).toBe("dispose");
    expect(getTierForAge(400 * DAY_MS, TEST_POLICY)).toBe("dispose");
  });

  it("monoton: usia lebih tua tidak pernah kembali ke tier yang lebih muda", () => {
    const order = ["hot", "warm", "cold", "dispose"] as const;
    const policy = policyById("http-traffic");
    let previous = 0;

    for (let age = 0; age <= 60 * DAY_MS; age += 3 * 60 * 60 * 1000) {
      const tier = getTierForAge(age, policy);
      const index = order.indexOf(tier);

      expect(index).toBeGreaterThanOrEqual(previous);
      previous = index;
    }
  });

  it("menganggap usia negatif dan tidak valid sebagai hot, bukan dispose", () => {
    // Timestamp di masa depan (jam server meleset) bukan alasan untuk membuang
    // event, jadi harus diperlakukan sebagai yang termuda.
    expect(getTierForAge(-1, TEST_POLICY)).toBe("hot");
    expect(getTierForAge(-10 * DAY_MS, TEST_POLICY)).toBe("hot");
    expect(getTierForAge(Number.NaN, TEST_POLICY)).toBe("hot");
    expect(getTierForAge(Number.POSITIVE_INFINITY, TEST_POLICY)).toBe("hot");
  });

  it("getRetentionWindowMs menjumlahkan ketiga masa tier", () => {
    expect(getRetentionWindowMs(TEST_POLICY)).toBe(6 * DAY_MS);
    expect(getRetentionWindowMs(policyById("security-auth"))).toBe(11 * DAY_MS);
  });
});

describe("getPolicyForMetric", () => {
  it("memetakan tiap kelompok metrik ke policy yang berbeda", () => {
    expect(getPolicyForMetric(METRIC_NAMES.LOGIN_FAILURE).id).toBe("security-auth");
    expect(getPolicyForMetric(METRIC_NAMES.ACCESS_DENIED).id).toBe("security-auth");
    expect(getPolicyForMetric(METRIC_NAMES.RATE_LIMIT_HIT).id).toBe("security-auth");

    expect(getPolicyForMetric(METRIC_NAMES.NODEJS_EVENT_LOOP_LAG).id).toBe(
      "runtime-health",
    );
    expect(getPolicyForMetric(METRIC_NAMES.NODEJS_MEMORY_RSS_BYTES).id).toBe(
      "runtime-health",
    );

    expect(getPolicyForMetric(METRIC_NAMES.HTTP_SERVER_REQUEST_DURATION).id).toBe(
      "http-traffic",
    );
    expect(getPolicyForMetric(METRIC_NAMES.SERVER_ACTION_LATENCY).id).toBe(
      "http-traffic",
    );

    expect(getPolicyForMetric(METRIC_NAMES.PAGE_VIEW).id).toBe("product-usage");
    expect(getPolicyForMetric(METRIC_NAMES.USER_DELETE).id).toBe("product-usage");
  });

  it("memberi retensi terpendek pada metrik keamanan dibanding HTTP", () => {
    const security = getPolicyForMetric(METRIC_NAMES.LOGIN_FAILURE);
    const http = getPolicyForMetric(METRIC_NAMES.HTTP_SERVER_REQUEST_COUNT);

    expect(getRetentionWindowMs(security)).toBeLessThan(getRetentionWindowMs(http));
  });

  it("jatuh ke policy fallback untuk metrik yang tidak dikenal", () => {
    const fallback = getPolicyForMetric("custom.metric.baru");

    expect(fallback.id).toBe("unclassified");
    // Fallback tidak boleh dipakai untuk pruning otomatis: pruning yang
    // berjalan tetap milik store.
    expect(fallback.autoApply).toBe(false);
  });
});

describe("listMetricRetentionPolicies", () => {
  it("mengembalikan semua policy dengan daftar metrik yang urut", () => {
    const policies = listMetricRetentionPolicies();

    expect(policies).toHaveLength(METRIC_RETENTION_POLICIES.length);

    for (const policy of policies) {
      const sorted = [...policy.metrics].sort();

      expect(policy.metrics).toEqual(sorted);
    }
  });

  it("policy fallback tidak punya daftar metrik karena itu bukan hasil pencocokan", () => {
    const fallback = listMetricRetentionPolicies().find(
      (policy) => policy.id === "unclassified",
    );

    expect(fallback?.metrics).toEqual([]);
  });

  it("tidak ada metrik yang masuk dua kelompok", () => {
    const seen = new Set<string>();

    for (const policy of listMetricRetentionPolicies()) {
      for (const metric of policy.metrics) {
        expect(seen.has(metric)).toBe(false);
        seen.add(metric);
      }
    }
  });
});

describe("summarizeRetention", () => {
  it("menandai store kosong tanpa mengarang usia event", () => {
    const summary = summarizeRetention(NOW);

    expect(summary.oldestEventAt).toBeNull();
    expect(summary.totalEvents).toBe(0);
    expect(summary.defaultRetentionMs).toBe(DEFAULT_RETENTION_MS);
    expect(summary.volatile).toBe(true);

    for (const policy of summary.policies) {
      expect(policy.oldestAgeMs).toBeNull();
      expect(policy.oldestEventAt).toBeNull();
      expect(policy.eventCount).toBe(0);
      expect(policy.currentTier).toBe("hot");
    }
  });

  it("menghitung usia dan tier dari event tertua tiap kelompok", () => {
    // Event runtime tertua 3 hari lalu. Policy runtime-health punya batas
    // hot 1 hari dan warm 3 hari, jadi usia 3 hari sudah keluar dari hot tapi
    // belum keluar dari warm.
    pushEvent(
      makeEvent({
        name: METRIC_NAMES.NODEJS_EVENT_LOOP_LAG,
        timestamp: new Date(NOW - 3 * DAY_MS).toISOString(),
      }),
    );
    pushEvent(
      makeEvent({
        name: METRIC_NAMES.LOGIN_FAILURE,
        timestamp: new Date(NOW - 2 * 60 * 60 * 1000).toISOString(),
      }),
    );
    pushEvent(
      makeEvent({
        name: METRIC_NAMES.HTTP_SERVER_REQUEST_COUNT,
        timestamp: new Date(NOW - 5 * 60 * 60 * 1000).toISOString(),
      }),
    );

    const summary = summarizeRetention(NOW);
    const byId = new Map(summary.policies.map((policy) => [policy.id, policy]));

    expect(summary.totalEvents).toBe(3);
    expect(summary.oldestEventAt).toBe(new Date(NOW - 3 * DAY_MS).toISOString());

    const runtime = byId.get("runtime-health");
    expect(runtime?.oldestAgeMs).toBe(3 * DAY_MS);
    expect(runtime?.currentTier).toBe("warm");
    expect(runtime?.eventCount).toBe(1);

    const security = byId.get("security-auth");
    expect(security?.oldestAgeMs).toBe(2 * 60 * 60 * 1000);
    // 2 jam masih di dalam hot (batas 1 hari).
    expect(security?.currentTier).toBe("hot");
    expect(security?.eventCount).toBe(1);

    const http = byId.get("http-traffic");
    expect(http?.eventCount).toBe(1);
    expect(http?.currentTier).toBe("hot");
  });

  it("menandai event ber-timestamp rusak tanpa membuat usia NaN", () => {
    pushEvent(makeEvent({ timestamp: "bukan-tanggal" }));

    const summary = summarizeRetention(NOW);

    expect(summary.totalEvents).toBe(1);
    expect(summary.oldestEventAt).toBe("bukan-tanggal");

    for (const policy of summary.policies) {
      expect(policy.oldestAgeMs).not.toBeNaN();
    }
  });

  it("totalDays konsisten dengan penjumlahan masa tier", () => {
    for (const policy of summarizeRetention(NOW).policies) {
      expect(policy.totalDays).toBe(policy.hotDays + policy.warmDays + policy.coldDays);
    }
  });
});

describe("listUnclassifiedMetrics", () => {
  it("hanya memuat nama metrik yang tidak masuk kelompok mana pun", () => {
    pushEvent(makeEvent({ name: METRIC_NAMES.LOGIN_SUCCESS }));
    pushEvent(makeEvent({ name: "custom.metric.baru" }));
    pushEvent(makeEvent({ name: "custom.metric.lain" }));

    expect(listUnclassifiedMetrics()).toEqual([
      "custom.metric.baru",
      "custom.metric.lain",
    ]);
  });

  it("kosong saat semua metrikstore sudah terklasifikasi", () => {
    pushEvent(makeEvent({ name: METRIC_NAMES.PAGE_VIEW }));

    expect(listUnclassifiedMetrics()).toEqual([]);
  });
});
