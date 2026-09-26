import { describe, expect, it } from "vitest";

import {
  hashIp,
  maskEmail,
  redactActor,
  redactEvidence,
  redactTags,
  truncateUserAgent,
} from "@/lib/redact";

describe("hashIp", () => {
  it("menghasilkan hex truncated 16 karakter", () => {
    const hash = hashIp("203.0.113.7");

    expect(hash).toHaveLength(16);
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it("deterministik untuk input yang sama", () => {
    expect(hashIp("198.51.100.1")).toBe(hashIp("198.51.100.1"));
  });

  it("berbeda untuk input berbeda", () => {
    expect(hashIp("198.51.100.1")).not.toBe(hashIp("198.51.100.2"));
  });
});

describe("maskEmail", () => {
  it("menyembunyikan sebagian besar local part dan mempertahankan domain", () => {
    expect(maskEmail("user@example.com")).toBe("us••@example.com");
  });

  it("mempertahankan minimal dua karakter tersembunyi", () => {
    expect(maskEmail("a@b.com")).toBe("a••@b.com");
  });

  it("mengembalikan penanda aman untuk email tanpa @", () => {
    expect(maskEmail("nodomain")).toBe("***");
    expect(maskEmail("")).toBe("***");
    expect(maskEmail("@example.com")).toBe("***");
    expect(maskEmail("user@")).toBe("***");
  });

  it("menangani email unicode dan plus alias", () => {
    const masked = maskEmail("éé+saya@mail.example.co.id");

    expect(masked).toContain("@mail.example.co.id");
    expect(masked.startsWith("éé")).toBe(true);
    expect(masked).not.toContain("saya");
  });
});

describe("truncateUserAgent", () => {
  it("memotong user agent pada 120 karakter", () => {
    expect(truncateUserAgent("a".repeat(200))).toHaveLength(120);
  });

  it("tidak mengubah user agent pendek maupun kosong", () => {
    expect(truncateUserAgent("Mozilla/5.0")).toBe("Mozilla/5.0");
    expect(truncateUserAgent("")).toBe("");
  });
});

describe("redactTags", () => {
  it("mengembalikan object kosong untuk input undefined", () => {
    expect(redactTags(undefined)).toEqual({});
  });

  it("membuang key sensitif sepenuhnya, bukan hanya disamarkan", () => {
    const result = redactTags({
      password: "rahasia",
      accessToken: "token-123",
      authorization: "Bearer abc",
      cookie: "session=1",
      apiKey: "key-1",
      otp: "123456",
      code: "ABC",
    });

    expect(result).toEqual({});
  });

  it("melempar nilai null dan undefined", () => {
    const result = redactTags({ action: "login", detail: null, extra: undefined });

    expect(result).toEqual({ action: "login" });
  });

  it("meng-hash nilai IP dan memproses daftar x-forwarded-for per item", () => {
    const result = redactTags({ ip: "203.0.113.7, 198.51.100.1" });
    const [first, second] = (result.ip ?? "").split(",");

    expect(result.ip).not.toContain("203.0.113.7");
    expect(first).toBe(hashIp("203.0.113.7"));
    expect(second).toBe(hashIp("198.51.100.1"));
  });

  it("mengenal beberapa variasi key IP dan key email", () => {
    const result = redactTags({
      ipAddress: "203.0.113.9",
      remote_addr: "203.0.113.10",
      username: "budi.santoso",
      user_name: "budi.santoso",
    });

    expect(result.ipAddress).toBe(hashIp("203.0.113.9"));
    expect(result.remote_addr).toBe(hashIp("203.0.113.10"));
    expect(result.username).toBe("***");
    expect(result.user_name).toBe("***");
  });

  it("menyembunyikan username yang berbentuk email", () => {
    expect(redactTags({ username: "budi@example.com" }).username).toBe(
      "bu••@example.com",
    );
  });

  it("memotong user agent pada key yang dikenali", () => {
    const result = redactTags({ user_agent: "u".repeat(200) });

    expect(result.user_agent).toHaveLength(120);
  });

  it("memotong nilai key biasa pada 200 karakter", () => {
    const result = redactTags({ reason: "r".repeat(500) });

    expect(result.reason).toHaveLength(200);
  });

  it("tidak menyimpan nilai key biasa yang sangat panjang maupun tersembunyi di key", () => {
    const result = redactTags({ mySecretNote: "jangan simpan" });

    expect(result.mySecretNote).toBeUndefined();
  });

  it("membalik nilai non-string menjadi string", () => {
    const result = redactTags({ attempt: 3, passed: true });

    expect(result).toEqual({ attempt: "3", passed: "true" });
  });
});

describe("redactEvidence", () => {
  it("memakai aturan redaksi yang sama dengan tags", () => {
    expect(redactEvidence({ password: "rahasia", action: "login" })).toEqual({
      action: "login",
    });
  });

  it("tidak pernah menyimpan nilai mentah pada object bersarang", () => {
    const result = redactEvidence({
      event: {
        email: "rahasia@example.com",
        authorization: "Bearer token",
      },
    });

    expect(JSON.stringify(result)).not.toContain("Bearer token");
    expect(JSON.stringify(result)).not.toContain("rahasia@example.com");
    expect(result).toHaveProperty("event");
  });
});

describe("redactTags pada nilai non-string", () => {
  it("mereduah object bersarang, bukan menjadi [object Object]", () => {
    const result = redactTags({ outer: { theme: "dark", size: 2 } });

    expect(result.outer).toBe('{theme:"dark",size:2}');
    expect(result.outer).not.toContain("[object Object]");
  });

  it("memask email di dalam object bersarang", () => {
    const result = redactTags({ outer: { email: "budi@contoh.id" } });

    expect(result.outer).toBe(`{email:${JSON.stringify(maskEmail("budi@contoh.id"))}}`);
    expect(result.outer).not.toContain("budi@");
  });

  it("membuang key sensitif di dalam object bersarang", () => {
    const result = redactTags({
      outer: { password: "rahasia", authorization: "Bearer x", keep: "boleh" },
    });

    expect(result.outer).not.toContain("rahasia");
    expect(result.outer).not.toContain("Bearer x");
    expect(result.outer).toContain("boleh");
  });

  it("mereduah array dan membatasi jumlah item", () => {
    expect(redactTags({ list: [1, 2, 3] }).list).toBe("[1,2,3]");

    const long = redactTags({ list: Array.from({ length: 50 }, (_, i) => i) });

    expect(long.list).toContain("[+30 more]");
  });

  it("memotong object yang terlalu dalam", () => {
    const result = redactTags({
      deep: { a: { b: { c: { d: { e: { f: "nilai" } } } } } },
    });

    expect(result.deep).toContain("[TRUNCATED]");
  });

  it("tidak melempar untuk BigInt, Symbol, dan function", () => {
    expect(() => redactTags({ big: BigInt(10) })).not.toThrow();
    expect(redactTags({ big: BigInt(10) }).big).toBe("10n");
    expect(() => redactTags({ sym: Symbol("x") })).not.toThrow();
    expect(() => redactTags({ fn: () => 1 })).not.toThrow();
  });

  it("menangani object bersiklus tanpa stack overflow", () => {
    const cyclic: Record<string, unknown> = { name: "loop" };

    cyclic.self = cyclic;

    expect(() => redactTags({ cyclic })).not.toThrow();
  });

  it("memotong nilai string yang melebihi batas tag", () => {
    const result = redactTags({ note: "a".repeat(500) });

    expect(result.note).toHaveLength(200);
  });
});

describe("redactActor", () => {
  it("memask email dan mempertahankan id serta role", () => {
    const result = redactActor({
      id: "usr_1",
      email: "budi.santoso@contoh.id",
      role: "admin",
    });

    expect(result).toEqual({
      id: "usr_1",
      email: maskEmail("budi.santoso@contoh.id"),
      role: "admin",
    });
    expect(result?.email).not.toContain("budi.santoso@");
  });

  it("mengembalikan actor tanpa email apa adanya", () => {
    const actor = { id: "usr_1", role: "viewer" };

    expect(redactActor(actor)).toBe(actor);
  });

  it("mengembalikan undefined untuk actor kosong", () => {
    expect(redactActor(undefined)).toBeUndefined();
  });
});
