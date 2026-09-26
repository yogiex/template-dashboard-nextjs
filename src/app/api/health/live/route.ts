import { healthBody, jsonNoStore, statusCodeFor } from "@/lib/health";

/**
 * Liveness probe: "proses ini masih hidup dan bisa menjawab HTTP?".
 *
 * PUBLIK tanpa auth, sama seperti `/api/health` — orchestrator tidak membawa
 * credential. Karena itu handler ini sengaja tidak menjalankan check bisnis
 * apa pun: liveness yang gagal ber akibat check lain akan memicu restart
 * oleh platform, dan restart tidak memperbaiki konfigurasi yang salah.
 * Diagnosis konfigurasi itu milik readiness.
 *
 * Selama route ini bisa dieksekusi, proses hidup. 200 adalah jawaban yang
 * benar; 503 hanya mungkin bila render handler itu sendiri gagal.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(): Promise<Response> {
  return jsonNoStore(
    healthBody("ok", { processAlive: true }),
    { status: statusCodeFor("ok") },
  );
}

export async function HEAD(): Promise<Response> {
  return new Response(null, {
    status: statusCodeFor("ok"),
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" },
  });
}
