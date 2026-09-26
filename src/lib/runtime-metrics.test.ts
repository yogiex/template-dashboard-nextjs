import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  collectRuntimeSample,
  getRuntimeSnapshot,
  isRuntimeMetricsRunning,
  startRuntimeMetrics,
  stopRuntimeMetrics,
} from "@/lib/runtime-metrics";

/**
 * `trackMetric` di-stub supaya test tidak menyentuh event store/UEBA. Yang
 * diuji di sini adalah siklus sampling, bukan event store-nya; itu punya test
 * sendiri.
 */
vi.mock("@/features/observability/lib/track", () => ({
  trackMetric: vi.fn(),
  withMetric: vi.fn(),
}));

const NUMERIC_FIELDS = [
  "eventLoopLagMeanMs",
  "eventLoopLagP99Ms",
  "heapUsedBytes",
  "rssBytes",
  "cpuUserMs",
  "cpuSystemMs",
  "uptimeSeconds",
] as const;

beforeEach(() => {
  stopRuntimeMetrics();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
});

afterEach(() => {
  // Selalu stop supaya timer dan histogram event loop tidak bocor ke test lain.
  stopRuntimeMetrics();
  vi.useRealTimers();
});

describe("getRuntimeSnapshot", () => {
  // Harus dieksekusi sebelum test yang memanggil `startRuntimeMetrics`, karena
  // state modul bertahan antar-test dalam satu file.
  it("null sebelum sampling pernah dijalankan", () => {
    expect(isRuntimeMetricsRunning()).toBe(false);
    expect(getRuntimeSnapshot()).toBeNull();
  });
});

describe("collectRuntimeSample", () => {
  it("mengembalikan angka finite dan non-negatif", () => {
    const sample = collectRuntimeSample();

    for (const field of NUMERIC_FIELDS) {
      expect(Number.isFinite(sample[field]), field).toBe(true);
      expect(sample[field], field).toBeGreaterThanOrEqual(0);
    }
  });

  it("menyertakan sampledAt berupa ISO string yang bisa diparse", () => {
    const sample = collectRuntimeSample();

    expect(sample.sampledAt).toBe("2026-01-01T00:00:00.000Z");
    expect(Number.isNaN(Date.parse(sample.sampledAt))).toBe(false);
  });

  it("tidak melempar saat event loop monitor belum aktif", () => {
    const sample = collectRuntimeSample();

    expect(sample.eventLoopLagMeanMs).toBe(0);
    expect(sample.eventLoopLagP99Ms).toBe(0);
    expect(sample.heapUsedBytes).toBeGreaterThan(0);
  });
});

describe("startRuntimeMetrics", () => {
  it("idempoten: panggilan kedua tidak membuat timer kedua", () => {
    const first = startRuntimeMetrics({ intervalMs: 1_000 });
    const second = startRuntimeMetrics({ intervalMs: 1_000 });

    expect(typeof first).toBe("function");
    expect(second).toBe(first);
    expect(isRuntimeMetricsRunning()).toBe(true);
  });

  it("menjepit interval di bawah 1 detik ke batas minimum", () => {
    const stop = startRuntimeMetrics({ intervalMs: 10 });

    // 10 ms dijepit jadi 1000 ms, jadi satu tick fake timer belum cukup.
    vi.advanceTimersByTime(999);
    const beforeTick = getRuntimeSnapshot();

    vi.advanceTimersByTime(1);
    const afterTick = getRuntimeSnapshot();

    expect(afterTick).not.toBeNull();
    expect(afterTick?.sampledAt).not.toBe(beforeTick?.sampledAt);
    expect(afterTick?.uptimeSeconds).toBeGreaterThanOrEqual(
      beforeTick?.uptimeSeconds ?? 0,
    );

    stop();
  });

  it("mengisi snapshot saat start dan memperbaruinya setiap tick", () => {
    const stop = startRuntimeMetrics({ intervalMs: 1_000 });

    const initial = getRuntimeSnapshot();

    expect(initial).not.toBeNull();
    expect(initial?.sampledAt).toBe("2026-01-01T00:00:00.000Z");

    vi.advanceTimersByTime(1_000);

    const next = getRuntimeSnapshot();

    expect(next).not.toBeNull();
    expect(next?.sampledAt).toBe("2026-01-01T00:00:01.000Z");

    stop();
  });
});

describe("stopRuntimeMetrics", () => {
  it("menghentikan timer sehingga sampling tidak lanjut", () => {
    const stop = startRuntimeMetrics({ intervalMs: 1_000 });

    vi.advanceTimersByTime(1_000);

    const beforeStop = getRuntimeSnapshot();

    stop();

    expect(isRuntimeMetricsRunning()).toBe(false);

    vi.advanceTimersByTime(5_000);

    expect(getRuntimeSnapshot()).toBe(beforeStop);
  });

  it("aman dipanggil berulang kali", () => {
    const stop = startRuntimeMetrics({ intervalMs: 1_000 });

    stop();

    expect(() => {
      stopRuntimeMetrics();
    }).not.toThrow();
    expect(isRuntimeMetricsRunning()).toBe(false);
  });

  it("membolehkan start ulang setelah stop", () => {
    startRuntimeMetrics({ intervalMs: 1_000 });
    stopRuntimeMetrics();

    const restart = startRuntimeMetrics({ intervalMs: 1_000 });

    expect(isRuntimeMetricsRunning()).toBe(true);

    restart();
  });
});
