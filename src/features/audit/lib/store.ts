import "server-only";

import { computeEntryHash } from "@/features/audit/lib/integrity";
import type { AuditEvent } from "@/features/audit/schema";
import type { AuditQuery } from "@/features/audit/schema";

/**
 * Store audit in-memory dengan hash chain. Ditempel di `globalThis` supaya tidak
 * ter-reset saat modul dievaluasi ulang (HMR/dev, segment baru saat build).
 *
 * Batas: 5000 entry. Saat backend siap, pindahkan ke tabel `audit_events`
 * dengan kolom `hash`/`previous_hash` dan index `(timestamp, category, actor_id)`.
 */

const MAX_ENTRIES = 5_000;
const STORE_KEY = Symbol.for("template.audit.store");

type AuditStore = {
  entries: AuditEvent[];
  /** Hash terakhir; sumber `previousHash` untuk entry berikutnya. */
  head: string | null;
  /** Dipakai untuk mengestimasi penggunaan storage. */
  droppedEntries: number;
};

type GlobalWithStore = typeof globalThis & { [STORE_KEY]?: AuditStore };

function getStore(): AuditStore {
  const globalStore = globalThis as GlobalWithStore;
  const existing = globalStore[STORE_KEY];

  if (existing) {
    return existing;
  }

  const created: AuditStore = { entries: [], head: null, droppedEntries: 0 };

  globalStore[STORE_KEY] = created;

  return created;
}

export function appendAuditEvent(event: Omit<AuditEvent, "hash" | "previousHash">): AuditEvent {
  const store = getStore();
  const previousHash = store.head;
  const entry: AuditEvent = {
    ...event,
    previousHash,
    hash: computeEntryHash(event, previousHash),
  };

  store.entries.push(entry);
  store.head = entry.hash;

  if (store.entries.length > MAX_ENTRIES) {
    const overflow = store.entries.length - MAX_ENTRIES;

    store.entries.splice(0, overflow);
    // Entry pertama yang tersisa masih memegang `previousHash` milik entry yang
    // sudah di-drop. Rantai tidak bisa diverifikasi sebagai genesis; pemanggil
    // harus mengoper `{ fromHash: resolveChainOffset(entries) }` ke verifyChain.
    store.droppedEntries += overflow;
  }

  return entry;
}

function matchesQuery(event: AuditEvent, query: AuditQuery): boolean {
  if (query.category && event.category !== query.category) {
    return false;
  }

  if (query.severity && event.severity !== query.severity) {
    return false;
  }

  if (query.result && event.result !== query.result) {
    return false;
  }

  if (query.action && !event.action.includes(query.action)) {
    return false;
  }

  if (query.actorId && event.actor?.id !== query.actorId) {
    return false;
  }

  if (query.from && event.timestamp < query.from) {
    return false;
  }

  if (query.to && event.timestamp > query.to) {
    return false;
  }

  return true;
}

/**
 * Snapshot baca, bukan array internal store.
 *
 * Salinan dangkal dengan sengaja: `splice`/`sort`/`reverse` pada hasil baca
 * tidak boleh menghapus atau mengurutkan ulang entry di luar jalur append,
 * karena `head` (sumber `previousHash`) tidak ikut berubah dan hash chain
 * jadi tidak bisa diverifikasi. Objek entry tidak di-clone: `metadata` sudah
 * dibatasi schema dan `logAudit()` sudah meredaksi, jadi deep clone hanya
 * menambah biaya pada buffer 5000 entry tanpa menambah jaminan apa pun.
 */
export function getAuditEntries(): AuditEvent[] {
  return [...getStore().entries];
}

export function queryAuditStore(query: AuditQuery): {
  items: AuditEvent[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
} {
  const filtered = getStore().entries.filter((event) => matchesQuery(event, query));
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
  const page = Math.min(query.page, totalPages);
  const start = (page - 1) * query.pageSize;
  // Urutkan seluruh result set ke newest-first SEBELUM memotong halaman.
  // Meng-reverse sesudah slice membuat halaman 1 memuat entry tertua, dan
  // halaman berikutnya memuat entry terbaru.
  const newestFirst = [...filtered].reverse();

  return {
    items: newestFirst.slice(start, start + query.pageSize),
    total,
    page,
    pageSize: query.pageSize,
    totalPages,
  };
}

export function getAuditStoreStats(): {
  totalEntries: number;
  droppedEntries: number;
  head: string | null;
  /** Estimasi ukuran in-memory dalam KB (JSON entry, bukan sizeof objek). */
  approximateSizeKB: number;
  maxEntries: number;
} {
  const store = getStore();
  const approximateSizeKB =
    Math.round(
      (store.entries.reduce(
        (sum, entry) => sum + JSON.stringify(entry).length,
        0,
      ) /
        1024) *
        10,
    ) / 10;

  return {
    totalEntries: store.entries.length,
    droppedEntries: store.droppedEntries,
    head: store.head,
    approximateSizeKB,
    maxEntries: MAX_ENTRIES,
  };
}

export function resetAuditStore(): void {
  const store = getStore();

  store.entries = [];
  store.head = null;
  store.droppedEntries = 0;
}
