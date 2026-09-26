import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Test untuk `src/features/auth/service.ts` (DAL mock).
 *
 * `serverEnv` di `src/lib/env.ts` di-parse sekali saat modul pertama kali
 * diimpor, jadi skenario yang butuh `DEV_AUTH_BYPASS` berbeda harus
 * `vi.resetModules()` + dynamic import — pola yang sama dengan `rbac.test.ts`.
 */

const BYPASS_KEY = "DEV_AUTH_BYPASS";

afterEach(() => {
  // `restoreMocks` di vitest.config.ts tidak mencakup env.
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function loadWithDevBypass() {
  vi.stubEnv(BYPASS_KEY, "1");
  vi.resetModules();

  const { requireSessionForDev } = await import("@/lib/rbac");
  const service = await import("@/features/auth/service");

  return { session: await requireSessionForDev(), service };
}

describe("konstanta demo tidak lagi terekspor", () => {
  it("tidak mengekspor id user aktif maupun kode demo", async () => {
    const service = await import("@/features/auth/service");

    // `CURRENT_USER_ID` dulu menjadi sumber identitas hardcoded; `MFA_DEMO_CODE`
    // cukup untuk melewati verifikasi OTP dan tidak boleh masuk jalur client
    // (AUTH-32). Keduanya harus hilang dari permukaan runtime modul.
    expect(Object.keys(service)).not.toContain("CURRENT_USER_ID");
    expect(Object.keys(service)).not.toContain("MFA_DEMO_CODE");
    expect(Object.keys(service)).not.toContain("DEMO_USER_ID");
  });

  it("tetap mengekspor constanta yang memang dipakai halaman", async () => {
    const service = await import("@/features/auth/service");

    for (const name of [
      "MFA_CHALLENGE_TTL_MS",
      "MFA_ENROLLMENT_TTL_MS",
      "MFA_BACKUP_CODE_COUNT",
      "MFA_MAX_ATTEMPTS",
      "MFA_INVALID_CODE_MESSAGE",
    ]) {
      expect(Object.keys(service)).toContain(name);
    }
  });
});

describe("mock user store", () => {
  it("mengenal id sesi placeholder saat bypass dev aktif", async () => {
    // Kontrak yang membuat template tetap bisa dicoba lokal: user store mock
    // harus punya baris untuk id yang dikembalikan `requireSessionForDev()`.
    // Kalau tidak, `getUserOrThrow()` menolak dan halaman keamanan selalu
    // "sesi berakhir" meski bypass sudah menyala.
    const { session, service } = await loadWithDevBypass();

    await expect(service.getMfaStatus(session.id)).resolves.toMatchObject({
      enabled: false,
      method: null,
    });
  });

  it("tetap menolak id yang tidak dikenal", async () => {
    const service = await import("@/features/auth/service");

    await expect(service.getMfaStatus("usr_tidak_ada")).rejects.toMatchObject({
      code: "UNAUTHENTICATED",
    });
  });
});

describe("kepemilikan enrolment", () => {
  it("email enrolment hanya bisa dikonfirmasi oleh pemiliknya", async () => {
    const { session, service } = await loadWithDevBypass();

    const challenge = await service.startEmailEnrollment(session.id);

    await expect(
      service.confirmEmailEnrollment(challenge.enrollmentId, "123456", "usr_lain"),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    await expect(
      service.confirmEmailEnrollment(challenge.enrollmentId, "123456", session.id),
    ).resolves.toEqual({ backupCodes: expect.any(Array) });
  });

  it("totp enrolment hanya bisa dikonfirmasi oleh pemiliknya", async () => {
    const { session, service } = await loadWithDevBypass();

    const secret = await service.startTotpEnrollment(session.id);

    await expect(
      service.confirmTotpEnrollment(secret.enrollmentId, "123456", "usr_lain"),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    await expect(
      service.confirmTotpEnrollment(secret.enrollmentId, "123456", session.id),
    ).resolves.toEqual({ backupCodes: expect.any(Array) });
  });

  it("tidak membocorkan keberadaan enrolment milik orang lain", async () => {
    const { session, service } = await loadWithDevBypass();

    const challenge = await service.startEmailEnrollment(session.id);
    const notMine = await service
      .confirmEmailEnrollment(challenge.enrollmentId, "123456", "usr_lain")
      .then(() => null, (error: unknown) => error);
    const unknown = await service
      .confirmEmailEnrollment("enr_hilang", "123456", "usr_lain")
      .then(() => null, (error: unknown) => error);

    // Pesan, code, dan `fieldErrors` harus identik supaya `enrollmentId` tidak
    // berubah jadi oracle "id ini ada tapi milik orang lain".
    const asShape = (error: unknown) => {
      const value = error as { code?: string; message?: string; fieldErrors?: unknown };

      return {
        code: value?.code,
        message: value?.message,
        fieldErrors: value?.fieldErrors,
      };
    };

    expect(asShape(notMine)).toEqual(asShape(unknown));
  });
});
