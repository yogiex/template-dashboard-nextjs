import { describe, expect, it } from "vitest";

import {
  ERROR_CODES,
  AppError,
  getErrorMessage,
  getErrorStatus,
  type ErrorCode,
} from "@/lib/error";

describe("error taxonomy", () => {
  it("memiliki tujuh kode error yang stabil", () => {
    expect(ERROR_CODES).toEqual([
      "VALIDATION_ERROR",
      "UNAUTHENTICATED",
      "FORBIDDEN",
      "NOT_FOUND",
      "CONFLICT",
      "RATE_LIMITED",
      "INTERNAL_ERROR",
    ]);
  });

  it.each([
    ["VALIDATION_ERROR", 400],
    ["UNAUTHENTICATED", 401],
    ["FORBIDDEN", 403],
    ["NOT_FOUND", 404],
    ["CONFLICT", 409],
    ["RATE_LIMITED", 429],
    ["INTERNAL_ERROR", 500],
  ] as const)("memetakan %s ke status %i", (code, status) => {
    expect(getErrorStatus(code)).toBe(status);
  });

  it("memberikan pesan aman yang berbeda per kode", () => {
    const messages = ERROR_CODES.map((code) => getErrorMessage(code));

    expect(new Set(messages).size).toBe(ERROR_CODES.length);
    for (const message of messages) {
      expect(message.length).toBeGreaterThan(0);
    }
  });
});

describe("AppError", () => {
  it("mewarisi Error dan menandai dirinya sebagai AppError", () => {
    const error = new AppError("NOT_FOUND");

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
    expect(error.name).toBe("AppError");
  });

  it("memakai pesan default dari kode saat message tidak diisi", () => {
    const error = new AppError("FORBIDDEN");

    expect(error.message).toBe(getErrorMessage("FORBIDDEN"));
    expect(error.userMessage).toBe(getErrorMessage("FORBIDDEN"));
  });

  it("mempertahankan pesan internal sebagai message, bukan userMessage", () => {
    const error = new AppError("VALIDATION_ERROR", {
      message: "Kolom email wajib diisi.",
    });

    expect(error.message).toBe("Kolom email wajib diisi.");
    expect(error.userMessage).toBe(getErrorMessage("VALIDATION_ERROR"));
  });

  it("menurunkan status dari kode", () => {
    expect(new AppError("RATE_LIMITED").status).toBe(429);
    expect(new AppError("INTERNAL_ERROR").status).toBe(500);
  });

  it("menyimpan fieldErrors apa adanya", () => {
    const fieldErrors = { email: ["Format email tidak valid"] };
    const error = new AppError("VALIDATION_ERROR", { fieldErrors });

    expect(error.fieldErrors).toEqual(fieldErrors);
  });

  it("menyimpan cause untuk diagnosa tanpa membocorkannya ke pesan", () => {
    const cause = new Error("koneksi database gagal");
    const error = new AppError("INTERNAL_ERROR", { cause });

    expect(error.cause).toBe(cause);
    expect(error.message).not.toContain("koneksi database gagal");
  });

  it("tidak membuat fieldErrors ketika tidak diberikan", () => {
    expect(new AppError("CONFLICT").fieldErrors).toBeUndefined();
  });

  it("tetap menyimpan code setiap kode yang valid", () => {
    for (const code of ERROR_CODES) {
      const typed: ErrorCode = code;
      expect(new AppError(typed).code).toBe(typed);
    }
  });
});
