import "server-only";

import { createHash } from "node:crypto";

import type { AuditEvent } from "@/features/audit/schema";
import type { IntegrityReport } from "@/features/audit/types";

const GENESIS_HASH = "0".repeat(64);

type HashableAuditEvent = Omit<AuditEvent, "hash" | "previousHash">;

/**
 * Hash chain untuk tamper evidence (NIST SP 800-92 §4.2 TS-2.10).
 *
 * `previousHash` dan `hash` sengaja tidak ikut dihitung ulang dari objek event
 * yang sudah di-hash: hash dihitung dari bentuk data yang sudah diredaksi.
 */
export function computeEntryHash(
  event: HashableAuditEvent,
  previousHash: string | null,
): string {
  const payload = JSON.stringify({
    id: event.id,
    timestamp: event.timestamp,
    action: event.action,
    category: event.category,
    severity: event.severity,
    result: event.result,
    source: event.source,
    requestId: event.requestId ?? null,
    actorId: event.actor?.id ?? null,
    resource: event.resource ? `${event.resource.type}:${event.resource.id}` : null,
    metadata: event.metadata ?? {},
    previousHash: previousHash ?? GENESIS_HASH,
  });

  return createHash("sha256").update(payload).digest("hex");
}

export type VerifyChainOptions = {
  /**
   * `previousHash` yang diharapkan untuk `entries[0]`.
   *
   * - `null` (default): `entries[0]` dianggap genesis, yaitu `previousHash: null`.
   * - string: rantai dimulai di tengah stream. Gunakan
   *   {@link resolveChainOffset} agar nilaitaken dari store, bukan dari input
   *   yang sama persis dengan yang diverifikasi.
   */
  fromHash?: string | null;
};

/**
 * `previousHash` milik `entries[0]`, yaitu offset rantai setelah buffer
 * mengalami overflow. `null` bila `entries[0]` adalah genesis.
 */
export function resolveChainOffset(entries: AuditEvent[]): string | null {
  return entries[0]?.previousHash ?? null;
}

/**
 * Verifikasi rantai. Mengembalikan indeks pertama yang rusak, atau `-1` bila
 * valid. Hash mismatch = log kemungkinan dimodifikasi di luar app.
 *
 * Setelah buffer overflow, `entries[0]` tidak lagi punya `previousHash: null`.
 * Pemanggil wajib mengoper `{ fromHash: resolveChainOffset(entries) }`; tanpa
 * itu seluruh rantai dilaporkan rusak di indeks 0 secara permanen.
 */
export function verifyChain(
  entries: AuditEvent[],
  options: VerifyChainOptions = {},
): number {
  let previousHash: string | null = options.fromHash ?? null;

  for (const [index, entry] of entries.entries()) {
    if (entry.previousHash !== previousHash) {
      return index;
    }

    if (computeEntryHash(entry, previousHash) !== entry.hash) {
      return index;
    }

    previousHash = entry.hash;
  }

  return -1;
}

export function buildIntegrityReport(entries: AuditEvent[]): IntegrityReport {
  const chainOffset = resolveChainOffset(entries);

  return {
    brokenAtIndex: verifyChain(entries, { fromHash: chainOffset }),
    checkedEntries: entries.length,
    lastHash: entries[entries.length - 1]?.hash ?? null,
    /**
     * Rantai terputus di awal buffer: entry sebelumnya sudah di-drop karena
     * overflow, sehingga verifikasi hanya mencakup isi buffer yang tersisa.
     */
    isPartial: chainOffset !== null,
    chainOffset,
    verifiedAt: new Date().toISOString(),
  };
}
