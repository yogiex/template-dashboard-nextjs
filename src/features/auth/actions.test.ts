import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/lib/error";
import { resetRateLimit } from "@/lib/rate-limit";
import type { SessionUser } from "@/lib/rbac";

/**
 * Test untuk lima action pengaturan MFA di `src/features/auth/actions.ts`.
 *
 * Fokusnya guard: `requireSession()` adalah satu-satunya sumber identitas, jadi
 * yang dikunci di sini adalah (1) tidak ada sesi menghasilkan envelope
 * `UNAUTHENTICATED` tanpa exception ke client, (2) user id diteruskan dari
 * session, bukan konstanta, (3) error tak terduga dari dalam action tetap
 * menjadi envelope generik, (4) rate limit tidak bisa dilewati dengan mengacak
 * input client.
 *
 * `@/features/auth/service` dimock agar bisa memeriksa user id yang diterima
 * tiap service call. `requireRole` sengaja TIDAK dimock: ia murni dan tidak
 * menyentuh env, jadi memakai implementasi asli membuat batas role ikut teruji.
 */

const rbac = vi.hoisted(() => ({
  requireSession: vi.fn(),
}));

vi.mock("@/lib/rbac", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/rbac")>();

  return { ...actual, requireSession: rbac.requireSession };
});

const dal = vi.hoisted(() => ({
  beginMfaChallenge: vi.fn(),
  confirmEmailEnrollment: vi.fn(),
  confirmTotpEnrollment: vi.fn(),
  disableMfa: vi.fn(),
  getMfaStatus: vi.fn(),
  registerUser: vi.fn(),
  requestPasswordReset: vi.fn(),
  resendMfaEmailCode: vi.fn(),
  resetPassword: vi.fn(),
  startEmailEnrollment: vi.fn(),
  startTotpEnrollment: vi.fn(),
  verifyCredentials: vi.fn(),
  verifyMfaBackupCode: vi.fn(),
  verifyMfaCode: vi.fn(),
}));

vi.mock("@/features/auth/service", () => dal);

type Envelope = { success: true } | { success: false; error: { code: string } };

type MfaAction = (input?: unknown) => Promise<Envelope>;

type MockFn = ReturnType<typeof vi.fn>;

function unauthenticated(): AppError {
  return new AppError("UNAUTHENTICATED", { message: "Sesi tidak ditemukan." });
}

function codeOf(result: Envelope): string {
  if (result.success) {
    throw new Error("Diharapkan envelope gagal, tapi action sukses.");
  }

  return result.error.code;
}

/** Argumen valid per action; tiga action sisanya tidak punya parameter. */
const VALID_INPUT: Record<string, unknown> = {
  confirmTotpEnrollmentAction: { enrollmentId: "enr_1", code: "123456" },
  confirmEmailEnrollmentAction: { enrollmentId: "enr_1", code: "123456" },
  disableMfaAction: { password: "password123" },
};

let act: typeof import("@/features/auth/actions");
let counter = 0;

/**
 * Lima action pengaturan MFA, plus mock service yang dipanggilnya.
 *
 * `verifyMfaAction`, `verifyBackupCodeAction`, dan `resendMfaCodeAction` tidak ada
 * di sini: mereka berjalan SEBELUM session ada dan dijaga token tantangan pending
 * (`requireMfaToken`), bukan session.
 */
const MFA_SETTINGS_ACTIONS: Array<[string, () => MfaAction, () => MockFn]> = [
  ["startTotpEnrollmentAction", () => act.startTotpEnrollmentAction, () => dal.startTotpEnrollment],
  ["confirmTotpEnrollmentAction", () => act.confirmTotpEnrollmentAction, () => dal.confirmTotpEnrollment],
  ["startEmailEnrollmentAction", () => act.startEmailEnrollmentAction, () => dal.startEmailEnrollment],
  ["confirmEmailEnrollmentAction", () => act.confirmEmailEnrollmentAction, () => dal.confirmEmailEnrollment],
  ["disableMfaAction", () => act.disableMfaAction, () => dal.disableMfa],
];

/** Sesi unik per test supaya bucket rate limit tidak saling menimpa. */
function session(role: SessionUser["role"] = "viewer"): SessionUser {
  counter += 1;

  return { id: `usr_test_${counter}`, role };
}

function call(name: string, action: MfaAction): Promise<Envelope> {
  return action.call(null, VALID_INPUT[name]);
}

beforeEach(async () => {
  act = await import("@/features/auth/actions");
  resetRateLimit("semua", "mfa-disable");
  resetRateLimit("semua", "mfa-enroll-totp");
  resetRateLimit("semua", "mfa-enroll-email");
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("MFA settings actions: guard session", () => {
  it("menguji kelima action pengaturan MFA", () => {
    // Penjaga terhadap tabel yang diam-diam memendek.
    expect(MFA_SETTINGS_ACTIONS).toHaveLength(5);
  });

  it.each(MFA_SETTINGS_ACTIONS)(
    "%s mengembalikan envelope UNAUTHENTICATED saat tidak ada sesi",
    async (name, get) => {
      rbac.requireSession.mockRejectedValue(unauthenticated());

      expect(codeOf(await call(name, get()))).toBe("UNAUTHENTICATED");
    },
  );

  it.each(MFA_SETTINGS_ACTIONS)(
    "%s tidak melempar exception ke client saat guard menolak",
    async (name, get) => {
      rbac.requireSession.mockRejectedValue(unauthenticated());

      await expect(call(name, get())).resolves.toBeDefined();
    },
  );

  it.each(MFA_SETTINGS_ACTIONS)(
    "%s tidak menyentuh DAL saat guard menolak",
    async (name, get, dalTarget) => {
      rbac.requireSession.mockRejectedValue(unauthenticated());

      const result = await call(name, get());

      // Gagal tertutup: tidak ada efek samping sebelum identitas diketahui.
      expect(codeOf(result)).toBe("UNAUTHENTICATED");
      expect(dalTarget()).not.toHaveBeenCalled();
    },
  );

  it.each(MFA_SETTINGS_ACTIONS)(
    "%s meneruskan user id dari session ke DAL",
    async (name, get, dalTarget) => {
      const actor = session();

      rbac.requireSession.mockResolvedValue(actor);

      const result = await call(name, get());

      expect(result.success).toBe(true);
      expect(rbac.requireSession).toHaveBeenCalledTimes(1);
      expect(dalTarget()).toHaveBeenCalledTimes(1);

      // User id dari server SELALU ikut terkirim; tidak ada konstanta user yang
      // bisa menggantikan session. Posisi argumen berbeda per service (enrolment
      // leading, `disableMfa` trailing), jadi yang dikunci adalah keberadaannya.
      expect(dalTarget().mock.calls[0]).toContain(actor.id);
    },
  );

  it.each(MFA_SETTINGS_ACTIONS)(
    "%s tidak memerlukan role tertentu",
    async (name, get) => {
      rbac.requireSession.mockResolvedValue(session("viewer"));

      const result = await call(name, get());

      // Self-service: `viewer` sah. Kalau suatu saat ada `requireRole`, test ini
      // yang akan gagal lebih dulu.
      expect(result.success).toBe(true);
    },
  );
});

describe("MFA settings actions: error tak terduga", () => {
  it.each(MFA_SETTINGS_ACTIONS)(
    "%s mengubah error dari guard jadi envelope INTERNAL_ERROR",
    async (name, get) => {
      rbac.requireSession.mockRejectedValue(new Error("db down: host=10.0.0.5"));

      const result = await call(name, get());

      expect(codeOf(result)).toBe("INTERNAL_ERROR");
    },
  );

  it.each(MFA_SETTINGS_ACTIONS)(
    "%s tidak membocorkan error tak terduga dari DAL",
    async (name, get, dalTarget) => {
      rbac.requireSession.mockResolvedValue(session());

      dalTarget().mockRejectedValue(new Error("rahasia: password=root123"));

      const result = await call(name, get());

      expect(codeOf(result)).toBe("INTERNAL_ERROR");
      expect(JSON.stringify(result)).not.toContain("root123");
    },
  );
});

describe("MFA settings actions: rate limit per-aktor", () => {
  it("disableMfa membatasi percobaan per session id", async () => {
    rbac.requireSession.mockResolvedValue(session());

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const result = await act.disableMfaAction({ password: "salah" });

      expect(result.success).toBe(true);
    }

    const limited = await act.disableMfaAction({ password: "salah" });

    expect(codeOf(limited as Envelope)).toBe("RATE_LIMITED");
  });

  it("confirmTotp tidak memakai enrollmentId dari client sebagai key", async () => {
    rbac.requireSession.mockResolvedValue(session());

    for (let attempt = 0; attempt < 5; attempt += 1) {
      // `enrollmentId` selalu berbeda. Kalau ini yang jadi key rate limit,
      // jendela selalu ter-reset dan limitnya tidak berlaku sama sekali.
      const result = await act.confirmTotpEnrollmentAction({
        enrollmentId: `enr_${attempt}`,
        code: "000000",
      });

      expect(result.success).toBe(true);
    }

    const limited = await act.confirmTotpEnrollmentAction({
      enrollmentId: "enr_lain",
      code: "000000",
    });

    expect(codeOf(limited as Envelope)).toBe("RATE_LIMITED");
  });

  it("confirmEmail tidak memakai enrollmentId dari client sebagai key", async () => {
    rbac.requireSession.mockResolvedValue(session());

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const result = await act.confirmEmailEnrollmentAction({
        enrollmentId: `enr_${attempt}`,
        code: "000000",
      });

      expect(result.success).toBe(true);
    }

    const limited = await act.confirmEmailEnrollmentAction({
      enrollmentId: "enr_lain",
      code: "000000",
    });

    expect(codeOf(limited as Envelope)).toBe("RATE_LIMITED");
  });
});

describe("MFA settings actions: error dari DAL", () => {
  it("disableMfa meneruskan AppError dari service apa adanya", async () => {
    rbac.requireSession.mockResolvedValue(session());

    dal.disableMfa.mockRejectedValue(
      new AppError("UNAUTHENTICATED", {
        message: "Kata sandi salah.",
        fieldErrors: { password: ["Kata sandi salah."] },
      }),
    );

    const result = await act.disableMfaAction({ password: "salah" });

    // `fieldErrors` harus sampai ke form, bukan jadi INTERNAL_ERROR.
    expect(result).toEqual({
      success: false,
      error: expect.objectContaining({ code: "UNAUTHENTICATED" }),
    });
  });

  it("startEmail meneruskan CONFLICT dari service apa adanya", async () => {
    rbac.requireSession.mockResolvedValue(session());

    dal.startEmailEnrollment.mockRejectedValue(
      new AppError("CONFLICT", { message: "MFA sudah aktif." }),
    );

    const result = await act.startEmailEnrollmentAction();

    expect(codeOf(result as Envelope)).toBe("CONFLICT");
  });

  it("confirmTotp meneruskan session id agar kepemilikan enrolment bisa dicek", async () => {
    const actor = session();

    rbac.requireSession.mockResolvedValue(actor);

    await act.confirmTotpEnrollmentAction({ enrollmentId: "enr_x", code: "654321" });

    expect(dal.confirmTotpEnrollment).toHaveBeenCalledWith("enr_x", "654321", actor.id);
  });
});
