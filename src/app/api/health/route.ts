import {
  collectInvariantChecks,
  healthBody,
  jsonNoStore,
  statusCodeFor,
  toStatus,
} from "@/lib/health";

/**
 * Health check agregat.
 *
 * AKSES PUBLIK SECARA DESAIN. Load balancer, uptime monitor, dan platform
 * hosting melakukan polling dari luar aplikasi, jadi endpoint ini tidak boleh
 * ikut cookie session maupun halaman login. Konsekuensi yang sudah diterima:
 * response hanya berisi boolean/angka agregat (lihat `src/lib/health.ts`) dan
 * TIDAK pernah memuat secret, nilai environment, path file, pesan exception,
 * atau stack trace. Jangan menambahkan detail baru di sini tanpa review
 * `docs/SECURITY.md`.
 *
 * Tidak ada auth check di route handler karena tidak ada session di repo ini
 * (ARCHITECTURE §16). Saat session ditambahkan, probe tetap harus publik; yang
 * dijaga adalah isi response, bukan Addedya login.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

function respond(): Response {
  const checks = collectInvariantChecks();
  const status = toStatus(checks);

  return jsonNoStore(healthBody(status, checks), { status: statusCodeFor(status) });
}

export async function GET(): Promise<Response> {
  return respond();
}

/** Dipakai uptime monitor yang hanya memeriksa reachability. */
export async function HEAD(): Promise<Response> {
  const status = toStatus(collectInvariantChecks());

  return new Response(null, {
    status: statusCodeFor(status),
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" },
  });
}
