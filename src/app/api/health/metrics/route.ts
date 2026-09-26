import { METRIC_NAMES } from "@/features/observability/lib/constants";
import {
  getCounters,
  getHistogram,
  getTotalEvents,
} from "@/features/observability/lib/store";
import {
  APP_ENVIRONMENT,
  APP_VERSION,
  collectInvariantChecks,
  getUptimeSeconds,
  hasFailingCheck,
  isMetricsEnabled,
  renderPrometheusMetrics,
  textNoStore,
} from "@/lib/health";

/**
 * Metrik dalam format teks Prometheus (`text/plain; version=0.0.4`).
 *
 * MATI secara default. Endpoint ini hanya dilayani bila
 * `HEALTH_METRICS_ENABLED=true` (lihat `src/lib/env.ts` dan `.env.example`);
 * selain itu jawabannya 404. Alasannya: isinya adalah metadata proses dan
 * data internal aplikasi yang tidak perlu terekspos pada template yang belum
 * punya backend. Jangan mengubah default ke `true`.
 *
 * AKSES PUBLIK tanpa auth saat aktif: Prometheus melakukan scrape dari luar
 * aplikasi, jadi probe tidak boleh bergantung pada session. Yang dijaga adalah
 * isi response, bukan otentikasi. Tidak ada label yang memuat nilai
 * environment, email, IP, path file, atau ID bertipe PII; hanya nama metrik dan
 * angka agregat.
 *
 * Format teksnya dibuat oleh `renderPrometheusMetrics()` di `src/lib/health.ts`
 * (fungsi murni). Route ini hanya mengumpulkan data.
 *
 * TODO(nextjs-dashboard):
 * - Ganti sumber data di sini dengan exporter OpenTelemetry/Prometheus asli
 *   ketika backend tersedia. `src/features/observability/lib/store.ts` menyimpan
 *   counter dan histogram di memori dengan batas keras (5000 event), jadi
 *   semua angka pada endpoint ini hilang setiap restart.
 * - Belum ada counter untuk request HTTP, durasi render, atau cache hit/miss;
 *   ARCHITECTURE §12.2 masih menyebutkannya sebagai kebutuhan, belum ada.
 * - Label `instance`/`job` tidak ditambahkan; biarkan scraper yang menambahnya.
 * - Endpoint ini bukan alerting. Aturan alert dan dashboard Prometheus berada
 *   di luar repo ini.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

const PROMETHEUS_CONTENT_TYPE = "text/plain; version=0.0.4; charset=utf-8";

export async function GET(): Promise<Response> {
  if (!isMetricsEnabled()) {
    return textNoStore("metrics disabled\n", {
      status: 404,
      contentType: PROMETHEUS_CONTENT_TYPE,
    });
  }

  const body = renderPrometheusMetrics({
    version: APP_VERSION,
    environment: APP_ENVIRONMENT,
    uptimeSeconds: getUptimeSeconds(),
    degraded: hasFailingCheck(collectInvariantChecks()),
    totalEvents: getTotalEvents(),
    counters: getCounters(),
    latencySamples: getHistogram(METRIC_NAMES.SERVER_ACTION_LATENCY),
  });

  return textNoStore(body, { contentType: PROMETHEUS_CONTENT_TYPE });
}
