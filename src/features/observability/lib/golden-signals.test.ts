import { beforeEach, describe, expect, it } from "vitest";

import {
  METRIC_NAMES,
  OTEL_ATTRIBUTE_KEYS,
} from "@/features/observability/lib/constants";
import { getGoldenSignals } from "@/features/observability/lib/golden-signals";
import { pushEvent, resetStore } from "@/features/observability/lib/store";
import type { MetricEvent } from "@/features/observability/types";

/**
 * Basis waktu diambil sekali dari jam sistem, bukan dari konstanta tetap.
 * `pruneExpiredEvents()` membandingkan timestamp event dengan `Date.now()` dan
 * batas retensi 7 hari, jadi timestamp buatan yang terlalu lama akan dibuang
 * saat prune berjalan dan test-nya menguji data yang sebenarnya tidak ada.
 * Nilai `NOW` sendiri tetap konstan selama satu kali jalan test.
 */
const NOW = Date.now();
const HOUR_MS = 60 * 60 * 1000;

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

function pushRequest(route: string, count: number, at = NOW): void {
  for (let index = 0; index < count; index += 1) {
    pushEvent(
      makeEvent({
        timestamp: new Date(at - index * 1_000).toISOString(),
        tags: { [OTEL_ATTRIBUTE_KEYS.ROUTE]: route },
      }),
    );
  }
}

function pushError(route: string, count: number, at = NOW): void {
  for (let index = 0; index < count; index += 1) {
    pushEvent(
      makeEvent({
        name: METRIC_NAMES.HTTP_SERVER_ERROR_COUNT,
        timestamp: new Date(at - index * 1_000).toISOString(),
        tags: { [OTEL_ATTRIBUTE_KEYS.ROUTE]: route },
      }),
    );
  }
}

function pushDuration(route: string, seconds: number): void {
  pushEvent(
    makeEvent({
      name: METRIC_NAMES.HTTP_SERVER_REQUEST_DURATION,
      kind: "histogram",
      value: seconds,
      tags: { [OTEL_ATTRIBUTE_KEYS.ROUTE]: route },
    }),
  );
}

beforeEach(() => {
  sequence = 0;
  resetStore();
});

describe("getGoldenSignals tanpa data", () => {
  it("menandai snapshot sebagai belum ada data", () => {
    const snapshot = getGoldenSignals(NOW);

    expect(snapshot.hasData).toBe(false);
    expect(snapshot.traffic.total).toBe(0);
    expect(snapshot.errors.rate).toBe(0);
    expect(snapshot.traffic.byRoute).toEqual([]);
  });

  it("mengisi saturasi dengan null, bukan angka rekaan", () => {
    const { saturation } = getGoldenSignals(NOW);

    expect(saturation.hasData).toBe(false);
    expect(saturation.eventLoopLagMs).toBeNull();
    expect(saturation.heapUsedBytes).toBeNull();
    expect(saturation.rssBytes).toBeNull();
    expect(saturation.activeRequests).toBeNull();
    expect(saturation.cpuUserMs).toBeNull();
    expect(saturation.uptimeSeconds).toBeNull();
  });
});

describe("traffic dan errors", () => {
  it("menghitung error rate per route dengan benar", () => {
    pushRequest("/dashboard", 8);
    pushError("/dashboard", 2);
    pushRequest("/users", 10);

    const snapshot = getGoldenSignals(NOW);
    const dashboard = snapshot.traffic.byRoute.find(
      (route) => route.route === "/dashboard",
    );

    expect(snapshot.hasData).toBe(true);
    expect(snapshot.traffic.total).toBe(18);
    expect(snapshot.errors.total).toBe(2);
    expect(snapshot.errors.rate).toBeCloseTo(2 / 18, 4);
    expect(dashboard?.requests).toBe(8);
    expect(dashboard?.errors).toBe(2);
    expect(dashboard?.errorRate).toBe(0.25);
  });

  it("menganggap route dengan error tanpa request 100% error", () => {
    pushError("/health", 1);

    const snapshot = getGoldenSignals(NOW);

    expect(snapshot.errors.byRoute[0]?.route).toBe("/health");
    expect(snapshot.errors.byRoute[0]?.errorRate).toBe(1);
    expect(snapshot.errors.rate).toBe(0);
  });

  it("mengelompokkan event tanpa tag route ke satu kelompok", () => {
    pushEvent(makeEvent());

    expect(getGoldenSignals(NOW).traffic.byRoute[0]?.route).toBe("(tanpa route)");
  });

  it("mengabaikan event di luar window satu jam", () => {
    pushRequest("/lama", 5, NOW - 2 * HOUR_MS);

    expect(getGoldenSignals(NOW).hasData).toBe(false);
  });

  it("mengurutkan route berdasarkan jumlah request lalu nama route", () => {
    pushRequest("/b", 3);
    pushRequest("/a", 3);
    pushRequest("/c", 5);

    expect(getGoldenSignals(NOW).traffic.byRoute.map((route) => route.route)).toEqual([
      "/c",
      "/a",
      "/b",
    ]);
  });
});

describe("byRoute", () => {
  it("membatasi 10 route teratas", () => {
    for (let index = 1; index <= 15; index += 1) {
      pushRequest(`/rute-${index}`, index);
    }

    const byRoute = getGoldenSignals(NOW).traffic.byRoute;

    expect(byRoute).toHaveLength(10);
    expect(byRoute[0]?.route).toBe("/rute-15");
    expect(byRoute[9]?.route).toBe("/rute-6");
  });
});

describe("latency", () => {
  it("mengonversi detik ke milidetik dan membulatkan dua desimal", () => {
    pushDuration("/api", 0.123);

    const snapshot = getGoldenSignals(NOW);

    expect(snapshot.latency.overall.p50Ms).toBe(123);
    expect(snapshot.latency.overall.p95Ms).toBe(123);
    expect(snapshot.latency.overall.p99Ms).toBe(123);
    expect(snapshot.latency.byRoute[0]?.p95Ms).toBe(123);
  });

  it("menghitung persentil dari sampel tersortir", () => {
    for (let index = 1; index <= 100; index += 1) {
      pushDuration("/api", index / 100);
    }

    const { overall } = getGoldenSignals(NOW).latency;

    // Sampling persentil memakai indeks berbasis 0, sama seperti `summarize()`:
    // floor(100 * 0.5) = 50 -> sampel ke-51 -> 0.51 s = 510 ms.
    expect(overall.p50Ms).toBe(510);
    expect(overall.p95Ms).toBe(960);
    expect(overall.p99Ms).toBe(1_000);
  });
});

describe("saturasi", () => {
  it("mengambil sample terakhir tiap metrik runtime", () => {
    pushEvent(
      makeEvent({
        name: METRIC_NAMES.NODEJS_EVENT_LOOP_LAG,
        kind: "gauge",
        value: 12,
        timestamp: new Date(NOW - 60_000).toISOString(),
      }),
    );
    pushEvent(
      makeEvent({
        name: METRIC_NAMES.NODEJS_EVENT_LOOP_LAG,
        kind: "gauge",
        value: 4.567,
        timestamp: new Date(NOW - 1_000).toISOString(),
      }),
    );
    pushEvent(
      makeEvent({
        name: METRIC_NAMES.NODEJS_MEMORY_HEAP_USED_BYTES,
        kind: "gauge",
        value: 1_048_576,
      }),
    );
    pushEvent(
      makeEvent({
        name: METRIC_NAMES.HTTP_SERVER_ACTIVE_REQUESTS,
        kind: "gauge",
        value: 3,
      }),
    );
    pushEvent(
      makeEvent({
        name: METRIC_NAMES.PROCESS_UPTIME_SECONDS,
        kind: "gauge",
        value: 3_600,
      }),
    );

    const { saturation } = getGoldenSignals(NOW);

    expect(saturation.hasData).toBe(true);
    expect(saturation.eventLoopLagMs).toBe(4.57);
    expect(saturation.heapUsedBytes).toBe(1_048_576);
    expect(saturation.activeRequests).toBe(3);
    expect(saturation.uptimeSeconds).toBe(3_600);
    // Metrik runtime yang tidak dikumpulkan tetap null.
    expect(saturation.rssBytes).toBeNull();
    expect(saturation.cpuUserMs).toBeNull();
  });
});

describe("determinisme", () => {
  it("menghasilkan snapshot identik untuk now yang sama", () => {
    pushRequest("/a", 3);
    pushError("/a", 1);
    pushDuration("/a", 0.2);

    expect(getGoldenSignals(NOW)).toEqual(getGoldenSignals(NOW));
  });
});
