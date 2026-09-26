import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/lib/error";
import { resetRateLimit } from "@/lib/rate-limit";
import type { SessionUser } from "@/lib/rbac";

/**
 * Test untuk `seedDemoMetricsAction` di `src/features/observability/actions.ts`.
 *
 * Dua guard yang diuji terpisah karena tujuannya berbeda: authz (session + role
 * admin) dan environment (`NODE_ENV`). Keduanya harus tetap ada; menghilang satu
 * saja berarti action yang destructive bisa dipanggil tanpa otorisasi.
 *
 * `process.env.NODE_ENV` di-stub dengan `vi.stubEnv` + `vi.unstubAllEnvs()`
 * karena `restoreMocks` di vitest.config.ts tidak memulihkan env.
 */

const rbac = vi.hoisted(() => ({
  requireSession: vi.fn(),
}));

vi.mock("@/lib/rbac", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/rbac")>();

  return { ...actual, requireSession: rbac.requireSession };
});

const store = vi.hoisted(() => ({
  pushEvent: vi.fn(),
  resetStore: vi.fn(),
}));

vi.mock("@/features/observability/lib/store", () => store);

vi.mock("@/features/ueba/service", () => ({
  recordAnomaliesForActor: vi.fn(),
}));

type Envelope =
  | { success: true; data: { events: number } }
  | { success: false; error: { code: string; message: string } };

function codeOf(result: Envelope): string {
  if (result.success) {
    throw new Error("Diharapakan envelope gagal, tapi action sukses.");
  }

  return result.error.code;
}

function unauthenticated(): AppError {
  return new AppError("UNAUTHENTICATED", { message: "Sesi tidak ditemukan." });
}

let act: typeof import("@/features/observability/actions");
let counter = 0;

function session(role: SessionUser["role"]): SessionUser {
  counter += 1;

  return { id: `usr_seed_${counter}`, role };
}

beforeEach(async () => {
  act = await import("@/features/observability/actions");
  resetRateLimit("semua", "observability-seed-demo");
  vi.stubEnv("NODE_ENV", "test");
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("seedDemoMetricsAction: guard session", () => {
  it("mengembalikan envelope UNAUTHENTICATED saat tidak ada sesi", async () => {
    rbac.requireSession.mockRejectedValue(unauthenticated());

    const result = await act.seedDemoMetricsAction();

    expect(codeOf(result)).toBe("UNAUTHENTICATED");
    // Tidak boleh ada efek samping: store belum boleh di-reset.
    expect(store.resetStore).not.toHaveBeenCalled();
  });

  it("tidak melempar exception ke client saat guard menolak", async () => {
    rbac.requireSession.mockRejectedValue(unauthenticated());

    await expect(act.seedDemoMetricsAction()).resolves.toBeDefined();
  });

  it("error tak terduga dari guard jadi envelope INTERNAL_ERROR", async () => {
    rbac.requireSession.mockRejectedValue(new Error("session store down: 10.0.0.5"));

    const result = await act.seedDemoMetricsAction();

    expect(codeOf(result)).toBe("INTERNAL_ERROR");
    expect(JSON.stringify(result)).not.toContain("10.0.0.5");
  });
});

describe("seedDemoMetricsAction: role check", () => {
  it.each(["viewer", "editor"] as const)("menolak role %s dengan FORBIDDEN", async (role) => {
    rbac.requireSession.mockResolvedValue(session(role));

    const result = await act.seedDemoMetricsAction();

    expect(codeOf(result)).toBe("FORBIDDEN");
    // `resetStore()` menghapus data semua aktor; role di bawah admin tidak boleh
    // sampai ke sana.
    expect(store.resetStore).not.toHaveBeenCalled();
  });

  it("menerima role admin di luar production", async () => {
    rbac.requireSession.mockResolvedValue(session("admin"));

    const result = await act.seedDemoMetricsAction();

    expect(result.success).toBe(true);
    expect(store.resetStore).toHaveBeenCalledTimes(1);
  });
});

describe("seedDemoMetricsAction: environment check", () => {
  it("tetap menolak di production meski role admin", async () => {
    // Guard environment dipertahankan, bukan digantikan oleh role check.
    vi.stubEnv("NODE_ENV", "production");
    rbac.requireSession.mockResolvedValue(session("admin"));

    const result = await act.seedDemoMetricsAction();

    expect(codeOf(result)).toBe("FORBIDDEN");
    expect(store.resetStore).not.toHaveBeenCalled();
  });

  it("memeriksa authz sebelum environment, agar tidak membocorkan fitur ke anonim", async () => {
    vi.stubEnv("NODE_ENV", "production");
    rbac.requireSession.mockRejectedValue(unauthenticated());

    const result = await act.seedDemoMetricsAction();

    // Pemanggil anonim tidak boleh tahu bahwa fitur seed ada di environment ini.
    expect(codeOf(result)).toBe("UNAUTHENTICATED");
  });
});

describe("seedDemoMetricsAction: rate limit", () => {
  it("membatasi pemanggilan berulang per session id", async () => {
    const actor = session("admin");

    rbac.requireSession.mockResolvedValue(actor);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const result = await act.seedDemoMetricsAction();

      expect(result.success).toBe(true);
    }

    const limited = await act.seedDemoMetricsAction();

    expect(codeOf(limited)).toBe("RATE_LIMITED");
    expect(store.resetStore).toHaveBeenCalledTimes(5);
  });
});

describe("seedDemoMetricsAction: error tak terduga", () => {
  it("mengubah error dari service jadi envelope INTERNAL_ERROR", async () => {
    rbac.requireSession.mockResolvedValue(session("admin"));
    store.resetStore.mockImplementation(() => {
      throw new Error("store gagal: path=/var/lib/secret");
    });

    const result = await act.seedDemoMetricsAction();

    expect(codeOf(result)).toBe("INTERNAL_ERROR");
    expect(JSON.stringify(result)).not.toContain("/var/lib/secret");
  });
});
