import "server-only";

import { getAuditEntries } from "@/features/audit/lib/store";
import { buildIntegrityReport } from "@/features/audit/lib/integrity";
import { AUDIT_ACTIONS } from "@/features/audit/lib/categories";
import { logAudit } from "@/features/audit/lib/log-audit";
import { AppError } from "@/lib/error";
import { getDisposalPolicy } from "@/features/log-management/lib/disposal";
import type { DisposalStatus, RetentionWindowInput } from "@/features/log-management/schema";

/**
 * Antrean disposal in-memory.
 *
 * Disimpan di `globalThis` dengan `Symbol.for(...)` supaya tidak hilang saat
 * modul dievaluasi ulang (HMR/dev, segment baru saat build). PENTING: antrian
 * ini hanya menyimpan status; tidak ada data log yang benar-benar dihapus,
 * karena audit store tidak punya API penghapusan dan tidak boleh diubah.
 */

const QUEUE_KEY = Symbol.for("template.logmanagement.disposal");
const MAX_QUEUE_ITEMS = 200;
const HOUR_MS = 60 * 60 * 1000;

export type DisposalQueueItem = {
  id: string;
  category: RetentionWindowInput["category"];
  status: DisposalStatus;
  method: ReturnType<typeof getDisposalPolicy>["method"];
  retentionDays: number;
  gracePeriodHours: number;
  scheduledAt: string;
  eligibleAt: string;
  approvedAt: string | null;
  approvedBy: string | null;
  completedAt: string | null;
  completedBy: string | null;
  note: string | null;
};

type DisposalQueue = {
  items: DisposalQueueItem[];
};

type GlobalWithQueue = typeof globalThis & { [QUEUE_KEY]?: DisposalQueue };

function getQueue(): DisposalQueue {
  const globalQueue = globalThis as GlobalWithQueue;
  const existing = globalQueue[QUEUE_KEY];

  if (existing) {
    return existing;
  }

  const created: DisposalQueue = { items: [] };
  globalQueue[QUEUE_KEY] = created;

  return created;
}

function toIso(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

/**
 * Menjadwalkan disposal untuk satu kategori. Tanggal eligible dihitung dari
 * `retentionDays` + `gracePeriodHours` yang diberikan pemanggil (hasil
 * kebijakan), lalu dicocokkan terhadap policy default kategori sebagai sanity
 * check.
 */
export function scheduleDisposal(
  input: RetentionWindowInput,
  actor: { id: string; role: string },
): DisposalQueueItem {
  const queue = getQueue();
  const policy = getDisposalPolicy(input.category);
  const now = Date.now();
  const eligibleAt =
    now + input.retentionDays * 24 * HOUR_MS + input.gracePeriodHours * HOUR_MS;

  const item: DisposalQueueItem = {
    id: `dsp_${crypto.randomUUID()}`,
    category: input.category,
    status: "scheduled",
    method: policy.method,
    retentionDays: input.retentionDays,
    gracePeriodHours: input.gracePeriodHours,
    scheduledAt: toIso(now),
    eligibleAt: toIso(eligibleAt),
    approvedAt: null,
    approvedBy: null,
    completedAt: null,
    completedBy: null,
    note: input.note ?? null,
  };

  queue.items.unshift(item);

  if (queue.items.length > MAX_QUEUE_ITEMS) {
    queue.items.length = MAX_QUEUE_ITEMS;
  }

  logAudit(
    {
      action: AUDIT_ACTIONS.LOG_DISPOSAL_SCHEDULED,
      category: "log",
      severity: "warning",
      source: "log-management",
      metadata: {
        disposalId: item.id,
        disposalCategory: item.category,
        retentionDays: item.retentionDays,
        gracePeriodHours: item.gracePeriodHours,
      },
    },
    { id: actor.id, role: actor.role },
  );

  return item;
}

/**
 * Approval. Identitas approver SELALU dari server (`actor`), bukan dari
 * payload client.
 */
export function approveDisposal(
  disposalId: string,
  decision: "approve" | "reject",
  actor: { id: string; role: string },
): DisposalQueueItem {
  const queue = getQueue();
  const item = queue.items.find((entry) => entry.id === disposalId);

  if (!item) {
    throw new AppError("NOT_FOUND", { message: "Item disposal tidak ditemukan." });
  }

  if (item.status === "completed") {
    throw new AppError("CONFLICT", { message: "Item disposal sudah selesai." });
  }

  if (item.status !== "scheduled") {
    throw new AppError("CONFLICT", { message: "Item disposal sudah diproses." });
  }

  const now = toIso(Date.now());

  item.status = decision === "approve" ? "approved" : "rejected";
  item.approvedAt = now;
  item.approvedBy = actor.id;

  logAudit(
    {
      action:
        decision === "approve"
          ? AUDIT_ACTIONS.LOG_DISPOSAL_APPROVED
          : AUDIT_ACTIONS.LOG_DISPOSAL_REJECTED,
      category: "log",
      severity: "critical",
      source: "log-management",
      metadata: { disposalId: item.id, disposalCategory: item.category },
    },
    { id: actor.id, role: actor.role },
  );

  return item;
}

export function completeDisposal(
  disposalId: string,
  outcome: string | undefined,
  actor: { id: string; role: string },
): DisposalQueueItem {
  const queue = getQueue();
  const item = queue.items.find((entry) => entry.id === disposalId);

  if (!item) {
    throw new AppError("NOT_FOUND", { message: "Item disposal tidak ditemukan." });
  }

  if (item.status !== "approved") {
    throw new AppError("CONFLICT", {
      message: "Item disposal harus disetujui sebelum ditandai selesai.",
    });
  }

  item.status = "completed";
  item.completedAt = toIso(Date.now());
  item.completedBy = actor.id;
  item.note = outcome ?? item.note;

  logAudit(
    {
      action: AUDIT_ACTIONS.LOG_DISPOSAL_COMPLETED,
      category: "log",
      severity: "critical",
      source: "log-management",
      metadata: { disposalId: item.id, disposalCategory: item.category },
    },
    { id: actor.id, role: actor.role },
  );

  return item;
}

export function getDisposalQueue(): DisposalQueueItem[] {
  return [...getQueue().items];
}

export function getPendingDisposals(now = Date.now()): DisposalQueueItem[] {
  return getQueue().items.filter((item) => {
    if (item.status === "completed" || item.status === "rejected") {
      return false;
    }

    return Date.parse(item.eligibleAt) <= now;
  });
}

export type DisposalSweepResult = {
  skippedReason: "production" | null;
  now: string;
  eligible: DisposalQueueItem[];
  processed: DisposalQueueItem[];
  skipped: Array<{ id: string; reason: "not_approved" | "hash_chain_broken" }>;
  chainBrokenAtIndex: number;
  entriesChecked: number;
};

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Sweep disposal: menandai item yang sudah melewati masa retensi + grace period.
 *
 * Noop di production. Entry yang seharusnya dibuang TIDAK dihapus dari audit
 * store: store tidak punya API penghapusan dan tidak boleh disentuh, jadi
 * sweep hanya memindahkan status antrian.
 */
export function runDisposalSweep(
  now = Date.now(),
  actor: { id: string; role: string } = { id: "system", role: "admin" },
  maxItems = 10,
): DisposalSweepResult {
  const base: DisposalSweepResult = {
    skippedReason: null,
    now: toIso(now),
    eligible: [],
    processed: [],
    skipped: [],
    chainBrokenAtIndex: -1,
    entriesChecked: 0,
  };

  if (isProduction()) {
    return { ...base, skippedReason: "production" };
  }

  const eligible = getPendingDisposals(now).slice(0, Math.max(1, maxItems));

  return {
    ...base,
    eligible,
    ...processEligible(eligible, actor),
  };
}

function processEligible(
  eligible: DisposalQueueItem[],
  actor: { id: string; role: string },
): Pick<
  DisposalSweepResult,
  "processed" | "skipped" | "chainBrokenAtIndex" | "entriesChecked"
> {
  if (eligible.length === 0) {
    return { processed: [], skipped: [], chainBrokenAtIndex: -1, entriesChecked: 0 };
  }

  // Verifikasi rantai hash sebelum disposal apa pun dijalankan (anti-penghapusan
  // tidak sah). Angka diambil dari proses nyata, bukan hardcode.
  //
  // WAJIB lewat `buildIntegrityReport()`: fungsi itu meneruskan `chainOffset`
  // sendiri ke `verifyChain()`. `verifyChain(entries)` telanjang selalu
  // mengasumsikan `entries[0]` adalah genesis (`fromHash: null`), jadi begitu
  // audit store melewati 5000 entry dan entry tergerus, rantai dilaporkan rusak
  // di indeks 0 secara permanen dan seluruh disposal dilewati dengan
  // `hash_chain_broken` tanpa ada manipulasi. `report.isPartial` sengaja belum
  // diekspos ke `DisposalSweepResult`: tidak ada consumer yang membacanya
  // (`actions.ts` hanya mengambil `processed`/`skipped`/`skippedReason`), jadi
  // menambah field itu hanya jadi beban tanpa efek. Lihat `docs/AUDIT.md`.
  const entries = getAuditEntries();
  const report = buildIntegrityReport(entries);
  const chainBrokenAtIndex = report.brokenAtIndex;
  const chainIntact = chainBrokenAtIndex === -1;

  const processed: DisposalQueueItem[] = [];
  const skipped: DisposalSweepResult["skipped"] = [];

  for (const item of eligible) {
    if (!chainIntact) {
      skipped.push({ id: item.id, reason: "hash_chain_broken" });
      continue;
    }

    if (item.status !== "approved") {
      skipped.push({ id: item.id, reason: "not_approved" });
      continue;
    }

    processed.push(completeDisposal(item.id, "Sweep otomatis oleh scheduler", actor));
  }

  return { processed, skipped, chainBrokenAtIndex, entriesChecked: entries.length };
}

export function resetDisposalQueue(): void {
  getQueue().items = [];
}
