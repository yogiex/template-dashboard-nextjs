import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionUser } from "@/lib/rbac";

import {
  REMEMBER_ME_MAX_AGE_SECONDS,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  createSession,
  destroySession,
  readSession,
} from "@/features/auth/session";

/**
 * Test untuk `src/features/auth/session.ts` — session mock di atas cookie.
 *
 * `cookies()` menolak dipanggil di luar request scope, jadi store minimal
 * `ResponseCookies` (`get`/`set`/`delete`) disediakan di sini sebagai pengganti
 * `next/headers`. Yang dikunci adalah perilaku yang teramati dari luar: nama
 * cookie, opsi cookie (httpOnly/sameSite/secure/maxAge), masa berlaku token, dan
 * invalidation saat logout — bukan bentuk internal `Map` session.
 */

type CookieOptions = Record<string, unknown>;

type CookieRecord = { name: string; value?: string } & CookieOptions;

type StoredCookie = { name: string; value: string; options: CookieOptions };

const cookieStore = vi.hoisted(() => {
  const jar = new Map<string, StoredCookie>();

  function set(
    nameOrRecord: string | CookieRecord,
    value?: string,
    options?: CookieOptions,
  ): void {
    if (typeof nameOrRecord === "string") {
      jar.set(nameOrRecord, {
        name: nameOrRecord,
        value: value ?? "",
        options: options ?? {},
      });

      return;
    }

    // Bentuk `set({ name, value, ...options })` juga didukung Next.
    const record: CookieRecord = nameOrRecord;

    jar.set(record.name, {
      name: record.name,
      value: String(record.value ?? ""),
      options: record,
    });
  }

  return {
    get(name: string): StoredCookie | undefined {
      return jar.get(name);
    },
    has(name: string): boolean {
      return jar.has(name);
    },
    set,
    delete(name: string): void {
      jar.delete(name);
    },
    clear(): void {
      jar.clear();
    },
  };
});

vi.mock("next/headers", () => ({
  cookies: async () => cookieStore,
}));

const SESSION_USER: SessionUser = { id: "usr_placeholder", role: "admin" };

/** Nilai cookie yang kosong berarti cookie sudah dikosongkan, bukan lagi dipakai. */
function cookieValue(name: string): string {
  return cookieStore.get(name)?.value ?? "";
}

/** Representasi string yang aman untuk seluruh jenis argumen console. */
function describeArgument(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

beforeEach(() => {
  cookieStore.clear();
});

afterEach(() => {
  vi.useRealTimers();
  cookieStore.clear();
});

describe("createSession", () => {
  it("menyimpan token di cookie httpOnly bernama SESSION_COOKIE_NAME", async () => {
    const token = await createSession(SESSION_USER);

    expect(cookieStore.has(SESSION_COOKIE_NAME)).toBe(true);
    expect(cookieValue(SESSION_COOKIE_NAME)).toBe(token);
    expect(cookieStore.get(SESSION_COOKIE_NAME)?.options).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
      // Tidak mungkin `secure: true` di dev/http, tapi session cookie hanya
      // boleh lewat HTTPS ketika aplikasi benar-benar production.
      secure: false,
    });
  });

  it("memakai maxAge default saat rememberMe tidak diisi maupun false", async () => {
    await createSession(SESSION_USER);

    expect(cookieStore.get(SESSION_COOKIE_NAME)?.options.maxAge).toBe(
      SESSION_MAX_AGE_SECONDS,
    );

    cookieStore.clear();

    await createSession(SESSION_USER, { rememberMe: false });

    expect(cookieStore.get(SESSION_COOKIE_NAME)?.options.maxAge).toBe(
      SESSION_MAX_AGE_SECONDS,
    );
  });

  it("memakai maxAge perpanjangan saat rememberMe true", async () => {
    await createSession(SESSION_USER, { rememberMe: true });

    expect(cookieStore.get(SESSION_COOKIE_NAME)?.options).toMatchObject({
      httpOnly: true,
      maxAge: REMEMBER_ME_MAX_AGE_SECONDS,
    });
    expect(REMEMBER_ME_MAX_AGE_SECONDS).toBeGreaterThan(SESSION_MAX_AGE_SECONDS);
  });

  it("menghasilkan token acak yang berbeda antar pemanggilan", async () => {
    const first = await createSession(SESSION_USER);
    const second = await createSession(SESSION_USER);

    expect(first).not.toBe(second);
    expect(first.length).toBeGreaterThanOrEqual(32);
    expect(second.length).toBeGreaterThanOrEqual(32);
  });
});

describe("readSession", () => {
  it("mengembalikan user untuk token yang baru dibuat", async () => {
    await createSession(SESSION_USER);

    await expect(readSession()).resolves.toEqual(SESSION_USER);
  });

  it("mengganti nilai cookie lama dengan token terbaru dari createSession", async () => {
    const other: SessionUser = { id: "usr_editor", role: "editor" };

    await createSession(SESSION_USER);
    await createSession(other);

    // Token terbaru yang menang; cookie hanya memuat satu nilai.
    await expect(readSession()).resolves.toEqual(other);
  });

  it("mengembalikan null ketika cookie session tidak ada", async () => {
    await expect(readSession()).resolves.toBeNull();
  });

  it("mengembalikan null ketika nilai cookie kosong", async () => {
    cookieStore.set(SESSION_COOKIE_NAME, "", {});

    await expect(readSession()).resolves.toBeNull();
  });

  it("mengembalikan null untuk token yang tidak dikenal", async () => {
    // Token yang lolos dari createSession lain (instance lain / sudah dihapus).
    cookieStore.set(SESSION_COOKIE_NAME, "token_tidak_dikenali", {});

    await expect(readSession()).resolves.toBeNull();
  });

  it("mengembalikan null setelah destroySession, walau token lama dipasang ulang", async () => {
    const token = await createSession(SESSION_USER);

    await destroySession();

    cookieStore.set(SESSION_COOKIE_NAME, token, {});

    await expect(readSession()).resolves.toBeNull();
  });
});

describe("masa berlaku token", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("menolak token setelah SESSION_MAX_AGE_SECONDS dan mengosongkan cookie", async () => {
    await createSession(SESSION_USER);

    vi.advanceTimersByTime(SESSION_MAX_AGE_SECONDS * 1000 + 1_000);

    await expect(readSession()).resolves.toBeNull();
    expect(cookieValue(SESSION_COOKIE_NAME)).toBe("");
  });

  it("tetap menerima token rememberMe setelah masa berlaku token biasa habis", async () => {
    await createSession(SESSION_USER, { rememberMe: true });

    vi.advanceTimersByTime(SESSION_MAX_AGE_SECONDS * 1000 + 1_000);

    await expect(readSession()).resolves.toEqual(SESSION_USER);
  });

  it("menolak token rememberMe setelah REMEMBER_ME_MAX_AGE_SECONDS", async () => {
    await createSession(SESSION_USER, { rememberMe: true });

    vi.advanceTimersByTime(REMEMBER_ME_MAX_AGE_SECONDS * 1000 + 1_000);

    await expect(readSession()).resolves.toBeNull();
    expect(cookieValue(SESSION_COOKIE_NAME)).toBe("");
  });
});

describe("destroySession", () => {
  it("mengosongkan cookie session", async () => {
    await createSession(SESSION_USER);

    await destroySession();

    expect(cookieValue(SESSION_COOKIE_NAME)).toBe("");
    await expect(readSession()).resolves.toBeNull();
  });

  it("tidak melempar ketika cookie session memang tidak ada", async () => {
    await expect(destroySession()).resolves.toBeUndefined();
    // Destruksi idempoten: tidak ada sesi yang tersisa setelahnya.
    expect(cookieValue(SESSION_COOKIE_NAME)).toBe("");
    await expect(readSession()).resolves.toBeNull();
  });
});

describe("tidak ada token yang tercatat di log", () => {
  it("menjalankan seluruh alur tanpa menulis nilai token ke console", async () => {
    const channels = ["debug", "error", "info", "log", "warn"] as const;
    const captured: string[] = [];

    const spies = channels.map((channel) =>
      // Session mock tidak punya logger sendiri; yang diperiksa adalah seluruh
      // keluaran console dari alur read/write/destroy session.
      vi.spyOn(console, channel).mockImplementation((...args: unknown[]) => {
        captured.push(args.map(describeArgument).join(" "));
      }),
    );

    try {
      const token = await createSession(SESSION_USER);

      cookieStore.set(SESSION_COOKIE_NAME, "token_tidak_dikenali", {});
      await readSession();

      await destroySession();
      await readSession();

      expect(token).toHaveLength(43);
      expect(captured.join("\n")).not.toContain(token);
      expect(captured.join("\n")).not.toContain("token_tidak_dikenali");
    } finally {
      for (const spy of spies) {
        spy.mockRestore();
      }
    }
  });
});
