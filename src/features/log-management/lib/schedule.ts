import "server-only";

import { verifyAuditIntegrity } from "@/features/audit/service";
import type { IntegrityReport } from "@/features/audit/types";
import {
  runDisposalSweep,
  type DisposalSweepResult,
} from "@/features/log-management/lib/disposal-queue";

/**
 * Scheduler disposal + verifikasi integritas.
 *
 * Dipanggil dari halaman (Server Component) saat render. Keduanya NOOP di
 * production agar demo tidak mengubah state yang sedang dilihat pengguna.
 */

const STATE_KEY = Symbol.for("template.logmanagement.schedule");

export type IntegrityVerification = {
  /** `null` bila `verifyIntegrityWithTimestamp()` belum pernah dipanggil. */
  lastVerifiedAt: string | null;
  lastReport: IntegrityReport | null;
};

type ScheduleState = {
  integrity: IntegrityVerification;
};

type GlobalWithState = typeof globalThis & { [STATE_KEY]?: ScheduleState };

function getState(): ScheduleState {
  const globalState = globalThis as GlobalWithState;
  const existing = globalState[STATE_KEY];

  if (existing) {
    return existing;
  }

  const created: ScheduleState = {
    integrity: { lastVerifiedAt: null, lastReport: null },
  };

  globalState[STATE_KEY] = created;

  return created;
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Verifikasi rantai hash dan menyimpan waktu verifikasi terakhir di
 * `globalThis`. Mengembalikan report terbaru; `lastVerifiedAt` tetap `null`
 * bila belum pernah dipanggil.
 */
export function verifyIntegrityWithTimestamp(): IntegrityVerification {
  const state = getState();

  if (isProduction()) {
    return state.integrity;
  }

  const report = verifyAuditIntegrity();

  state.integrity = { lastVerifiedAt: report.verifiedAt, lastReport: report };

  return state.integrity;
}

/** Membaca jejak verifikasi tanpa menjalankan verifikasi baru. */
export function getLastIntegrityVerification(): IntegrityVerification {
  return getState().integrity;
}

export function runScheduledDisposalSweep(
  now = Date.now(),
  actor: { id: string; role: string } = { id: "system", role: "admin" },
  maxItems = 10,
): DisposalSweepResult {
  return runDisposalSweep(now, actor, maxItems);
}
