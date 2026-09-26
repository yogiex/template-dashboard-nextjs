import { describe, expect, it } from "vitest";

import { getPasswordStrength } from "@/lib/password-strength";

describe("getPasswordStrength", () => {
  it("mengembalikan skor 0 untuk string kosong", () => {
    expect(getPasswordStrength("")).toEqual({ score: 0, label: "Sangat lemah" });
  });

  it("menghitung spasi sebagai karakter non-alphanumeric", () => {
    expect(getPasswordStrength(" ").score).toBe(2);
  });

  it("menurunkan skor spasi berulang menjadi lemah", () => {
    expect(getPasswordStrength("        ").score).toBe(1);
  });

  it("menambah satu poin pada panjang minimal 8 karakter", () => {
    expect(getPasswordStrength("abcdefgh").score).toBe(2);
  });

  it("tidak menambah poin pada panjang tepat 7 karakter", () => {
    expect(getPasswordStrength("abcdefg").score).toBe(1);
  });

  it("menambah satu poin lagi pada panjang minimal 12 karakter", () => {
    expect(getPasswordStrength("abcdefghijkl").score).toBe(3);
  });

  it("menambah poin untuk angka dan simbol", () => {
    expect(getPasswordStrength("abcdefgh1").score).toBe(3);
    expect(getPasswordStrength("abcdefgh!").score).toBe(3);
    expect(getPasswordStrength("abcdefg1!").score).toBe(4);
  });

  it("menyamakan skor ke label yang sesuai", () => {
    expect(getPasswordStrength("abcdefg1!").label).toBe("Sangat kuat");
    expect(getPasswordStrength("abcdefghijkl").label).toBe("Kuat");
  });

  it("menjaga skor tetap di rentang 0 sampai 4", () => {
    const result = getPasswordStrength(
      "Str0ng!Passw0rd#With$Many%Chars&Long+Enough",
    );
    expect(result.score).toBe(4);
    expect(result.label).toBe("Sangat kuat");
  });

  it("menurunkan skor untuk karakter yang berulang", () => {
    expect(getPasswordStrength("aaaaaaaaaaaa").score).toBe(1);
    expect(getPasswordStrength("abababababab").score).toBe(3);
  });

  it("menurunkan skor untuk password umum, apa pun huruf besarnya", () => {
    expect(getPasswordStrength("Password123!").score).toBe(1);
    expect(getPasswordStrength("qwerty1234").score).toBe(1);
    expect(getPasswordStrength("letmeinAdmin1").score).toBe(1);
  });

  it("mengenali awalan password umum hanya di awal string", () => {
    expect(getPasswordStrength("my-password1!A").score).toBe(4);
  });
  it("menghitung huruf non-ASCII sebagai karakter non-alphanumeric", () => {
    const result = getPasswordStrength("Passw0rdé");

    expect(result.score).toBe(4);
    expect(result.label).toBe("Sangat kuat");
  });

  it("menghitung panjang unicode sebagai code unit JavaScript", () => {
    const result = getPasswordStrength("🔐".repeat(6));
    expect(result.score).toBeGreaterThanOrEqual(1);
    expect(result.score).toBeLessThanOrEqual(4);
  });
});
