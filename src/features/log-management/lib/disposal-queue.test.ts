import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  appendAuditEvent,
  getAuditEntries,
  getAuditStoreStats,
  resetAuditStore,
} from "@/features/audit/lib/store";
import type { AuditEvent } from "@/features/audit/schema";
import {
  approveDisposal,
  getDisposalQueue,
  resetDisposalQueue,
  runDisposalSweep,
  scheduleDisposal,
} from "@/features/log-management/lib/disposal-queue";

const ACTOR = { id: "usr_admin", role: "admin" };
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 5_000;
const STORE_KEY = Symbol.for("template.audit.store");

/** Jendela retensi 1 hari; sweep dijalankan 2 hari ke depan agar eligible. */
const WINDOW = { category: "log", retentionDays: 1, gracePeriodHours: 0 } as const;

function sweepTime(): number {
  return Date.now() + 2 * DAY_MS;
}

function scheduleApproved(): string {
  const item = scheduleDisposal(WINDOW, ACTOR);

  approveDisposal(item.id, "approve", ACTOR);

  return item.id;
}

/** Mengisi audit store melewati `MAX_ENTRIES`; append lewat API publik. */
function fillAuditStore(count: number): void {
  const base = Date.now();

  for (let index = 0; index < count; index += 1) {
    appendAuditEvent({
      id: `seed-${index}`,
      timestamp: new Date(base + index).toISOString(),
      action: "log.segment.written",
      category: "log",
      severity: "info",
      result: "success",
      source: "log-management",
    });
  }
}

/**
 * Membaca array internal store untuk mensimulasikan modifikasi memori di luar
 * app. Tidak ada API publik untuk itu — dan memang tidak boleh ada; `logAudit()`
 * adalah satu-satunya pintu tulis. `getAuditEntries()` tidak bisa dipakai karena
 * sekarang mengembalikan salinan (dan memutasinya tidak boleh merusak store).
 */
function readInternalEntries(): AuditEvent[] {
  const holder = globalThis as unknown as Record<symbol, { entries: AuditEvent[] } | undefined>;
  const store = holder[STORE_KEY];

  if (!store) {
    throw new Error("Audit store global belum diinisialisasi.");
  }

  return store.entries;
}

beforeEach(() => {
  resetDisposalQueue();
  resetAuditStore();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("runDisposalSweep di luar production", () => {
  it("memproses item yang sudah disetujui saat rantai utuh dan store di bawah batas", () => {
    const disposalId = scheduleApproved();
    const entriesBeforeSweep = getAuditEntries().length;

    // Sweep hanya jadi noop di production; di sini kita pastikan cabang yang
    // diuji memang bukan early return itu.
    expect(process.env.NODE_ENV).not.toBe("production");

    const result = runDisposalSweep(sweepTime());

    expect(result.skippedReason).toBeNull();
    expect(result.chainBrokenAtIndex).toBe(-1);
    expect(result.entriesChecked).toBe(entriesBeforeSweep);
    expect(result.eligible.map((item) => item.id)).toEqual([disposalId]);
    expect(result.processed.map((item) => item.id)).toEqual([disposalId]);
    expect(result.processed[0]?.status).toBe("completed");
    expect(result.skipped).toEqual([]);
  });

  it("melewati item yang belum disetujui dengan reason not_approved", () => {
    const item = scheduleDisposal(WINDOW, ACTOR);

    const result = runDisposalSweep(sweepTime());

    expect(result.chainBrokenAtIndex).toBe(-1);
    expect(result.processed).toEqual([]);
    expect(result.skipped).toEqual([{ id: item.id, reason: "not_approved" }]);
  });

  it("tetap memproses disposal ketika consumer mengurutkan ulang array hasil baca", () => {
    const disposalId = scheduleApproved();

    getAuditEntries().reverse();
    getAuditEntries().sort((left, right) => left.id.localeCompare(right.id));

    const result = runDisposalSweep(sweepTime());

    expect(result.chainBrokenAtIndex).toBe(-1);
    expect(result.processed.map((item) => item.id)).toEqual([disposalId]);
  });

  it("tidak memproses apa pun saat tidak ada disposal yang eligible", () => {
    scheduleDisposal(WINDOW, ACTOR);

    const result = runDisposalSweep(Date.now());

    expect(result.skippedReason).toBeNull();
    expect(result.eligible).toEqual([]);
    expect(result.processed).toEqual([]);
    expect(result.skipped).toEqual([]);
    expect(result.chainBrokenAtIndex).toBe(-1);
    expect(result.entriesChecked).toBe(0);
  });
});

describe("runDisposalSweep saat audit store overflow", () => {
  // Regresi untuk false alarm hash chain: `verifyChain()` telanjang selalu
  // mengasumsikan `entries[0]` sebagai genesis, padahal setelah 5000 entry
  // `entries[0]` masih memegang `previousHash` milik entry yang sudah di-drop.
  // Akibatnya `chainBrokenAtIndex` terjepit di 0 dan 100% disposal dilewati
  // dengan `hash_chain_broken` meski tidak ada satu pun entry yang dimodifikasi.
  it("tetap memproses item yang disetujui dan melaporkan rantai utuh setelah store melewati 5000 entry", () => {
    fillAuditStore(MAX_ENTRIES + 1);

    expect(getAuditEntries()[0]?.previousHash).not.toBeNull();
    expect(getAuditStoreStats().droppedEntries).toBeGreaterThan(0);

    const disposalId = scheduleApproved();
    const result = runDisposalSweep(sweepTime());

    expect(result.skippedReason).toBeNull();
    expect(result.chainBrokenAtIndex).toBe(-1);
    expect(result.entriesChecked).toBe(MAX_ENTRIES);
    expect(result.processed.map((item) => item.id)).toEqual([disposalId]);
    expect(result.skipped).toEqual([]);
  });
});

describe("runDisposalSweep saat rantai benar-benar rusak", () => {
  it("melewati seluruh disposal dengan reason hash_chain_broken ketika entry store dimodifikasi", () => {
    const disposalId = scheduleApproved();
    const internal = readInternalEntries();
    const target = internal[1];

    if (!target) {
      throw new Error("Entry untuk ditamper tidak tersedia.");
    }

    // Simulasi modifikasi di luar app: isi entry berubah, `hash` lama tidak
    // berlaku lagi. Entry setelahnya masih menunjuk hash lama, jadi rantai
    // terputus tepat di indeks ini.
    target.action = "log.tampered.out-of-app";

    const result = runDisposalSweep(sweepTime());

    expect(result.chainBrokenAtIndex).toBe(1);
    expect(result.processed).toEqual([]);
    expect(result.skipped).toEqual([{ id: disposalId, reason: "hash_chain_broken" }]);
    expect(
      getDisposalQueue().find((item) => item.id === disposalId)?.status,
    ).toBe("approved");
  });
});

describe("runDisposalSweep di production", () => {
  it("tidak menjalankan sweep sama sekali", () => {
    vi.stubEnv("NODE_ENV", "production");

    const disposalId = scheduleApproved();
    const result = runDisposalSweep(sweepTime());

    expect(result.skippedReason).toBe("production");
    expect(result.eligible).toEqual([]);
    expect(result.processed).toEqual([]);
    expect(result.skipped).toEqual([]);
    expect(result.chainBrokenAtIndex).toBe(-1);
    expect(result.entriesChecked).toBe(0);
    expect(
      getDisposalQueue().find((item) => item.id === disposalId)?.status,
    ).toBe("approved");
  });
});

describe("resetAuditStore", () => {
  it("mengosongkan buffer dan getAuditEntries() mengembalikan array kosong", () => {
    fillAuditStore(10);

    expect(getAuditEntries()).toHaveLength(10);
    expect(getAuditStoreStats().head).not.toBeNull();

    resetAuditStore();

    expect(getAuditEntries()).toEqual([]);
    expect(getAuditStoreStats()).toMatchObject({
      totalEntries: 0,
      droppedEntries: 0,
      head: null,
    });

    // Rantai baru mulai dari genesis, jadi sweep berikutnya tidak salah/alarm.
    const disposalId = scheduleApproved();
    const result = runDisposalSweep(sweepTime());

    expect(result.chainBrokenAtIndex).toBe(-1);
    expect(result.processed.map((item) => item.id)).toEqual([disposalId]);
  });
});
