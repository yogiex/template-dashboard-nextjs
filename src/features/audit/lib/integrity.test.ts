import { describe, expect, it } from "vitest";

import {
  buildIntegrityReport,
  computeEntryHash,
  resolveChainOffset,
  verifyChain,
} from "@/features/audit/lib/integrity";
import type { AuditEvent } from "@/features/audit/schema";

let sequence = 0;

function makeEvent(
  overrides: Partial<Omit<AuditEvent, "hash" | "previousHash">> = {},
): Omit<AuditEvent, "hash" | "previousHash"> {
  sequence += 1;

  return {
    id: `audit-${sequence}`,
    timestamp: new Date(1_800_000_000_000 + sequence * 1_000).toISOString(),
    action: "auth.login.success",
    category: "auth",
    severity: "info",
    result: "success",
    source: "auth/actions",
    ...overrides,
  };
}

function buildChain(
  events: Array<Omit<AuditEvent, "hash" | "previousHash">>,
): AuditEvent[] {
  let previousHash: string | null = null;
  const chain: AuditEvent[] = [];

  for (const event of events) {
    const entry: AuditEvent = {
      ...event,
      previousHash,
      hash: computeEntryHash(event, previousHash),
    };

    chain.push(entry);
    previousHash = entry.hash;
  }

  return chain;
}

describe("computeEntryHash", () => {
  it("menghasilkan hash hex 64 karakter yang stabil untuk input sama", () => {
    const event = makeEvent();

    const first = computeEntryHash(event, null);
    const second = computeEntryHash(event, null);

    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(second).toBe(first);
  });

  it("mengubah hash saat previousHash berbeda walau isi event sama", () => {
    const event = makeEvent();

    expect(computeEntryHash(event, null)).not.toBe(computeEntryHash(event, "a".repeat(64)));
  });

  it("mengubah hash saat field yang dihitung berubah", () => {
    const base = makeEvent();
    const baseline = computeEntryHash(base, null);

    expect(computeEntryHash({ ...base, action: "auth.login.failure" }, null)).not.toBe(
      baseline,
    );
    expect(computeEntryHash({ ...base, id: "audit-99" }, null)).not.toBe(baseline);
    expect(computeEntryHash({ ...base, result: "failure" }, null)).not.toBe(baseline);
  });

  it("tidak memasukkan field yang tidak ikut dihitung ke dalam hash", () => {
    const base = makeEvent();
    const withHost: AuditEvent = {
      ...base,
      host: "app.internal",
      userAgent: "Mozilla/5.0",
      previousHash: null,
      hash: "",
    };
    const withoutHost: AuditEvent = { ...withHost, host: undefined, userAgent: undefined };

    expect(computeEntryHash(withHost, null)).toBe(computeEntryHash(withoutHost, null));
  });

  it("memasukkan metadata yang sudah diredaksi ke dalam hash", () => {
    const base = makeEvent();

    expect(computeEntryHash({ ...base, metadata: { attempt: 2 } }, null)).not.toBe(
      computeEntryHash(base, null),
    );
  });

  it("membedakan resource berdasarkan tipe dan id", () => {
    const base = makeEvent();

    const asUser = computeEntryHash({ ...base, resource: { type: "user", id: "x" } }, null);
    const asRole = computeEntryHash({ ...base, resource: { type: "role", id: "x" } }, null);

    expect(asUser).not.toBe(asRole);
  });
});

describe("verifyChain", () => {
  it("melaporkan -1 untuk rantai kosong dan rantai yang utuh", () => {
    const chain = buildChain([makeEvent(), makeEvent(), makeEvent()]);

    expect(verifyChain([])).toBe(-1);
    expect(verifyChain(chain)).toBe(-1);
  });

  it("mendeteksi entry yang dimodifikasi lewat perubahan isi", () => {
    const chain = buildChain([makeEvent(), makeEvent(), makeEvent()]);
    const tampered: AuditEvent = { ...chain[1], action: "roles.delete" };

    expect(verifyChain([chain[0], tampered, chain[2]])).toBe(1);
  });

  it("mendeteksi hash yang ditulis ulang agar cocok dengan isi baru", () => {
    const chain = buildChain([makeEvent(), makeEvent()]);
    const rewritten: AuditEvent = {
      ...chain[0],
      result: "failure",
      hash: computeEntryHash({ ...chain[0], result: "failure" }, null),
    };

    expect(verifyChain(chain)).toBe(-1);
    expect(verifyChain([rewritten, chain[1]])).toBe(1);
  });

  it("mendeteksi previousHash yang tidak sesuai urutan", () => {
    const chain = buildChain([makeEvent(), makeEvent(), makeEvent()]);
    const detached: AuditEvent = { ...chain[2], previousHash: null };

    expect(verifyChain([chain[0], chain[1], detached])).toBe(2);
  });

  it("melaporkan indeks saat ada blok entry yang hilang dari rantai", () => {
    const chain = buildChain([makeEvent(), makeEvent(), makeEvent()]);

    expect(verifyChain([chain[0], chain[2]])).toBe(1);
  });

  it("berhenti di indeks pertama yang rusak dan tidak melapor lagi", () => {
    const chain = buildChain([makeEvent(), makeEvent(), makeEvent(), makeEvent()]);
    const tampered: AuditEvent[] = chain.map((entry) => ({ ...entry }));
    tampered[1] = { ...tampered[1], severity: "critical" };
    tampered[3] = { ...tampered[3], result: "error" };

    expect(verifyChain(tampered)).toBe(1);
  });

  it("menolak rantai yang dimulai dari tengah karena previousHash tidak cocok", () => {
    const chain = buildChain([makeEvent(), makeEvent(), makeEvent()]);

    expect(verifyChain(chain.slice(1))).toBe(0);
  });
});

describe("buildIntegrityReport", () => {
  it("melaporkan rantai utuh dengan jumlah dan hash terakhir", () => {
    const chain = buildChain([makeEvent(), makeEvent()]);
    const report = buildIntegrityReport(chain);

    expect(report.brokenAtIndex).toBe(-1);
    expect(report.checkedEntries).toBe(2);
    expect(report.lastHash).toBe(chain[1]?.hash);
    expect(new Date(report.verifiedAt).toISOString()).toBe(report.verifiedAt);
  });

  it("melaporkan lastHash null untuk store kosong", () => {
    expect(buildIntegrityReport([])).toMatchObject({
      brokenAtIndex: -1,
      checkedEntries: 0,
      lastHash: null,
    });
  });

  it("melaporkan indeks rusak saat entry dimanipulasi", () => {
    const chain = buildChain([makeEvent(), makeEvent(), makeEvent()]);
    const tampered: AuditEvent[] = [chain[0], { ...chain[1], source: "attacker" }, chain[2]];
    const report = buildIntegrityReport(tampered);

    expect(report.brokenAtIndex).toBe(1);
    expect(report.checkedEntries).toBe(3);
    expect(report.lastHash).toBe(chain[2]?.hash);
  });
});

describe("verifyChain dengan offset rantai", () => {
  it("melaporkan rantai utuh sebagai genesis bila previousHash null", () => {
    const chain = buildChain([makeEvent(), makeEvent()]);

    expect(resolveChainOffset(chain)).toBeNull();
    expect(verifyChain(chain, { fromHash: null })).toBe(-1);
  });

  it("menyatakan tidak valid saat rantai dimulai di tengah tanpa offset", () => {
    const chain = buildChain([makeEvent(), makeEvent(), makeEvent()]);
    const truncated = chain.slice(1);

    expect(resolveChainOffset(truncated)).toBe(chain[0].hash);
    expect(verifyChain(truncated)).toBe(0);
    expect(verifyChain(truncated, { fromHash: resolveChainOffset(truncated) })).toBe(
      -1,
    );
  });

  it("mendeteksi manipulasi pada entry setelah offset", () => {
    const chain = buildChain([
      makeEvent(),
      makeEvent(),
      makeEvent(),
      makeEvent(),
    ]);
    const truncated = chain.slice(1);
    const tampered = [...truncated];

    tampered[1] = { ...tampered[1], action: "auth.login.tampered" };

    expect(
      verifyChain(tampered, { fromHash: resolveChainOffset(tampered) }),
    ).toBe(1);
  });

  it("menolak offset yang salah", () => {
    const chain = buildChain([makeEvent(), makeEvent()]);
    const truncated = chain.slice(1);

    expect(verifyChain(truncated, { fromHash: "a".repeat(64) })).toBe(0);
  });

  it("memvalidasi buffer kosong tanpa fromHash", () => {
    expect(verifyChain([])).toBe(-1);
    expect(verifyChain([], { fromHash: "b".repeat(64) })).toBe(-1);
  });
});

describe("buildIntegrityReport menandai rantai parsial", () => {
  it("isPartial false dan chainOffset null untuk rantai sejak genesis", () => {
    const report = buildIntegrityReport(buildChain([makeEvent(), makeEvent()]));

    expect(report).toMatchObject({
      brokenAtIndex: -1,
      checkedEntries: 2,
      isPartial: false,
      chainOffset: null,
    });
  });

  it("isPartial true dan chainOffset terisi setelah ada entry yang dibuang", () => {
    const chain = buildChain([makeEvent(), makeEvent(), makeEvent()]);
    const report = buildIntegrityReport(chain.slice(1));

    expect(report).toMatchObject({
      brokenAtIndex: -1,
      checkedEntries: 2,
      isPartial: true,
      chainOffset: chain[0].hash,
    });
  });

  it("tetap melaporkan indeks saat rantai parsial dimanipulasi", () => {
    const chain = buildChain([makeEvent(), makeEvent(), makeEvent()]);
    const tampered = chain.slice(1);

    tampered[0] = { ...tampered[0], result: "failure" };

    expect(buildIntegrityReport(tampered).brokenAtIndex).toBe(0);
  });
});
