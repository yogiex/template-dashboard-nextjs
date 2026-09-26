import { beforeEach, describe, expect, it, vi } from "vitest";

import { verifyChain } from "@/features/audit/lib/integrity";
import { logAudit } from "@/features/audit/lib/log-audit";
import { getAuditEntries, resetAuditStore } from "@/features/audit/lib/store";
import type { AuditEventInput } from "@/features/audit/schema";
import { logger } from "@/lib/logger";

const VALID_INPUT: AuditEventInput = {
  action: "auth.login.success",
  category: "auth",
  source: "auth/actions",
};

function spyOnLogger() {
  return {
    info: vi.spyOn(logger, "info").mockImplementation(() => {}),
    warn: vi.spyOn(logger, "warn").mockImplementation(() => {}),
  };
}

beforeEach(() => {
  resetAuditStore();
});

describe("logAudit", () => {
  it("menyimpan entry valid dan mengembalikan object event yang sama dengan yang tersimpan", () => {
    spyOnLogger();

    const entry = logAudit({ ...VALID_INPUT, metadata: { attempt: 1 } });

    expect(entry).not.toBeNull();
    expect(getAuditEntries()).toHaveLength(1);
    expect(getAuditEntries()[0]).toEqual(entry);
  });

  it("memberikan id UUID dan timestamp ISO sekarang saat input tidak menyebutkannya", () => {
    spyOnLogger();

    const entry = logAudit(VALID_INPUT);

    expect(entry?.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(entry?.timestamp).toBe(new Date(entry?.timestamp ?? "").toISOString());
    expect(Math.abs(Date.now() - Date.parse(entry?.timestamp ?? ""))).toBeLessThan(60_000);
  });

  it("mempertahankan timestamp dari input saat diberikan", () => {
    spyOnLogger();

    const entry = logAudit({ ...VALID_INPUT, timestamp: "2026-03-01T10:00:00.000Z" });

    expect(entry?.timestamp).toBe("2026-03-01T10:00:00.000Z");
  });

  it("memberikan default severity info dan result success", () => {
    spyOnLogger();

    const entry = logAudit(VALID_INPUT);

    expect(entry?.severity).toBe("info");
    expect(entry?.result).toBe("success");
  });

  it("membuang key sensitif dari metadata lewat redaksi yang sama dengan metrik", () => {
    spyOnLogger();

    const entry = logAudit({
      ...VALID_INPUT,
      metadata: {
        password: "rahasia-super",
        token: "jwt-abc",
        authorization: "Bearer xyz",
        route: "/login",
        attempt: 2,
      },
    });

    expect(entry?.metadata).toEqual({ route: "/login", attempt: "2" });
    expect(JSON.stringify(entry)).not.toContain("rahasia-super");
    expect(JSON.stringify(entry)).not.toContain("jwt-abc");
    expect(JSON.stringify(entry)).not.toContain("Bearer xyz");
  });

  it("memask email di dalam metadata", () => {
    spyOnLogger();

    const entry = logAudit({
      ...VALID_INPUT,
      metadata: { email: "budi.santoso@contoh.id" },
    });

    expect(entry?.metadata?.email).toBe("bu••••••••••@contoh.id");
  });

  it("menolak user agent yang melebihi batas field", () => {
    spyOnLogger();

    expect(logAudit({ ...VALID_INPUT, userAgent: "x".repeat(121) })).toBeNull();
  });

  it("menolak metadata dengan nilai string melebihi batas", () => {
    spyOnLogger();

    const entry = logAudit({
      ...VALID_INPUT,
      metadata: { userAgent: "x".repeat(300) },
    });

    expect(entry).toBeNull();
  });

  it("menyimpan entry berantai hash yang dapat diverifikasi", () => {
    spyOnLogger();

    const first = logAudit(VALID_INPUT);
    const second = logAudit({ ...VALID_INPUT, action: "auth.login.failure" });

    expect(first?.previousHash).toBeNull();
    expect(second?.previousHash).toBe(first?.hash);
    expect(verifyChain(getAuditEntries())).toBe(-1);
  });

  it("menggabungkan input.actor dengan argumen actor, argumen actor menang per field", () => {
    spyOnLogger();

    const entry = logAudit(
      { ...VALID_INPUT, actor: { id: "usr_input", role: "admin", email: "a@b.id" } },
      { id: "usr_actor", role: "auditor" },
    );

    expect(entry?.actor).toEqual({
      id: "usr_actor",
      role: "auditor",
      email: "a••@b.id",
    });
  });

  it("memakai input.actor ketika argumen actor tidak diberikan", () => {
    spyOnLogger();

    const entry = logAudit({
      ...VALID_INPUT,
      actor: { id: "usr_input", role: "admin" },
    });

    expect(entry?.actor).toEqual({ id: "usr_input", role: "admin" });
  });

  it("tidak menempelkan properti actor sama sekali saat tidak ada actor", () => {
    spyOnLogger();

    const entry = logAudit(VALID_INPUT);

    expect(entry).not.toBeNull();
    expect("actor" in (entry ?? {})).toBe(false);
  });

  it("mengembalikan null dan tidak melempar untuk input yang gagal validasi", () => {
    const loggerSpy = spyOnLogger();

    const inputs: unknown[] = [
      null,
      undefined,
      {},
      "auth.login.success",
      42,
      [],
      { ...VALID_INPUT, action: "" },
      { ...VALID_INPUT, action: "x".repeat(101) },
      { ...VALID_INPUT, category: "unknown-category" },
      { ...VALID_INPUT, severity: "fatal" },
      { ...VALID_INPUT, result: "maybe" },
      { ...VALID_INPUT, source: "" },
      { ...VALID_INPUT, timestamp: "bukan-tanggal" },
      { ...VALID_INPUT, actor: { id: "x".repeat(65) } },
      { ...VALID_INPUT, resource: { type: "" } },
      { ...VALID_INPUT, metadata: { ["k".repeat(51)]: "v" } },
    ];

    for (const input of inputs) {
      expect(() => logAudit(input)).not.toThrow();
      expect(logAudit(input)).toBeNull();
    }

    expect(getAuditEntries()).toHaveLength(0);
    expect(loggerSpy.warn).toHaveBeenCalledWith("audit.invalid_event", {
      action: "unknown",
    });
  });

  it("tidak melempar untuk input patologis dan tetap mengembalikan null", () => {
    spyOnLogger();

    const cyclic: Record<string, unknown> = { note: "loop" };
    cyclic.self = cyclic;

    const withThrowingMetadataGetter: Record<string, unknown> = {
      action: VALID_INPUT.action,
      category: VALID_INPUT.category,
      source: VALID_INPUT.source,
    };

    Object.defineProperty(withThrowingMetadataGetter, "metadata", {
      get() {
        throw new Error("getter jebakan");
      },
      enumerable: true,
      configurable: true,
    });

    const withThrowingValue = {
      ...VALID_INPUT,
      metadata: {
        get jebakan(): string {
          throw new Error("nilai jebakan");
        },
      },
    };

    const hostile: unknown[] = [
      cyclic,
      withThrowingMetadataGetter,
      withThrowingValue,
      new Map(),
      new Date(),
      () => "callable",
      Symbol("audit"),
    ];

    for (const input of hostile) {
      expect(() => logAudit(input)).not.toThrow();
      expect(logAudit(input)).toBeNull();
    }

    expect(getAuditEntries()).toHaveLength(0);
  });

  it("meratakan metadata non-primitif tanpa kehilangan isi", () => {
    spyOnLogger();

    const entry = logAudit({
      ...VALID_INPUT,
      metadata: {
        list: [1, 2, 3],
        nihil: null,
        flag: true,
      },
    });

    expect(entry?.metadata).toEqual({
      list: "[1,2,3]",
      flag: "true",
    });
  });

  it("menolak object metadata bersarang karena boundary hanya menerima scalar", () => {
    spyOnLogger();

    expect(
      logAudit({
        ...VALID_INPUT,
        metadata: { changes: { theme: "dark" } } as never,
      }),
    ).toBeNull();
  });

  it("menolak nilai metadata yang tidak serializable", () => {
    spyOnLogger();

    expect(
      logAudit({ ...VALID_INPUT, metadata: { big: BigInt(10) } as never }),
    ).toBeNull();
    expect(
      logAudit({ ...VALID_INPUT, metadata: { sym: Symbol("x") } as never }),
    ).toBeNull();
    expect(
      logAudit({ ...VALID_INPUT, metadata: { nan: Number.NaN } as never }),
    ).toBeNull();
  });

  it("menangani metadata berukuran besar tanpa melempar", () => {
    spyOnLogger();

    const metadata: Record<string, string> = {};

    for (let index = 0; index < 5_000; index += 1) {
      metadata[`k${index}`] = `v${index}`;
    }

    const entry = logAudit({ ...VALID_INPUT, metadata });

    expect(entry).toBeNull();
  });

  it("menerima metadata tepat di bawah batas dan menolak yang melewati", () => {
    spyOnLogger();

    const withinBudget: Record<string, string> = {};

    for (let index = 0; index < 40; index += 1) {
      withinBudget[`k${index}`] = `v${index}`;
    }

    expect(logAudit({ ...VALID_INPUT, metadata: withinBudget })).not.toBeNull();

    const overBytes: Record<string, string> = {};

    for (let index = 0; index < 40; index += 1) {
      overBytes[`k${index}`] = "y".repeat(200);
    }

    expect(logAudit({ ...VALID_INPUT, metadata: overBytes })).toBeNull();
  });

  it("tetap menulis entry yang valid setelah menerima input yang tidak valid", () => {
    spyOnLogger();

    expect(logAudit(null)).toBeNull();
    const entry = logAudit(VALID_INPUT);

    expect(entry).not.toBeNull();
    expect(getAuditEntries()).toHaveLength(1);
    expect(getAuditEntries()[0]?.hash).toBe(entry?.hash);
  });
});
