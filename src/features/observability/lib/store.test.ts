import { beforeEach, describe, expect, it } from "vitest";

import {
  CARDINALITY_LIMITS,
  OTHER_TAG_VALUE,
} from "@/features/observability/lib/cardinality";
import {
  DEFAULT_RETENTION_MS,
  getEvents,
  getSeriesCount,
  getTotalEvents,
  pruneExpiredEvents,
  pushEvent,
  resetStore,
} from "@/features/observability/lib/store";
import type { MetricEvent } from "@/features/observability/types";

const METRIC = "http.server.request.count";
const DAY_MS = 24 * 60 * 60 * 1000;

let sequence = 0;

function makeEvent(overrides: Partial<MetricEvent> = {}): MetricEvent {
  sequence += 1;

  return {
    id: `evt-${sequence}`,
    timestamp: new Date().toISOString(),
    name: METRIC,
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

describe("pushEvent", () => {
  it("membatasi jumlah event dan mempertahankan event terbaru", () => {
    const base = Date.now();

    for (let index = 0; index < 5_100; index += 1) {
      pushEvent(
        makeEvent({ timestamp: new Date(base + index * 1_000).toISOString() }),
      );
    }

    expect(getTotalEvents()).toBe(5_000);
    expect(getEvents()[0]?.timestamp).toBe(
      new Date(base + 100 * 1_000).toISOString(),
    );
  });

  it("menyimpan event tanpa tag dan dengan satuan", () => {
    pushEvent(makeEvent({ unit: "s", tags: { "http.route": "/health" } }));

    const [event] = getEvents();

    expect(event?.unit).toBe("s");
    expect(event?.tags["http.route"]).toBe("/health");
  });

  it("menghormati batas retensi yang diberikan per pemanggilan", () => {
    pushEvent(
      makeEvent({
        timestamp: new Date(Date.now() - 60_000).toISOString(),
      }),
      { retentionMs: 1_000 },
    );

    expect(pruneExpiredEvents()).toBe(1);
    expect(getTotalEvents()).toBe(0);
  });
});

describe("pruneExpiredEvents", () => {
  it("membuang event lama, mengembalikan jumlahnya, dan menyisakan event baru", () => {
    const expired = new Date(Date.now() - DEFAULT_RETENTION_MS - DAY_MS).toISOString();

    pushEvent(makeEvent({ timestamp: expired }));
    pushEvent(
      makeEvent({ timestamp: new Date(Date.now() - DEFAULT_RETENTION_MS + DAY_MS).toISOString() }),
    );
    pushEvent(makeEvent());

    const pruned = pruneExpiredEvents();

    expect(pruned).toBe(1);
    expect(getTotalEvents()).toBe(2);
    expect(getEvents().some((event) => event.timestamp === expired)).toBe(false);
  });

  it("tidak membuang apa pun saat seluruh event masih di dalam retensi", () => {
    pushEvent(makeEvent());
    pushEvent(makeEvent());

    expect(pruneExpiredEvents()).toBe(0);
    expect(getTotalEvents()).toBe(2);
  });
});

describe("getSeriesCount", () => {
  it("naik sesuai jumlah nilai unik dalam batas", () => {
    pushEvent(makeEvent({ tags: { "http.route": "/a" } }));
    pushEvent(makeEvent({ tags: { "http.route": "/b" } }));
    pushEvent(makeEvent({ tags: { "http.route": "/a" } }));

    expect(getSeriesCount(METRIC)).toBe(2);
    expect(getSeriesCount()).toBe(2);
  });

  it("tidak naik lagi setelah batas nilai per tag terlampaui", () => {
    for (let index = 1; index <= CARDINALITY_LIMITS.perTag; index += 1) {
      pushEvent(makeEvent({ tags: { "http.route": `/rute-${index}` } }));
    }

    const beforeOverflow = getSeriesCount(METRIC);

    for (let index = 0; index < 200; index += 1) {
      pushEvent(makeEvent({ tags: { "http.route": `/rute-kolom-${index}` } }));
    }

    expect(getSeriesCount(METRIC)).toBe(beforeOverflow + 1);
    expect(beforeOverflow).toBe(CARDINALITY_LIMITS.perTag);
    expect(
      getEvents({ tags: { "http.route": OTHER_TAG_VALUE } }).length,
    ).toBeGreaterThan(0);
  });

  it("tidak pernah melewati batas totalSeries per metrik", () => {
    for (let index = 0; index < 600; index += 1) {
      pushEvent(
        makeEvent({
          name: "app.server_action.latency",
          kind: "histogram",
          value: index,
          tags: { action: `aksi-${index}`, status: "success" },
        }),
      );
    }

    expect(getSeriesCount("app.server_action.latency")).toBeLessThanOrEqual(
      CARDINALITY_LIMITS.totalSeries,
    );
  });

  it("menghitung series per metrik secara terpisah", () => {
    pushEvent(makeEvent({ name: "auth.login.success", tags: { via: "otp" } }));
    pushEvent(makeEvent({ name: "auth.login.failure", tags: { via: "otp" } }));

    expect(getSeriesCount("auth.login.success")).toBe(1);
    expect(getSeriesCount("auth.login.failure")).toBe(1);
    expect(getSeriesCount()).toBe(2);
    expect(getSeriesCount("tidak.ada")).toBe(0);
  });
});

describe("getEvents", () => {
  it("menyaring berdasarkan tag dengan semantik AND", () => {
    pushEvent(
      makeEvent({ tags: { "http.method": "GET", "http.route": "/users" } }),
    );
    pushEvent(
      makeEvent({ tags: { "http.method": "POST", "http.route": "/users" } }),
    );
    pushEvent(
      makeEvent({ tags: { "http.method": "POST", "http.route": "/orders" } }),
    );

    expect(getEvents({ tags: { "http.route": "/users" } })).toHaveLength(2);
    expect(
      getEvents({ tags: { "http.method": "POST", "http.route": "/users" } }),
    ).toHaveLength(1);
    expect(getEvents({ tags: { "http.route": "/tidak-ada" } })).toHaveLength(0);
  });

  it("tetap kompatibel dengan filter lama tanpa tags", () => {
    pushEvent(makeEvent({ name: "auth.login.success", actorId: "usr_a" }));
    pushEvent(makeEvent({ name: "auth.login.failure", actorId: "usr_b" }));

    expect(getEvents({ name: "auth.login.success" })).toHaveLength(1);
    expect(getEvents({ actorId: "usr_b" })).toHaveLength(1);
    expect(getEvents()).toHaveLength(2);
  });
});
