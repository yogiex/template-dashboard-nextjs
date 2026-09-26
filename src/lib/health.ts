import "server-only";

import pkg from "../../package.json";

import { getTotalEvents } from "@/features/observability/lib/store";
import { clientEnv, isFlagEnabled, serverEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Helper bersama untuk Route Handler di `src/app/api/health/`.
 *
 * Batasan yang dijaga modul ini:
 * - tidak ada secret, path file, stack trace, atau pesan exception internal di
 *   response. Setiap check hanya boolean atau angka agregat
 *   (ARCHITECTURE §4.5, §10.4; SECURITY "Input dan output");
 * - aplikasi ini frontend-only tanpa database, cache, atau session, jadi tidak
 *   ada probe eksternal yang dipalsukan. Check hanya invarian lokal yang
 *   memang ada di repo;
 *   - versi dibaca dari `package.json` saat build, bukan string yang ditulis
 *   tangan, sehingga `/api/health` tidak pernah menyimpang dari versi asli;
 *   - `hasFailingCheck()` dipakai metrics agar status `degraded` jujur soal
 *   probe yang gagal, tanpa pernah menyebut nilai yang menyingkap rahasia.
 */

/** Versi aplikasi dari `package.json`; satu-satunya sumber untuk field `version`. */
export const APP_VERSION: string = pkg.version;

/** Environment aplikasi, bukan secret. */
export const APP_ENVIRONMENT: string = serverEnv.NODE_ENV;

/** `true` di production; dipakai untuk check yang hanya wajib di production. */
export function isProduction(): boolean {
  return serverEnv.NODE_ENV === "production";
}

/** Uptime proses dalam detik. */
export function getUptimeSeconds(): number {
  return Math.round(process.uptime() * 1000) / 1000;
}

/** Header yang wajib ada pada setiap response health. */
const NO_STORE_HEADERS: Record<string, string> = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
};

/** Body JSON dengan `Cache-Control: no-store` dan body yang tidak di-cache. */
export function jsonNoStore(
  body: unknown,
  init?: { status?: number; headers?: Record<string, string> },
): Response {
  return Response.json(body, {
    ...init,
    headers: {
      ...NO_STORE_HEADERS,
      ...init?.headers,
    },
  });
}

/** Body teks dengan `Cache-Control: no-store` (dipakai metrics). */
export function textNoStore(
  body: string,
  init: { status?: number; contentType: string },
): Response {
  return new Response(body, {
    status: init.status ?? 200,
    headers: {
      ...NO_STORE_HEADERS,
      "Content-Type": init.contentType,
    },
  });
}

/** Hasil satu probe: nama check → lulus atau tidak. */
export type HealthChecks = Record<string, boolean>;

/**
 * `degraded` bila ada check yang gagal. Status HTTP mengikuti: 200 saat `ok`,
 * 503 saat `degraded`.
 */
export function toStatus(checks: HealthChecks): "ok" | "degraded" {
  return Object.values(checks).every(Boolean) ? "ok" : "degraded";
}

export function statusCodeFor(status: "ok" | "degraded"): number {
  return status === "ok" ? 200 : 503;
}

/** `true` bila minimal satu check gagal. */
export function hasFailingCheck(checks: HealthChecks): boolean {
  return Object.values(checks).some((passed) => !passed);
}

/** Body yang dipakai `/api/health` dan `/api/health/ready`. */
export function healthBody(status: "ok" | "degraded", checks: HealthChecks): {
  status: "ok" | "degraded";
  version: string;
  uptimeSeconds: number;
  timestamp: string;
  checks: HealthChecks;
} {
  return {
    status,
    version: APP_VERSION,
    uptimeSeconds: getUptimeSeconds(),
    timestamp: new Date().toISOString(),
    checks,
  };
}

/**
 * Invarian lokal yang murah diperiksa, sesuai apa adanya aplikasi ini:
 * - `loggerAvailable`: logger pino terpasang dan punya method yang dibutuhkan;
 * - `appUrlValid`: `NEXT_PUBLIC_APP_URL` bisa diparse sebagai URL absolut;
 * - `metricStoreReachable`: store metrik in-memory bisa dibaca (dipakai untuk
 *   agregasi metrics, bukan untuk konektivitas jaringan apa pun).
 *
 * Yang TIDAK ada di sini: database, cache, queue, dan session. Repo ini
 * frontend-only dan tidak punya satu pun dependency tersebut, jadi tidak ada
 * probe eksternal yang dipalsukan hanya supaya health check terlihat lengkap.
 *
 * `serverActionsEncryptionKeyPresent` sengaja tidak ada di sini: nilainya
 * opsional pada template (lihat `src/lib/env.ts`) dan hanya wajib di deployment
 * multi-instance. Readiness yang menegakkannya ada di `/api/health/ready`.
 */
export function collectInvariantChecks(): HealthChecks {
  let appUrlValid = false;

  try {
    const parsed = new URL(clientEnv.NEXT_PUBLIC_APP_URL);

    appUrlValid = parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    appUrlValid = false;
  }

  return {
    loggerAvailable: typeof logger.info === "function" && typeof logger.error === "function",
    appUrlValid,
    metricStoreReachable: typeof getTotalEvents() === "number",
  };
}

/**
 * Keberadaan kunci enkripsi Server Action. Hanya boolean; nilai kunci tidak
 * pernah keluar dari `src/lib/env.ts` dan tidak boleh masuk response atau log.
 */
export function hasServerActionsEncryptionKey(): boolean {
  return typeof serverEnv.NEXT_SERVER_ACTIONS_ENCRYPTION_KEY === "string";
}

/** Apakah `/api/health/metrics` diaktifkan lewat env flag. */
export function isMetricsEnabled(): boolean {
  return isFlagEnabled(serverEnv.HEALTH_METRICS_ENABLED);
}

/**
 * Escape nilai label Prometheus: teks di dalam `label="..."` tidak boleh
 * mengandung `"`, `\`, atau newline. Nama metrik berasal dari allowlist
 * (`METRIC_NAMES`), tetapi escaping tetap dilakukan karena label adalah input
 * teks bebas pada format wire.
 */
export function escapeLabelValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

/** Render satu blok `# HELP` / `# TYPE` + sampel. */
export function metricFamily(options: {
  name: string;
  help: string;
  type: "counter" | "gauge";
  lines: string[];
}): string {
  return [
    `# HELP ${options.name} ${options.help}`,
    `# TYPE ${options.name} ${options.type}`,
    ...options.lines,
  ].join("\n");
}

/** Masukan render metrics; semuanya sudah dikumpulkan, fungsi ini tidak butuh I/O. */
export type PrometheusInput = {
  version: string;
  environment: string;
  uptimeSeconds: number;
  /** Hasil `hasFailingCheck()`. */
  degraded: boolean;
  /** Hasil `getTotalEvents()`. */
  totalEvents: number;
  /** Hasil `getCounters()`. */
  counters: Record<string, number>;
  /** Sampel latensi Server Action dalam ms; boleh kosong. */
  latencySamples: number[];
};

/**
 * Render format teks Prometheus.
 *
 * Fungsi murni: seluruh input sudah dikumpulkan di route handler, sehingga
 * formatting dapat diperiksa tanpa menjalankan server dan tanpa menyentuh
 * `process.env`.
 *
 * Nama event di store memakai titik (`auth.login.success`). Nilai itu ditulis
 * apa adanya sebagai label karena titik legal di dalam nilai label, sedangkan
 * nama metrik Prometheus sendiri tetap polos agar tidak bentrok dengan
 * penamaan internal aplikasi.
 */
export function renderPrometheusMetrics(input: PrometheusInput): string {
  const counterLines = Object.entries(input.counters)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, value]) => `app_events_total{name="${escapeLabelValue(name)}"} ${value}`);

  const sorted = [...input.latencySamples].sort((left, right) => left - right);
  const latencyLines: string[] = [];

  if (sorted.length > 0) {
    const quantileAt = (quantile: number): number => {
      const index = Math.min(
        sorted.length - 1,
        Math.max(0, Math.ceil(quantile * sorted.length) - 1),
      );

      return sorted[index];
    };
    const total = sorted.reduce((sum, value) => sum + value, 0);

    latencyLines.push(
      ...[0.5, 0.95, 0.99].map(
        (quantile) =>
          `app_server_action_latency_ms{quantile="${quantile}"} ${quantileAt(quantile)}`,
      ),
      `app_server_action_latency_ms_sum ${total}`,
      `app_server_action_latency_ms_count ${sorted.length}`,
    );
  }

  const sections = [
    metricFamily({
      name: "app_build_info",
      help: "Build information of the running app; always 1.",
      type: "gauge",
      lines: [
        `app_build_info{version="${escapeLabelValue(input.version)}",environment="${escapeLabelValue(
          input.environment,
        )}"} 1`,
      ],
    }),
    metricFamily({
      name: "app_uptime_seconds",
      help: "Uptime of the server process in seconds.",
      type: "gauge",
      lines: [`app_uptime_seconds ${input.uptimeSeconds}`],
    }),
    metricFamily({
      name: "app_health_degraded",
      help: "1 when at least one health probe check fails, otherwise 0.",
      type: "gauge",
      lines: [`app_health_degraded ${input.degraded ? 1 : 0}`],
    }),
    metricFamily({
      name: "app_metric_store_events",
      help: "Events still held in the in-memory metric store; lost on restart.",
      type: "gauge",
      lines: [`app_metric_store_events ${input.totalEvents}`],
    }),
    metricFamily({
      name: "app_events_total",
      help: "Accumulated event count per metric name in the in-memory store.",
      type: "counter",
      lines: counterLines,
    }),
    metricFamily({
      name: "app_server_action_latency_ms",
      help: "Server Action duration distribution in milliseconds.",
      type: "gauge",
      lines: latencyLines,
    }),
  ];

  return `${sections.join("\n")}\n`;
}
