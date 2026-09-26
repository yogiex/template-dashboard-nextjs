import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/lib/error";
import { requireRole, type SessionUser } from "@/lib/rbac";

/**
 * Test untuk fail-closed session di `src/lib/rbac.ts`.
 *
 * `serverEnv` di `src/lib/env.ts` di-parse sekali saat modul pertama kali
 * diimpor, jadi skenario yang butuh `DEV_AUTH_BYPASS` / `NODE_ENV` berbeda
 * harus memuat ulang `@/lib/rbac` lewat `vi.resetModules()` + dynamic import.
 * Impor statis di atas hanya dipakai untuk `requireRole()`, yang tidak menyentuh
 * env sama sekali.
 */

const BYPASS_KEY = "DEV_AUTH_BYPASS";
const NODE_ENV_KEY = "NODE_ENV";

/** Sesi yang tidak boleh pernah keluar dari jalur produksi. */
const PLACEHOLDER: SessionUser = { id: "usr_placeholder", role: "admin" };

beforeEach(() => {
  // Default fail-closed: bypass tidak diaktifkan.
  vi.stubEnv(BYPASS_KEY, undefined);
});

afterEach(() => {
  // `vi.stubEnv` menyimpan nilai asli, jadi ini yang mencegah env bocor ke file
  // test lain. `restoreMocks` di vitest.config.ts tidak mencakup env.
  vi.unstubAllEnvs();
  vi.resetModules();
});

type EnvOverrides = {
  /** `undefined` berarti variabel dihapus dari `process.env`. */
  bypass?: string;
  nodeEnv?: string;
};

async function loadRbac(env: EnvOverrides = {}) {
  vi.stubEnv(BYPASS_KEY, env.bypass);
  vi.stubEnv(NODE_ENV_KEY, env.nodeEnv);

  vi.resetModules();

  return import("@/lib/rbac");
}

function asError(value: unknown): { name: string; code: string; status: number } {
  const error = value as { name?: string; code?: string; status?: number };

  return {
    name: String(error?.name),
    code: String(error?.code),
    status: Number(error?.status),
  };
}

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  const settled = await promise.then(
    () => undefined,
    (error: unknown) => error,
  );

  if (settled === undefined) {
    throw new Error("Diharapkan promise menolak, tapi promise resolve.");
  }

  return settled;
}

describe("requireSession", () => {
  it("menolak dengan AppError UNAUTHENTICATED (401) saat tidak ada sesi", async () => {
    const { requireSession } = await loadRbac();

    expect(asError(await rejection(requireSession()))).toEqual({
      name: "AppError",
      code: "UNAUTHENTICATED",
      status: 401,
    });
  });

  it("tidak pernah resolve ke sesi placeholder admin", async () => {
    const { requireSession } = await loadRbac();
    const resolved: SessionUser[] = [];

    await requireSession()
      .then((session) => {
        resolved.push(session);
      })
      .catch(() => undefined);

    expect(resolved).toEqual([]);
    expect(resolved).not.toContainEqual(PLACEHOLDER);
  });

  it("tetap gagal tertutup walau bypass lokal diaktifkan penuh", async () => {
    const { requireSession } = await loadRbac({ bypass: "1", nodeEnv: "test" });

    expect(asError(await rejection(requireSession()))).toMatchObject({
      code: "UNAUTHENTICATED",
      status: 401,
    });
  });
});

describe("requireSessionForDev", () => {
  it("menolak saat env bypass tidak diatur", async () => {
    const { requireSessionForDev } = await loadRbac({ nodeEnv: "test" });

    expect(asError(await rejection(requireSessionForDev()))).toMatchObject({
      name: "AppError",
      code: "UNAUTHENTICATED",
      status: 401,
    });
  });

  it("menolak saat bypass disetel ke nilai selain 1", async () => {
    const { requireSessionForDev } = await loadRbac({ bypass: "0", nodeEnv: "test" });

    expect(asError(await rejection(requireSessionForDev()))).toMatchObject({
      code: "UNAUTHENTICATED",
    });
  });

  it("menolak di production walau bypass disetel ke 1", async () => {
    const { requireSessionForDev } = await loadRbac({
      bypass: "1",
      nodeEnv: "production",
    });

    expect(asError(await rejection(requireSessionForDev()))).toMatchObject({
      code: "UNAUTHENTICATED",
      status: 401,
    });
  });

  it("mengembalikan sesi placeholder saat bypass 1 dan NODE_ENV bukan production", async () => {
    const { requireSessionForDev } = await loadRbac({ bypass: "1", nodeEnv: "test" });

    await expect(requireSessionForDev()).resolves.toEqual(PLACEHOLDER);
  });

  it("tetap mengembalikan placeholder saat NODE_ENV tidak disetel sama sekali", async () => {
    // Tanpa NODE_ENV, `serverEnvSchema` memakai default "development".
    const { requireSessionForDev } = await loadRbac({ bypass: "1" });

    await expect(requireSessionForDev()).resolves.toEqual(PLACEHOLDER);
  });

  it("gagal boot saat bypass diisi nilai yang tidak dikenal", async () => {
    // Fail-closed di lapisan env: "true"/"yes" harus gagal keras, bukan diam-diam
    // berarti bypass mati — dan bukan mungkin berarti bypass hidup.
    await expect(loadRbac({ bypass: "true" })).rejects.toThrow(/DEV_AUTH_BYPASS/);
  });
});

describe("requireRole", () => {
  const viewer: SessionUser = { id: "usr_viewer", role: "viewer" };
  const editor: SessionUser = { id: "usr_editor", role: "editor" };
  const admin: SessionUser = { id: "usr_admin", role: "admin" };

  it("melempar AppError FORBIDDEN (403) saat role tidak cukup", () => {
    expect(() => requireRole(viewer, "admin")).toThrow(AppError);

    let caught: unknown;

    try {
      requireRole(editor, "admin");
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(AppError);
    expect(asError(caught)).toMatchObject({ code: "FORBIDDEN", status: 403 });
  });

  it("menerima role yang setara atau lebih tinggi dari minimum", () => {
    expect(() => requireRole(admin, "admin")).not.toThrow();
    expect(() => requireRole(admin, "editor")).not.toThrow();
    expect(() => requireRole(admin, "viewer")).not.toThrow();
    expect(() => requireRole(editor, "viewer")).not.toThrow();
    expect(() => requireRole(viewer, "viewer")).not.toThrow();
  });

  it("mempertahankan semantik hierarki, bukan membership check", () => {
    // `editor` adalah role yang lebih tinggi dari `viewer` walau keduanya
    // bukan `admin`; ini yang akan rusak kalau hierarki diganti daftar role.
    expect(() => requireRole(editor, "viewer")).not.toThrow();
    expect(() => requireRole(viewer, "editor")).toThrow(AppError);
  });
});
