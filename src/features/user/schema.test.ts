import { describe, expect, it } from "vitest";

import {
  createUserSchema,
  deleteUserSchema,
  updateUserSchema,
  userQuerySchema,
  userSchema,
} from "@/features/user/schema";

const VALID_USER = {
  id: "usr_01H",
  name: "Budi Santoso",
  email: "budi@example.com",
  role: "admin",
  status: "active",
  createdAt: new Date("2026-01-01T00:00:00Z"),
};

describe("userSchema", () => {
  it("menerima user yang valid", () => {
    expect(userSchema.safeParse(VALID_USER).success).toBe(true);
  });

  it("menolak role dan status di luar enum", () => {
    expect(userSchema.safeParse({ ...VALID_USER, role: "superadmin" }).success).toBe(
      false,
    );
    expect(userSchema.safeParse({ ...VALID_USER, status: "deleted" }).success).toBe(
      false,
    );
  });

  it("menolak createdAt yang bukan Date", () => {
    expect(
      userSchema.safeParse({ ...VALID_USER, createdAt: "2026-01-01" }).success,
    ).toBe(false);
  });

  it("menolak id kosong dan email lebih dari 254 karakter", () => {
    expect(userSchema.safeParse({ ...VALID_USER, id: "" }).success).toBe(false);
    expect(
      userSchema.safeParse({
        ...VALID_USER,
        email: `${"a".repeat(250)}@example.com`,
      }).success,
    ).toBe(false);
  });
});

describe("deleteUserSchema", () => {
  it("menerima id alfanumerik dengan tanda hubung dan garis bawah", () => {
    expect(deleteUserSchema.safeParse({ id: "usr-01_A" }).success).toBe(true);
  });

  it("menolak id kosong, terlalu panjang, dan dengan karakter ilegal", () => {
    expect(deleteUserSchema.safeParse({ id: "" }).success).toBe(false);
    expect(deleteUserSchema.safeParse({ id: "a".repeat(65) }).success).toBe(false);
    expect(deleteUserSchema.safeParse({ id: "usr/../admin" }).success).toBe(false);
    expect(deleteUserSchema.safeParse({ id: "usr 01" }).success).toBe(false);
  });

  it("memberi pesan aman pada id yang tidak valid", () => {
    const result = deleteUserSchema.safeParse({ id: "a b" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("ID tidak valid");
    }
  });
});

describe("createUserSchema", () => {
  const base = {
    name: "Budi Santoso",
    email: "budi@example.com",
    role: "viewer",
    status: "pending",
  };

  it("menerima nama latin, unicode, dan nama berimponan", () => {
    for (const name of ["Budi Santoso", "José Álvarez", "Jean-Luc Picard Jr"]) {
      expect(createUserSchema.safeParse({ ...base, name }).success).toBe(true);
    }
  });

  it("menolak nama yang diawali angka, diakhiri spasi, atau terlalu pendek", () => {
    for (const name of ["1Budi", "Budi ", "B"]) {
      expect(createUserSchema.safeParse({ ...base, name }).success).toBe(false);
    }
  });

  it("menolak nama lebih dari 100 karakter", () => {
    const name = `B${"a".repeat(100)}`;

    expect(createUserSchema.safeParse({ ...base, name }).success).toBe(false);
  });

  it("menerima nama dua karakter", () => {
    expect(createUserSchema.safeParse({ ...base, name: "Bú" }).success).toBe(true);
  });
});

describe("updateUserSchema", () => {
  it("mewarisi aturan create lalu mewajibkan id", () => {
    const base = {
      id: "usr_01H",
      name: "Budi Santoso",
      email: "budi@example.com",
      role: "editor",
      status: "active",
    };

    expect(updateUserSchema.safeParse(base).success).toBe(true);
    expect(updateUserSchema.safeParse({ ...base, id: "" }).success).toBe(false);
    expect(updateUserSchema.safeParse({ ...base, role: "root" }).success).toBe(false);
  });
});

describe("userQuerySchema", () => {
  it("mengisi default sorting dan pagination", () => {
    const result = userQuerySchema.safeParse({});

    expect(result.success).toBe(true);
    expect(result.success && result.data).toMatchObject({
      sort: "createdAt",
      dir: "desc",
      page: 1,
      pageSize: 10,
    });
  });

  it("membuang role yang tidak dikenal tanpa menggagalkan parsing", () => {
    const result = userQuerySchema.safeParse({ role: "superadmin" });

    expect(result.success).toBe(true);
    expect(result.success && result.data.role).toBeUndefined();
  });

  it("mempertahankan role yang valid", () => {
    const result = userQuerySchema.safeParse({ role: "editor" });

    expect(result.success && result.data.role).toBe("editor");
  });

  it("kembali ke default saat sort atau dir tidak valid", () => {
    const result = userQuerySchema.safeParse({ sort: "password", dir: "sideways" });

    expect(result.success && result.data.sort).toBe("createdAt");
    expect(result.success && result.data.dir).toBe("desc");
  });

  it("menerima sort field yang diizinkan", () => {
    for (const sort of ["name", "email", "createdAt"]) {
      expect(userQuerySchema.safeParse({ sort }).success).toBe(true);
    }
  });
});
