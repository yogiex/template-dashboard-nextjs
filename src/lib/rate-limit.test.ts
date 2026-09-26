import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/lib/error";
import {
  enforceRateLimit,
  getRateLimitState,
  resetRateLimit,
} from "@/lib/rate-limit";

const WINDOW_MS = 1_000;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("enforceRateLimit", () => {
  it("melewatkan percobaan sampai batas dan menolak berikutnya", () => {
    const options = { maxAttempts: 3, windowMs: WINDOW_MS };

    expect(() => {
      enforceRateLimit("user-a", "login", options);
      enforceRateLimit("user-a", "login", options);
      enforceRateLimit("user-a", "login", options);
    }).not.toThrow();

    expect(() => enforceRateLimit("user-a", "login", options)).toThrow(AppError);
  });

  it("melempar AppError RATE_LIMITED dengan pesan generik", () => {
    const options = { maxAttempts: 1, windowMs: WINDOW_MS };
    enforceRateLimit("user-b", "login", options);

    let caught: unknown;
    try {
      enforceRateLimit("user-b", "login", options);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AppError);
    const error = caught as AppError;
    expect(error.code).toBe("RATE_LIMITED");
    expect(error.status).toBe(429);
    expect(error.message).not.toContain(String(options.maxAttempts));
    expect(error.message).not.toContain("window");
  });

  it("memisahkan identifier satu sama lain", () => {
    const options = { maxAttempts: 1, windowMs: WINDOW_MS };

    enforceRateLimit("user-c", "login", options);
    expect(() => enforceRateLimit("user-c", "login", options)).toThrow(AppError);
    expect(() => enforceRateLimit("user-d", "login", options)).not.toThrow();
  });

  it("memisahkan purpose yang berbeda untuk identifier yang sama", () => {
    const options = { maxAttempts: 1, windowMs: WINDOW_MS };

    enforceRateLimit("user-e", "login", options);
    expect(() => enforceRateLimit("user-e", "login", options)).toThrow(AppError);
    expect(() => enforceRateLimit("user-e", "reset-password", options)).not.toThrow();
  });

  it("memisahkan bucket berdasarkan nilai limit yang berbeda", () => {
    enforceRateLimit("user-f", "login", { maxAttempts: 1, windowMs: WINDOW_MS });

    expect(() =>
      enforceRateLimit("user-f", "login", { maxAttempts: 5, windowMs: WINDOW_MS }),
    ).not.toThrow();
  });

  it("melepaskan identifier kembali setelah jendela bergeser", () => {
    const options = { maxAttempts: 2, windowMs: WINDOW_MS };

    enforceRateLimit("user-g", "login", options);
    enforceRateLimit("user-g", "login", options);
    expect(() => enforceRateLimit("user-g", "login", options)).toThrow(AppError);

    vi.advanceTimersByTime(WINDOW_MS + 1);

    expect(() => enforceRateLimit("user-g", "login", options)).not.toThrow();
  });

  it("menerapkan sliding window, bukan fixed window", () => {
    const options = { maxAttempts: 2, windowMs: WINDOW_MS };
    const start = Date.now();

    vi.setSystemTime(start + 900);
    expect(() => enforceRateLimit("user-h", "login", options)).not.toThrow();

    vi.setSystemTime(start + 1_100);
    expect(() => enforceRateLimit("user-h", "login", options)).not.toThrow();

    //_fixed window_ yang mulai di t=0 akan mengizinkan percobaan ketiga ini,
    // karena t=900 masih di jendela sebelumnya. Sliding window tidak.
    vi.setSystemTime(start + 1_150);
    expect(() => enforceRateLimit("user-h", "login", options)).toThrow(AppError);
  });
});

describe("getRateLimitState", () => {
  it("mengembalikan keadaan awal tanpa mencatat percobaan", () => {
    const options = { maxAttempts: 3, windowMs: WINDOW_MS };
    const state = getRateLimitState("user-i", "login", options);

    expect(state.count).toBe(0);
    expect(state.remaining).toBe(3);
    expect(state.limited).toBe(false);
  });

  it("tidak menambah hitungan sendiri saat dipanggil berulang", () => {
    const options = { maxAttempts: 3, windowMs: WINDOW_MS };

    getRateLimitState("user-j", "login", options);
    getRateLimitState("user-j", "login", options);

    expect(getRateLimitState("user-j", "login", options).count).toBe(0);
  });

  it("melaporkan sisa kuota dan status terbatas", () => {
    const options = { maxAttempts: 2, windowMs: WINDOW_MS };

    enforceRateLimit("user-k", "login", options);
    expect(getRateLimitState("user-k", "login", options)).toMatchObject({
      count: 1,
      remaining: 1,
      limited: false,
    });

    enforceRateLimit("user-k", "login", options);
    expect(getRateLimitState("user-k", "login", options)).toMatchObject({
      count: 2,
      remaining: 0,
      limited: true,
    });
  });

  it("memberikan resetAt di akhir jendela untuk hitungan terakhir", () => {
    const options = { maxAttempts: 2, windowMs: WINDOW_MS };
    const start = Date.now();

    enforceRateLimit("user-l", "login", options);
    vi.advanceTimersByTime(100);
    enforceRateLimit("user-l", "login", options);

    expect(getRateLimitState("user-l", "login", options).resetAt).toBe(
      start + WINDOW_MS,
    );
  });

  it("tidak pernah melaporkan remaining negatif", () => {
    const options = { maxAttempts: 1, windowMs: WINDOW_MS };

    for (let i = 0; i < 4; i += 1) {
      try {
        enforceRateLimit("user-m", "login", options);
      } catch {
        //-rate limit diharapkan setelah percobaan pertama
      }
    }

    const state = getRateLimitState("user-m", "login", options);
    expect(state.count).toBe(4);
    expect(state.remaining).toBe(0);
  });
});

describe("resetRateLimit", () => {
  it("menghapus seluruh catatan untuk identifier dan purpose", () => {
    const options = { maxAttempts: 3, windowMs: WINDOW_MS };

    enforceRateLimit("user-n", "login", options);
    enforceRateLimit("user-n", "login", options);
    resetRateLimit("user-n", "login");

    expect(getRateLimitState("user-n", "login", options).count).toBe(0);
    expect(() => {
      enforceRateLimit("user-n", "login", options);
      enforceRateLimit("user-n", "login", options);
    }).not.toThrow();
  });

  it("hanya menghapus bucket dengan limit yang cocok", () => {
    enforceRateLimit("user-o", "login", { maxAttempts: 1, windowMs: WINDOW_MS });
    enforceRateLimit("user-o", "login", { maxAttempts: 9, windowMs: WINDOW_MS });

    resetRateLimit("user-o", "login", { maxAttempts: 9, windowMs: WINDOW_MS });

    expect(
      getRateLimitState("user-o", "login", { maxAttempts: 9, windowMs: WINDOW_MS })
        .count,
    ).toBe(0);
    expect(
      getRateLimitState("user-o", "login", { maxAttempts: 1, windowMs: WINDOW_MS })
        .count,
    ).toBe(1);
  });

  it("tidak melempar error untuk identifier yang belum pernah tercatat", () => {
    expect(() => resetRateLimit("tidak-ada", "login")).not.toThrow();
  });
});
