import {
  collectInvariantChecks,
  hasServerActionsEncryptionKey,
  healthBody,
  isProduction,
  jsonNoStore,
  statusCodeFor,
  type HealthChecks,
} from "@/lib/health";

/**
 * Readiness probe: "apakah instance ini layak menerima traffic?".
 *
 * PUBLIK tanpa auth, sama seperti `/api/health` dan `/api/health/live`.
 * Endpoint ini hanya memeriksa invarian lokal yang murah; tidak ada koneksi
 * jaringan, tidak ada database, tidak ada cache eksternal — repo ini
 * frontend-only dan tidak punya satu pun dependency tersebut.
 *
 * Satu-satunya check bersyarat adalah `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`.
 * Menurut `src/lib/env.ts` dan `docs/SETUP.md`, nilainya opsional di development
 * (agar template jalan tanpa konfigurasi) tetapi WAJIB di production
 * multi-instance, karena ID Server Action terenkripsi harus sama di semua
 * instance. Jadi di production check ini wajib lulus; di selain production
 * hanya dilaporkan sebagai informasi dan tidak menurunkan status.
 *
 * Yang dikembalikan hanya boolean. Nilai environment tidak pernah keluar dari
 * `src/lib/env.ts`.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

const REQUIRED_IN_ALL_ENVIRONMENTS = [
  "loggerAvailable",
  "appUrlValid",
  "metricStoreReachable",
] as const;

function evaluate(): { status: "ok" | "degraded"; checks: HealthChecks } {
  const checks: HealthChecks = {
    ...collectInvariantChecks(),
    serverActionsEncryptionKeyPresent: hasServerActionsEncryptionKey(),
  };

  const required: readonly string[] = isProduction()
    ? [...REQUIRED_IN_ALL_ENVIRONMENTS, "serverActionsEncryptionKeyPresent"]
    : REQUIRED_IN_ALL_ENVIRONMENTS;

  const isReady = required.every((key) => checks[key] === true);

  return { status: isReady ? "ok" : "degraded", checks };
}

export async function GET(): Promise<Response> {
  const { status, checks } = evaluate();

  return jsonNoStore(healthBody(status, checks), { status: statusCodeFor(status) });
}

/** Status yang sama dengan GET, tanpa body. */
export async function HEAD(): Promise<Response> {
  const { status } = evaluate();

  return new Response(null, {
    status: statusCodeFor(status),
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" },
  });
}
