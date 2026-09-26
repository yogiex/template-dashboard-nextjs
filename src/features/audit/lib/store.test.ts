import { beforeEach, describe, expect, it } from "vitest";

import { computeEntryHash, verifyChain } from "@/features/audit/lib/integrity";
import {
  appendAuditEvent,
  getAuditEntries,
  getAuditStoreStats,
  queryAuditStore,
  resetAuditStore,
} from "@/features/audit/lib/store";
import type { AuditEvent } from "@/features/audit/schema";

let sequence = 0;

function makeEvent(
  overrides: Partial<Omit<AuditEvent, "hash" | "previousHash">> = {},
): Omit<AuditEvent, "hash" | "previousHash"> {
  sequence += 1;

  return {
    id: `audit-${sequence}`,
    timestamp: new Date().toISOString(),
    action: "auth.login.success",
    category: "auth",
    severity: "info",
    result: "success",
    source: "auth/actions",
    ...overrides,
  };
}

beforeEach(() => {
  sequence = 0;
  resetAuditStore();
});

describe("appendAuditEvent", () => {
  it("menyimpan entry dan membacanya kembali dengan id serta timestamp utuh", () => {
    const event = appendAuditEvent(makeEvent({ action: "auth.login.failure" }));

    const entries = getAuditEntries();

    expect(entries).toHaveLength(1);
    expect(entries[0]?.id).toBe(event.id);
    expect(entries[0]?.action).toBe("auth.login.failure");
    expect(entries[0]?.hash).toBe(event.hash);
  });

  it("menandai entry pertama tanpa previousHash dan entry berikutnya menaut ke hash sebelumnya", () => {
    const first = appendAuditEvent(makeEvent());
    const second = appendAuditEvent(makeEvent());
    const third = appendAuditEvent(makeEvent());

    expect(first.previousHash).toBeNull();
    expect(second.previousHash).toBe(first.hash);
    expect(third.previousHash).toBe(second.hash);
  });

  it("menghitung hash yang sama dengan computeEntryHash untuk previousHash terkait", () => {
    const first = appendAuditEvent(makeEvent({ resource: { type: "user", id: "usr_a" } }));
    const second = appendAuditEvent(makeEvent({ resource: { type: "user", id: "usr_b" } }));

    expect(first.hash).toBe(computeEntryHash(first, null));
    expect(second.hash).toBe(computeEntryHash(second, first.hash));
  });

  it("membatasi jumlah entry pada 5000 dan membuang yang tertua", () => {
    const base = Date.now();

    for (let index = 0; index < 5_003; index += 1) {
      appendAuditEvent(
        makeEvent({ timestamp: new Date(base + index * 1_000).toISOString() }),
      );
    }

    const entries = getAuditEntries();

    expect(entries).toHaveLength(5_000);
    expect(entries[0]?.timestamp).toBe(new Date(base + 3 * 1_000).toISOString());
    expect(entries.at(-1)?.timestamp).toBe(
      new Date(base + 5_002 * 1_000).toISOString(),
    );
  });

  it("menghitung ulang jumlah entry yang dibuang saat melewati batas", () => {
    for (let index = 0; index < 5_000; index += 1) {
      appendAuditEvent(makeEvent());
    }

    expect(getAuditStoreStats().droppedEntries).toBe(0);

    appendAuditEvent(makeEvent());
    expect(getAuditStoreStats().droppedEntries).toBe(1);

    appendAuditEvent(makeEvent());
    appendAuditEvent(makeEvent());
    expect(getAuditStoreStats().droppedEntries).toBe(3);
  });

  it("menyisakan rantai yang tidak lagi terverifiable dari awal setelah ada entry yang dibuang", () => {
    for (let index = 0; index < 5_001; index += 1) {
      appendAuditEvent(makeEvent());
    }

    const entries = getAuditEntries();

    expect(entries[0]?.previousHash).not.toBeNull();
    expect(verifyChain(entries)).toBe(0);
    expect(verifyChain(entries.slice(1))).toBe(0);
    expect(verifyChain([])).toBe(-1);
  });
});

describe("queryAuditStore", () => {
  it("menyaring per kategori, severity, hasil, aksi, dan aktor dengan semantik AND", () => {
    appendAuditEvent(
      makeEvent({ category: "auth", severity: "info", result: "success", actor: { id: "usr_a" } }),
    );
    appendAuditEvent(
      makeEvent({
        action: "auth.login.failure",
        category: "auth",
        severity: "critical",
        result: "failure",
        actor: { id: "usr_b" },
      }),
    );
    appendAuditEvent(
      makeEvent({ action: "roles.update", category: "authz", result: "success" }),
    );

    const base = { page: 1, pageSize: 10 };

    expect(queryAuditStore({ ...base, category: "auth" }).total).toBe(2);
    expect(queryAuditStore({ ...base, severity: "critical" }).total).toBe(1);
    expect(queryAuditStore({ ...base, result: "failure" }).total).toBe(1);
    expect(queryAuditStore({ ...base, action: "auth.login" }).total).toBe(2);
    expect(queryAuditStore({ ...base, actorId: "usr_b" }).total).toBe(1);
    expect(
      queryAuditStore({ ...base, category: "auth", severity: "critical" }).total,
    ).toBe(1);
    expect(queryAuditStore({ ...base, category: "authz", actorId: "usr_a" }).total).toBe(0);
  });

  it("menyaring berdasarkan rentang timestamp inklusif", () => {
    const from = "2026-03-01T00:00:00.000Z";
    const to = "2026-03-02T00:00:00.000Z";

    appendAuditEvent(makeEvent({ timestamp: "2026-02-28T23:59:59.000Z" }));
    appendAuditEvent(makeEvent({ timestamp: from }));
    appendAuditEvent(makeEvent({ timestamp: to }));
    appendAuditEvent(makeEvent({ timestamp: "2026-03-02T00:00:00.001Z" }));

    const page = queryAuditStore({ page: 1, pageSize: 10, from, to });

    expect(page.total).toBe(2);
  });

  it("mengembalikan entry terbaru lebih dulu", () => {
    const first = appendAuditEvent(makeEvent());
    const second = appendAuditEvent(makeEvent());

    const page = queryAuditStore({ page: 1, pageSize: 10 });

    expect(page.items.map((item) => item.id)).toEqual([second.id, first.id]);
  });

  it("memotong halaman setelah mengurutkan seluruh hasil ke terbaru-dulu", () => {
    for (let index = 1; index <= 12; index += 1) {
      appendAuditEvent(makeEvent({ action: `auth.login.${index}` }));
    }

    const firstPage = queryAuditStore({ page: 1, pageSize: 10 });
    const secondPage = queryAuditStore({ page: 2, pageSize: 10 });

    expect(firstPage.items).toHaveLength(10);
    expect(firstPage.total).toBe(12);
    expect(firstPage.totalPages).toBe(2);
    expect(firstPage.page).toBe(1);
    expect(firstPage.items.map((item) => item.id)).toEqual([
      "audit-12",
      "audit-11",
      "audit-10",
      "audit-9",
      "audit-8",
      "audit-7",
      "audit-6",
      "audit-5",
      "audit-4",
      "audit-3",
    ]);
    expect(secondPage.items.map((item) => item.id)).toEqual(["audit-2", "audit-1"]);
    expect(secondPage.page).toBe(2);

    const beyond = queryAuditStore({ page: 9, pageSize: 10 });

    expect(beyond.page).toBe(2);
    expect(beyond.items.map((item) => item.id)).toEqual(["audit-2", "audit-1"]);
  });

  it("selalu melaporkan totalPages minimal satu saat store kosong", () => {
    const page = queryAuditStore({ page: 1, pageSize: 10 });

    expect(page).toMatchObject({ items: [], total: 0, page: 1, totalPages: 1 });
  });
});

describe("getAuditStoreStats", () => {
  it("melaporkan jumlah entry, head, dan batas maksimum", () => {
    const event = appendAuditEvent(makeEvent());

    const stats = getAuditStoreStats();

    expect(stats.totalEntries).toBe(1);
    expect(stats.droppedEntries).toBe(0);
    expect(stats.head).toBe(event.hash);
    expect(stats.maxEntries).toBe(5_000);
    expect(stats.approximateSizeKB).toBeGreaterThan(0);
  });

  it("menyusun ulang ukuran perkiraan mengikuti isi store", () => {
    const empty = getAuditStoreStats().approximateSizeKB;

    appendAuditEvent(makeEvent({ metadata: {_DATABASE_URL: "postgres://a@b/c" } }));

    expect(getAuditStoreStats().approximateSizeKB).toBeGreaterThan(empty);
  });
});

describe("resetAuditStore", () => {
  it("mengosongkan entry, head, dan jumlah entry yang dibuang", () => {
    for (let index = 0; index < 5_001; index += 1) {
      appendAuditEvent(makeEvent());
    }

    resetAuditStore();

    expect(getAuditEntries()).toHaveLength(0);
    expect(getAuditStoreStats()).toMatchObject({
      totalEntries: 0,
      droppedEntries: 0,
      head: null,
    });
  });

  it("memulai rantai baru dari nol setelah reset", () => {
    appendAuditEvent(makeEvent());
    resetAuditStore();

    const afterReset = appendAuditEvent(makeEvent());

    expect(afterReset.previousHash).toBeNull();
    expect(verifyChain(getAuditEntries())).toBe(-1);
  });
});

const STORE_KEY = Symbol.for("template.audit.store");

/**
 * Membaca array internal store lewat global yang sama dengan `getStore()`, hanya
 * untuk membuktikan `getAuditEntries()` tidak memakai referensi itu.
 */
function readInternalEntries(): AuditEvent[] {
  const holder = globalThis as unknown as Record<symbol, { entries: AuditEvent[] } | undefined>;
  const store = holder[STORE_KEY];

  if (!store) {
    throw new Error("Audit store global belum diinisialisasi.");
  }

  return store.entries;
}

describe("getAuditEntries", () => {
  it("mengembalikan salinan baru setiap dipanggil, bukan array internal store", () => {
    appendAuditEvent(makeEvent());
    appendAuditEvent(makeEvent());

    const first = getAuditEntries();
    const second = getAuditEntries();

    expect(first).not.toBe(readInternalEntries());
    expect(second).not.toBe(readInternalEntries());
    expect(first).not.toBe(second);
    expect(first).toEqual(second);
  });

  it("tidak kehilangan entry store ketika array hasil baca di-splice", () => {
    appendAuditEvent(makeEvent());
    appendAuditEvent(makeEvent());
    appendAuditEvent(makeEvent());

    getAuditEntries().splice(0, 3);

    expect(getAuditEntries()).toHaveLength(3);
    expect(getAuditEntries().map((entry) => entry.id)).toEqual([
      "audit-1",
      "audit-2",
      "audit-3",
    ]);
    expect(getAuditStoreStats().totalEntries).toBe(3);
  });

  it("tidak mengubah urutan internal store ketika array hasil baca di-sort dan di-reverse", () => {
    const base = Date.now();

    appendAuditEvent(makeEvent({ timestamp: new Date(base + 1_000).toISOString() }));
    appendAuditEvent(makeEvent({ timestamp: new Date(base + 2_000).toISOString() }));
    appendAuditEvent(makeEvent({ timestamp: new Date(base + 3_000).toISOString() }));

    const snapshot = getAuditEntries();

    snapshot.sort((left, right) => left.timestamp.localeCompare(right.timestamp));
    snapshot.reverse();

    // `queryAuditStore` adalah kontrak yang diamati consumer: newest-first.
    expect(
      queryAuditStore({ page: 1, pageSize: 10 }).items.map((item) => item.id),
    ).toEqual(["audit-3", "audit-2", "audit-1"]);
    expect(getAuditEntries().map((entry) => entry.timestamp)).toEqual([
      new Date(base + 1_000).toISOString(),
      new Date(base + 2_000).toISOString(),
      new Date(base + 3_000).toISOString(),
    ]);
    // Urutan internal utuh berarti rantai hash masih bisa diverifikasi.
    expect(verifyChain(getAuditEntries())).toBe(-1);
  });
});
