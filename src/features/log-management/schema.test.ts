import { describe, expect, it } from "vitest";

import {
  approveDisposalSchema,
  completeDisposalSchema,
  logQuerySchema,
  retentionWindowSchema,
  runSweepSchema,
  scheduleDisposalSchema,
} from "@/features/log-management/schema";

describe("retentionWindowSchema", () => {
  const base = { category: "log", retentionDays: 90, gracePeriodHours: 24 };

  it("menerima jendela retensi yang valid", () => {
    expect(retentionWindowSchema.safeParse(base).success).toBe(true);
  });

  it("menolak retentionDays di luar 1..3650", () => {
    expect(retentionWindowSchema.safeParse({ ...base, retentionDays: 0 }).success).toBe(
      false,
    );
    expect(
      retentionWindowSchema.safeParse({ ...base, retentionDays: 3651 }).success,
    ).toBe(false);
  });

  it("membatasi gracePeriodHours maksimal 30 hari", () => {
    expect(
      retentionWindowSchema.safeParse({ ...base, gracePeriodHours: 720 }).success,
    ).toBe(true);
    expect(
      retentionWindowSchema.safeParse({ ...base, gracePeriodHours: 721 }).success,
    ).toBe(false);
  });

  it("menolak nilai pecahan dan non-numerik", () => {
    expect(retentionWindowSchema.safeParse({ ...base, retentionDays: 30.5 }).success).toBe(
      false,
    );
    expect(retentionWindowSchema.safeParse({ ...base, retentionDays: "abc" }).success).toBe(
      false,
    );
  });

  it("menolak category di luar daftar audit", () => {
    expect(retentionWindowSchema.safeParse({ ...base, category: "pii" }).success).toBe(
      false,
    );
  });

  it("membatasi panjang note opsional", () => {
    expect(
      retentionWindowSchema.safeParse({ ...base, note: "a".repeat(240) }).success,
    ).toBe(true);
    expect(
      retentionWindowSchema.safeParse({ ...base, note: "a".repeat(241) }).success,
    ).toBe(false);
  });
});

describe("scheduleDisposalSchema", () => {
  it("memakai kontrak yang sama dengan retentionWindowSchema", () => {
    expect(scheduleDisposalSchema).toBe(retentionWindowSchema);
  });
});

describe("approveDisposalSchema", () => {
  it("menerima id minimal 8 karakter dan keputusan yang valid", () => {
    expect(
      approveDisposalSchema.safeParse({ disposalId: "abc12345", decision: "approve" })
        .success,
    ).toBe(true);
    expect(
      approveDisposalSchema.safeParse({ disposalId: "abc12345", decision: "reject" })
        .success,
    ).toBe(true);
  });

  it("menolak id pendek dan keputusan di luar enum", () => {
    expect(
      approveDisposalSchema.safeParse({ disposalId: "abc1234", decision: "approve" })
        .success,
    ).toBe(false);
    expect(
      approveDisposalSchema.safeParse({ disposalId: "abc12345", decision: "maybe" })
        .success,
    ).toBe(false);
  });

  it("tidak menerima identitas approver dari payload client", () => {
    const result = approveDisposalSchema.safeParse({
      disposalId: "abc12345",
      decision: "approve",
      approvedBy: "admin-1",
    });

    expect(result.success).toBe(true);
    expect(result.success && "approvedBy" in result.data).toBe(false);
  });
});

describe("completeDisposalSchema", () => {
  it("menerima outcome opsional yang tidak terlalu panjang", () => {
    expect(
      completeDisposalSchema.safeParse({ disposalId: "abc12345" }).success,
    ).toBe(true);
    expect(
      completeDisposalSchema.safeParse({
        disposalId: "abc12345",
        outcome: "a".repeat(240),
      }).success,
    ).toBe(true);
    expect(
      completeDisposalSchema.safeParse({
        disposalId: "abc12345",
        outcome: "a".repeat(241),
      }).success,
    ).toBe(false);
  });
});

describe("runSweepSchema", () => {
  it("mengisi maxItems dengan default", () => {
    expect(runSweepSchema.parse({})).toEqual({ maxItems: 10 });
  });

  it("membatasi maxItems pada 1..50", () => {
    expect(runSweepSchema.safeParse({ maxItems: 1 }).success).toBe(true);
    expect(runSweepSchema.safeParse({ maxItems: 50 }).success).toBe(true);
    expect(runSweepSchema.safeParse({ maxItems: 0 }).success).toBe(false);
    expect(runSweepSchema.safeParse({ maxItems: 51 }).success).toBe(false);
  });
});

describe("logQuerySchema", () => {
  it("mengisi default pagination", () => {
    expect(logQuerySchema.parse({})).toMatchObject({ page: 1, pageSize: 25 });
  });

  it("membatasi pageSize minimal 10", () => {
    expect(logQuerySchema.safeParse({ pageSize: 10 }).success).toBe(true);
    expect(logQuerySchema.safeParse({ pageSize: 9 }).success).toBe(false);
    expect(logQuerySchema.safeParse({ pageSize: 101 }).success).toBe(false);
  });

  it("menolak rentang waktu yang bukan ISO datetime", () => {
    expect(logQuerySchema.safeParse({ from: "2026-01-01" }).success).toBe(false);
    expect(
      logQuerySchema.safeParse({ from: "2026-01-01T00:00:00.000Z" }).success,
    ).toBe(true);
  });

  it("menolak enum di luar daftar", () => {
    expect(logQuerySchema.safeParse({ severity: "fatal" }).success).toBe(false);
    expect(logQuerySchema.safeParse({ result: "partial" }).success).toBe(false);
    expect(logQuerySchema.safeParse({ category: "pii" }).success).toBe(false);
  });
});
