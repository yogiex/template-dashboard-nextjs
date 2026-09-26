import { describe, expect, it } from "vitest";

import {
  authPageConfigSchema,
  backupCodeSchema,
  forgotPasswordFormSchema,
  loginFormSchema,
  otpCodeSchema,
  passwordSchema,
  registerFormSchema,
  resetPasswordFormSchema,
  resetTokenSchema,
  verifyBackupCodeFormSchema,
} from "@/features/auth/schema";

const VALID_PASSWORD = "RahasiaKuat123";
const VALID_TOKEN = "a".repeat(64);

describe("passwordSchema", () => {
  it("menerima password yang memenuhi semua aturan", () => {
    expect(passwordSchema.safeParse(VALID_PASSWORD).success).toBe(true);
  });

  it("menolak password kosong dan terlalu pendek", () => {
    expect(passwordSchema.safeParse("").success).toBe(false);
    expect(passwordSchema.safeParse("Ab1").success).toBe(false);
  });

  it("menolak password lebih dari 72 karakter", () => {
    expect(passwordSchema.safeParse(`${VALID_PASSWORD}${"a".repeat(60)}`).success).toBe(
      false,
    );
    expect(passwordSchema.safeParse(`${"a".repeat(60)}A1`).success).toBe(true);
  });

  it("memeratkan komposisi huruf besar, huruf kecil, dan angka", () => {
    expect(passwordSchema.safeParse("rahasia123").success).toBe(false);
    expect(passwordSchema.safeParse("Rahasia123").success).toBe(true);
    expect(passwordSchema.safeParse("rahasiaKuat").success).toBe(false);
  });

  it("menerima password unicode yang tetap memenuhi komposisi", () => {
    expect(passwordSchema.safeParse("Pässwörd123").success).toBe(true);
  });
});

describe("loginFormSchema", () => {
  it("memberikan default false pada rememberMe", () => {
    const result = loginFormSchema.safeParse({
      email: "pengguna@example.com",
      password: "apapun123",
    });

    expect(result.success).toBe(true);
    expect(result.success && result.data.rememberMe).toBe(false);
  });

  it("menolak email kosong dan format email salah", () => {
    expect(
      loginFormSchema.safeParse({ email: "", password: "apapun123" }).success,
    ).toBe(false);
    expect(
      loginFormSchema.safeParse({ email: "bukan-email", password: "apapun123" })
        .success,
    ).toBe(false);
  });

  it("tidak mewajibkan komposisi password pada login", () => {
    expect(
      loginFormSchema.safeParse({
        email: "pengguna@example.com",
        password: "aaaaaaaa",
      }).success,
    ).toBe(true);
  });
});

describe("registerFormSchema", () => {
  const base = {
    name: "Budi Santoso",
    email: "budi@example.com",
    password: VALID_PASSWORD,
    confirmPassword: VALID_PASSWORD,
    acceptTerms: true,
  };

  it("menerima input lengkap yang valid", () => {
    expect(registerFormSchema.safeParse(base).success).toBe(true);
  });

  it("menandai field confirmPassword saat password tidak sama", () => {
    const result = registerFormSchema.safeParse({
      ...base,
      confirmPassword: "Lain123456",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.confirmPassword).toContain(
        "Password dan konfirmasi tidak sama",
      );
    }
  });

  it("menolak nama dengan angka, simbol, atau terlalu pendek", () => {
    for (const name of ["B", "Budi123", "Budi@Home", ""]) {
      expect(registerFormSchema.safeParse({ ...base, name }).success).toBe(false);
    }
  });

  it("menerima nama unicode, tanda hubung, dan nama majemuk", () => {
    for (const name of ["José Álvarez", "O'Brien-Smith", "Anne-Marie D'Arcy"]) {
      expect(registerFormSchema.safeParse({ ...base, name }).success).toBe(true);
    }
  });

  it("menolak email lebih dari 254 karakter", () => {
    const email = `${"a".repeat(250)}@example.com`;

    expect(registerFormSchema.safeParse({ ...base, email }).success).toBe(false);
  });

  it("mewajibkan persetujuan syarat & ketentuan", () => {
    const result = registerFormSchema.safeParse({ ...base, acceptTerms: false });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "Anda harus menyetujui syarat & ketentuan",
      );
    }
  });
});

describe("forgotPasswordFormSchema", () => {
  it("hanya membutuhkan email yang valid", () => {
    expect(forgotPasswordFormSchema.safeParse({ email: "a@b.co" }).success).toBe(
      true,
    );
    expect(forgotPasswordFormSchema.safeParse({}).success).toBe(false);
  });
});

describe("resetTokenSchema dan resetPasswordFormSchema", () => {
  it("menerima token hex 64 karakter", () => {
    expect(resetTokenSchema.safeParse(VALID_TOKEN).success).toBe(true);
    expect(resetTokenSchema.safeParse("0123456789abcdef".repeat(4)).success).toBe(
      true,
    );
  });

  it("menolak token dengan panjang salah atau huruf besar", () => {
    expect(resetTokenSchema.safeParse("a".repeat(63)).success).toBe(false);
    expect(resetTokenSchema.safeParse("A".repeat(64)).success).toBe(false);
    expect(resetTokenSchema.safeParse("g".repeat(64)).success).toBe(false);
  });

  it("menyetor ulang password hanya jika konfirmasi cocok", () => {
    const input = { token: VALID_TOKEN, password: VALID_PASSWORD };

    expect(
      resetPasswordFormSchema.safeParse({ ...input, confirmPassword: VALID_PASSWORD })
        .success,
    ).toBe(true);
    expect(
      resetPasswordFormSchema.safeParse({ ...input, confirmPassword: "Beda12345" })
        .success,
    ).toBe(false);
  });
});

describe("otpCodeSchema", () => {
  it("menerima tepat enam digit ASCII", () => {
    expect(otpCodeSchema.safeParse("123456").success).toBe(true);
    expect(otpCodeSchema.safeParse("000000").success).toBe(true);
  });

  it("menolak panjang salah, huruf, dan angka non-ASCII", () => {
    expect(otpCodeSchema.safeParse("12345").success).toBe(false);
    expect(otpCodeSchema.safeParse("1234567").success).toBe(false);
    expect(otpCodeSchema.safeParse("12a456").success).toBe(false);
    expect(otpCodeSchema.safeParse("١٢٣٤٥٦").success).toBe(false);
  });
});

describe("backupCodeSchema", () => {
  it("menormalisasi input huruf kecil dan spasi", () => {
    const result = verifyBackupCodeFormSchema.safeParse({ code: "  abcd-efgh  " });

    expect(result.success).toBe(true);
    expect(result.success && result.data.code).toBe("ABCD-EFGH");
  });

  it("menolak format di luar XXXX-XXXX", () => {
    expect(backupCodeSchema.safeParse("ABCDEFGH").success).toBe(false);
    expect(backupCodeSchema.safeParse("ABC-DEF-GH").success).toBe(false);
    expect(backupCodeSchema.safeParse("AB!D-EFGH").success).toBe(false);
  });

  it("menerima angka di dalam backup code", () => {
    expect(backupCodeSchema.safeParse("AB1D-2F3G").success).toBe(true);
  });
});

describe("authPageConfigSchema", () => {
  const config = {
    branding: {
      appName: "Nexus",
      tagline: "Kelola akses terpusat",
      highlights: [
        { icon: "shield", title: "Aman", description: "MFA dan audit log." },
      ],
    },
    footer: {
      copyright: "© 2026",
      links: [{ label: "Privasi", href: "/legal/privacy" }],
    },
  };

  it("menerima konfigurasi halaman auth yang valid", () => {
    expect(authPageConfigSchema.safeParse(config).success).toBe(true);
  });

  it("menolak lebih dari empat highlight", () => {
    const highlights = Array.from({ length: 5 }, () => config.branding.highlights[0]);

    expect(
      authPageConfigSchema.safeParse({
        ...config,
        branding: { ...config.branding, highlights },
      }).success,
    ).toBe(false);
  });

  it("menolak nama ikon di luar daftar yang diizinkan", () => {
    const result = authPageConfigSchema.safeParse({
      ...config,
      branding: {
        ...config.branding,
        highlights: [{ icon: "unknown", title: "A", description: "B" }],
      },
    });

    expect(result.success).toBe(false);
  });

  it("membatasi panjang tagline maksimal 120 karakter", () => {
    const withTagline = (tagline: string) => ({
      ...config,
      branding: { ...config.branding, tagline },
    });

    expect(
      authPageConfigSchema.safeParse(withTagline("a".repeat(120))).success,
    ).toBe(true);
    expect(
      authPageConfigSchema.safeParse(withTagline("a".repeat(121))).success,
    ).toBe(false);
  });

  it("mewajibkan tagline pada branding", () => {
    const { tagline, ...branding } = config.branding;

    expect(tagline).toBeDefined();
    expect(authPageConfigSchema.safeParse({ ...config, branding }).success).toBe(
      false,
    );
  });
});

describe("batas panjang email (254 karakter)", () => {
  const EMAIL_DOMAIN = "@example.com";
  const TOO_LONG_MESSAGE = "Email terlalu panjang";

  /**
   * Email syntaktis valid dengan panjang total tepat `length`: local part
   * disesuaikan supaya panjang keseluruhan = length. Dipakai untuk menguji
   * batas tepat (254 diterima, 255 ditolak), bukan sekadar string sepanjang N.
   */
  const emailOfLength = (length: number): string =>
    "a".repeat(length - EMAIL_DOMAIN.length) + EMAIL_DOMAIN;

  const registerInput = (email: string) => ({
    name: "Budi Santoso",
    email,
    password: VALID_PASSWORD,
    confirmPassword: VALID_PASSWORD,
    acceptTerms: true,
  });

  const loginInput = (email: string) => ({ email, password: "apapun123" });

  it("email 254 karakter yang disusun tetap valid secara sintaksis", () => {
    expect(emailOfLength(254)).toHaveLength(254);
    expect(
      loginFormSchema.safeParse(loginInput(emailOfLength(254))).success,
    ).toBe(true);
  });

  it("loginFormSchema menerima 254 karakter dan menolak 255 karakter", () => {
    expect(
      loginFormSchema.safeParse(loginInput(emailOfLength(254))).success,
    ).toBe(true);
    expect(
      loginFormSchema.safeParse(loginInput(emailOfLength(255))).success,
    ).toBe(false);
  });

  it("registerFormSchema menerima 254 karakter dan menolak 255 karakter", () => {
    expect(
      registerFormSchema.safeParse(registerInput(emailOfLength(254))).success,
    ).toBe(true);
    expect(
      registerFormSchema.safeParse(registerInput(emailOfLength(255))).success,
    ).toBe(false);
  });

  it("forgotPasswordFormSchema menerima 254 karakter dan menolak 255 karakter", () => {
    expect(
      forgotPasswordFormSchema.safeParse({ email: emailOfLength(254) }).success,
    ).toBe(true);
    expect(
      forgotPasswordFormSchema.safeParse({ email: emailOfLength(255) }).success,
    ).toBe(false);
  });

  it("loginFormSchema menolak email jauh melampaui batas", () => {
    const email = "a".repeat(5_000) + EMAIL_DOMAIN;

    expect(loginFormSchema.safeParse(loginInput(email)).success).toBe(false);
  });

  it("loginFormSchema memakai pesan batas berbahasa Indonesia", () => {
    const result = loginFormSchema.safeParse(loginInput(emailOfLength(255)));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(TOO_LONG_MESSAGE);
    }
  });

  it("forgotPasswordFormSchema memakai pesan batas berbahasa Indonesia", () => {
    const result = forgotPasswordFormSchema.safeParse({
      email: emailOfLength(255),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email).toContain(TOO_LONG_MESSAGE);
    }
  });

  it("registerFormSchema memakai pesan batas berbahasa Indonesia", () => {
    const result = registerFormSchema.safeParse(registerInput(emailOfLength(255)));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(TOO_LONG_MESSAGE);
    }
  });

  it("email panjang dengan format salah tetap ditolak karena format", () => {
    const result = loginFormSchema.safeParse(loginInput("a".repeat(300)));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Format email tidak valid");
    }
  });

  it("email pendek yang sebelumnya valid tetap diterima semua schema", () => {
    for (const email of ["a@b.co", "budi@example.com"]) {
      expect(loginFormSchema.safeParse(loginInput(email)).success).toBe(true);
      expect(registerFormSchema.safeParse(registerInput(email)).success).toBe(true);
      expect(forgotPasswordFormSchema.safeParse({ email }).success).toBe(true);
    }
  });
});
