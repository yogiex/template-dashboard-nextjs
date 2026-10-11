import { afterEach, describe, expect, it, vi } from "vitest";

import { AUDIT_ACTIONS } from "@/features/audit/lib/categories";
import {
  loginAction,
  logoutAction,
  type ActionError,
  type LoginActionState,
} from "@/features/auth/actions";
import { AppError, getErrorMessage } from "@/lib/error";
import { resetRateLimit } from "@/lib/rate-limit";

/**
 * Test untuk `src/features/auth/actions.ts` — `loginAction` dan `logoutAction`.
 *
 * Yang dikunci di sini adalah boundary, bukan DAL: kredensial dicek
 * `verifyCredentials()`, session lahir dari `createSession()`, dan kedua-duanya
 * dimock supaya bentuk `SessionUser` yang diteruskan ke session bisa diperiksa
 * langsung. Rate limit sengaja TIDAK dimock — limiter asli yang jalan, supaya
 * test juga membuktikan key per-email dan per-IP-hash benar-benar menahan
 * percobaan berulang.
 *
 * `getSafeRequestContext()` dimock karena `headers()` butuh request scope, dan
 * auth rate limit memang memakai hasilnya sebagai key. Tanpa mock, `ipHash`
 * selalu null dan kontrol per-IP tidak pernah ikut teruji.
 */

const dal = vi.hoisted(() => ({
  verifyCredentials: vi.fn(),
}));

const sessionStore = vi.hoisted(() => ({
  createSession: vi.fn(),
  destroySession: vi.fn(),
}));

const audit = vi.hoisted(() => ({
  logAudit: vi.fn(),
}));

const requestContext = vi.hoisted(() => ({
  getSafeRequestContext: vi.fn(),
}));

const logger = vi.hoisted(() => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock("@/features/auth/service", () => ({
  verifyCredentials: dal.verifyCredentials,
}));

vi.mock("@/features/auth/session", () => ({
  createSession: sessionStore.createSession,
  destroySession: sessionStore.destroySession,
}));

vi.mock("@/features/audit/lib/log-audit", () => ({
  logAudit: audit.logAudit,
}));

vi.mock("@/lib/request-context", () => ({
  getSafeRequestContext: requestContext.getSafeRequestContext,
}));

vi.mock("@/lib/logger", () => ({
  logger,
}));

/** Mock store hanya punya satu user, jadi id hasil login selalu konstanta. */
const MOCK_USER_ID = "usr_placeholder";

/** Kredensial mock tunggal dari DAL (`src/features/auth/service.ts`). */
const DEMO_EMAIL = "demo@example.com";

const VALID_PASSWORD = "password123";

/** Identitas test yang sedang berjalan, untuk dibersihkan di `afterEach`. */
let currentIdentity: { email: string; ipHash: string } | null = null;

let attempt = 0;

/**
 * Identitas unik per test. Rate limit memakai email sebagai key, jadi email yang
 * sama diulang antar test akan membuat test berikutnya ditolak karena alasan
 * yang salah (kuota habis, bukan perilaku yang diuji). Kredensial mock tetap
 * dipakai satu kali di test kontrak DAL, dengan bucket yang dibersihkan oleh
 * `afterEach` yang sama.
 */
function freshIdentity(emailOverride?: string): { email: string; ipHash: string } {
  attempt += 1;

  return {
    email: emailOverride ?? `pengguna_${attempt}@example.com`,
    ipHash: `iphash_test_${attempt}`,
  };
}

function loginInput(
  identity: { email: string },
  overrides: { password?: string; rememberMe?: boolean; email?: string } = {},
): Record<string, unknown> {
  return {
    email: overrides.email ?? identity.email,
    password: overrides.password ?? VALID_PASSWORD,
    rememberMe: overrides.rememberMe ?? false,
  };
}

/**
 * Siapkan kondisi login yang sah dan kembalikan identitas yang dipakai test itu.
 * Setiap test memanggil ini sekali, jadi bucket rate limit per test selalu kosong.
 *
 * `email` hanya dipakai untuk mengganti nilai pada input; verifikasi kredensial
 * dimock, jadi bentuk email tidak menentukan hasil login.
 */
function arrangeLogin(email?: string): { email: string; ipHash: string } {
  const identity = freshIdentity(email);

  currentIdentity = identity;

  requestContext.getSafeRequestContext.mockResolvedValue({
    ipHash: identity.ipHash,
    userAgent: "vitest",
    path: "/login",
    actorEmail: null,
  });
  dal.verifyCredentials.mockResolvedValue({
    userId: MOCK_USER_ID,
    email: identity.email,
  });
  sessionStore.createSession.mockResolvedValue("token_session_uji");

  return identity;
}

function errorOf(result: LoginActionState): ActionError {
  if (result.success) {
    throw new Error("Diharapkan envelope gagal, tapi action mengembalikan sukses.");
  }

  return result.error;
}

afterEach(() => {
  // Kuota test yang baru dipakai dibuang supaya store rate limit tidak tumbuh
  // sepanjang suite, dan bucket yang sama tidak pernah dipakai ulang test lain.
  if (currentIdentity) {
    resetRateLimit(currentIdentity.ipHash, "login-ip");
    resetRateLimit(currentIdentity.email, "login");
    currentIdentity = null;
  }
});

describe("loginAction: login berhasil", () => {
  it("menerima kredensial mock tunggal dan mengembalikan sukses", async () => {
    // Kontrak DAL: satu user mock (`src/features/auth/service.ts`) diterima
    // apa adanya. Verifikasi dimock, jadi yang dikunci di sini adalah bentuk
    // input yang benar dan bentuk envelope suksesnya.
    arrangeLogin(DEMO_EMAIL);

    const result = await loginAction({
      email: DEMO_EMAIL,
      password: VALID_PASSWORD,
      rememberMe: false,
    });

    expect(result).toEqual({ success: true });
    expect(sessionStore.createSession).toHaveBeenCalledWith(
      { id: MOCK_USER_ID, role: "admin" },
      { rememberMe: false },
    );
  });

  it("memetakan hasil verifikasi menjadi SessionUser dan mengembalikan sukses", async () => {
    const identity = arrangeLogin();

    const result = await loginAction(
      loginInput(identity, { rememberMe: false }),
    );

    expect(result).toEqual({ success: true });
    expect(dal.verifyCredentials).toHaveBeenCalledWith(
      identity.email,
      VALID_PASSWORD,
    );
    expect(sessionStore.createSession).toHaveBeenCalledWith(
      { id: MOCK_USER_ID, role: "admin" },
      { rememberMe: false },
    );
  });

  it("meneruskan rememberMe ke createSession", async () => {
    const identity = arrangeLogin();

    await loginAction(loginInput(identity, { rememberMe: true }));

    expect(sessionStore.createSession).toHaveBeenCalledWith(
      { id: MOCK_USER_ID, role: "admin" },
      { rememberMe: true },
    );
  });

  it("mencatat audit login sukses dengan id user dari verifikasi", async () => {
    const identity = arrangeLogin();

    await loginAction(loginInput(identity));

    expect(audit.logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AUDIT_ACTIONS.LOGIN_SUCCESS,
        category: "auth",
        result: "success",
        source: "auth/login",
        actor: { id: MOCK_USER_ID },
      }),
    );
  });
});

describe("loginAction: kredensial salah", () => {
  it("mengembalikan envelope UNAUTHENTICATED tanpa membuat session", async () => {
    const identity = arrangeLogin();

    dal.verifyCredentials.mockRejectedValue(
      new AppError("UNAUTHENTICATED", {
        message: "Email atau kata sandi salah.",
      }),
    );

    const result = await loginAction(loginInput(identity));

    expect(errorOf(result).code).toBe("UNAUTHENTICATED");
    expect(sessionStore.createSession).not.toHaveBeenCalled();
  });

  it("tidak membocorkan pesan service ke client", async () => {
    const identity = arrangeLogin();

    dal.verifyCredentials.mockRejectedValue(
      new AppError("UNAUTHENTICATED", { message: "Email atau kata sandi salah." }),
    );

    const result = await loginAction(loginInput(identity));

    // Pesan yang keluar adalah pesan generik `AppError`, bukan teks layanan:
    // balasan yang membedakan email terdaftar/tidak menjadi oracle enumerasi.
    expect(errorOf(result).message).toBe(getErrorMessage("UNAUTHENTICATED"));
    expect(JSON.stringify(result)).not.toContain("Email atau kata sandi salah");
  });

  it("mencatat audit login ditolak dengan alasan berupa ErrorCode saja", async () => {
    const identity = arrangeLogin();

    dal.verifyCredentials.mockRejectedValue(
      new AppError("UNAUTHENTICATED", { message: "Email atau kata sandi salah." }),
    );

    await loginAction(loginInput(identity));

    expect(audit.logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AUDIT_ACTIONS.LOGIN_REJECTED,
        category: "auth",
        result: "failure",
      }),
    );
    expect(JSON.stringify(audit.logAudit.mock.calls)).not.toContain("password123");
  });
});

describe("loginAction: validasi boundary", () => {
  it.each<[string, Record<string, unknown>, "email" | "password"]>([
    ["password terlalu pendek", { password: "pendek" }, "password"],
    ["password kosong", { password: "" }, "password"],
    ["email tidak valid", { email: "bukan-email" }, "email"],
    ["email kosong", { email: "" }, "email"],
  ])(
    "menolak %s dengan VALIDATION_ERROR dan fieldErrors",
    async (_label, overrides, field) => {
      const identity = arrangeLogin();

      const result = await loginAction(loginInput(identity, overrides));

      expect(errorOf(result).code).toBe("VALIDATION_ERROR");
      expect(errorOf(result).fieldErrors).toBeDefined();
      expect(Object.keys(errorOf(result).fieldErrors ?? {})).toContain(field);
      // Ditolak sebelum kredensial disentuh: tidak ada verifikasi, tidak ada session.
      expect(dal.verifyCredentials).not.toHaveBeenCalled();
      expect(sessionStore.createSession).not.toHaveBeenCalled();
    },
  );

  it("menolak input yang sama sekali bukan objek", async () => {
    await expect(loginAction("bukan-objek")).resolves.toMatchObject({
      success: false,
      error: { code: "VALIDATION_ERROR" },
    });
    expect(dal.verifyCredentials).not.toHaveBeenCalled();
  });
});

describe("loginAction: rate limit", () => {
  it("menolak percobaan berikutnya dengan RATE_LIMITED dan mencatat kejadian keamanan", async () => {
    const identity = arrangeLogin();

    dal.verifyCredentials.mockRejectedValue(
      new AppError("UNAUTHENTICATED", {
        message: "Email atau kata sandi salah.",
      }),
    );

    // Lima percobaan pertama tetap diproses (dan tetap gagal verifikasi),
    // percobaan keenam ditolak oleh limiter — bukan oleh DAL.
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const rejected = await loginAction(loginInput(identity));

      expect(errorOf(rejected).code).toBe("UNAUTHENTICATED");
    }

    const limited = await loginAction(loginInput(identity));

    expect(errorOf(limited).code).toBe("RATE_LIMITED");
    expect(dal.verifyCredentials).toHaveBeenCalledTimes(5);
    expect(sessionStore.createSession).not.toHaveBeenCalled();
    expect(audit.logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AUDIT_ACTIONS.RATE_LIMIT_HIT,
        category: "security",
      }),
    );
  });
});

describe("loginAction: error tak terduga", () => {
  it("mengganti error umum dengan INTERNAL_ERROR tanpa melempar ke client", async () => {
    const identity = arrangeLogin();

    dal.verifyCredentials.mockRejectedValue(
      new Error("db down: host=10.0.0.5 password=rahasia"),
    );

    const result = await loginAction(loginInput(identity));

    expect(errorOf(result).code).toBe("INTERNAL_ERROR");
    expect(errorOf(result).message).toBe(getErrorMessage("INTERNAL_ERROR"));
    expect(sessionStore.createSession).not.toHaveBeenCalled();
  });

  it("mencatat error ke logger dan tidak membocorkan detailnya", async () => {
    const identity = arrangeLogin();

    dal.verifyCredentials.mockRejectedValue(new Error("kredensial: password=rahasia"));

    const result = await loginAction(loginInput(identity));

    expect(logger.error).toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain("rahasia");
    expect(JSON.stringify(result)).not.toContain("10.0.0.5");
  });

  it("menghasilkan INTERNAL_ERROR juga ketika createSession gagal", async () => {
    const identity = arrangeLogin();

    sessionStore.createSession.mockRejectedValue(new Error("cookie tak bisa ditulis"));

    const result = await loginAction(loginInput(identity));

    expect(errorOf(result).code).toBe("INTERNAL_ERROR");
    expect(dal.verifyCredentials).toHaveBeenCalledTimes(1);
  });
});

describe("logoutAction", () => {
  it("menghancurkan session dan mengembalikan envelope sukses", async () => {
    await expect(logoutAction()).resolves.toEqual({ success: true });
    expect(sessionStore.destroySession).toHaveBeenCalledTimes(1);
  });
});
