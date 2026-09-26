import { NextResponse } from "next/server";
import type { NextFetchEvent, NextRequest } from "next/server";

import pkg from "../package.json";
import {
  METRIC_NAMES,
  METRIC_UNITS,
  OTEL_ATTRIBUTE_KEYS,
} from "@/features/observability/lib/constants";
import {
  normalizeMethod,
  normalizeRoute,
} from "@/features/observability/lib/normalize-route";
import { serverEnv } from "@/lib/env";
import { formatTraceparent, resolveTraceContext } from "@/lib/trace-context";

/**
 * Golden signals HTTP lewat Proxy (Next.js 16: `middleware.ts` sudah
 * deprecated dan digantikan `proxy.ts`).
 *
 * Batasan jujur dari file ini:
 * - ini **bridge metrik minimal**, bukan distributed tracing. Tidak ada span,
 *   tidak ada parent/child, tidak ada exporter; yang ada hanya correlation id
 *   pada header response.
 * - `http.server.request.duration` mengukur durasi penanganan di dalam Proxy,
 *   **bukan** latency yang dilihat pengguna. Proxy mengembalikan
 *   `NextResponse.next()` sebelum React merender, sehingga angka ini selalu
 *   lebih kecil daripada total request time. Jangan dipakai sebagai SLO
 *   end-to-end.
 * - status yang terlihat Proxy adalah status respons yang ia hasilkan sendiri.
 *   Untuk request yang diteruskan (`NextResponse.next()`) statusnya 200 aunque
 *   render berikutnya gagal; `http.server.error.count` karena itu hanya
 *   menangkap error yang terjadi di lapisan Proxy. Error render harus
 *   dicatat lewat `onRequestError` atau `error.tsx`.
 * - semua state in-memory dan per-instance. Pada deployment multi-instance
 *   (serverless, replika, container) angka `http.server.active.requests` dan
 *   agregasi apa pun akan salah karena tidak ada state bersama. Angka dipakai
 *   sebagai sinyal kasar single-instance, bukan angka final.
 *
 * Yang dijaga di sini:
 * - hanya membaca header; body request tidak pernah dibaca dan body response
 *   tidak pernah diubah;
 * - aset statis (`_next/*`, favicon, sitemap/robots, file aset) dilewati di
 *   `config.matcher` **dan** dicek ulang di dalam fungsi, karena `matcher`
 *   bisa ikut berubah di kemudian hari;
 * - `trackMetric` (modul `server-only`) dimuat lewat dynamic import supaya
 *   modul Proxy tidak menarik dependensi server-only saat build.
 */

const SERVICE_NAME = pkg.name;

/** Batas bawah status yang dianggap error server. */
const SERVER_ERROR_STATUS = 500;

const TRACEPARENT_HEADER = "traceparent";
const REQUEST_ID_HEADER = "x-request-id";

/**
 * Aset statis yang tidak perlu diinstrumentasi. Dicek ulang di dalam fungsi
 * sebagai pengaman, tidak hanya lewat `matcher`.
 */
const STATIC_ASSET_PATTERN =
  /\.(?:png|jpe?g|gif|svg|webp|avif|ico|bmp|woff2?|ttf|otf|eot|css|js|mjs|map|webmanifest|txt|xml)$/i;

const STATIC_PATH_PREFIXES = [
  "/_next/",
  "/favicon.ico",
  "/robots.txt",
  "/sitemap.xml",
];

function isStaticAssetPath(pathname: string): boolean {
  if (STATIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }

  return STATIC_ASSET_PATTERN.test(pathname);
}

/** Milidet -> detik dengan 4 desimal; satuan durasi OTel adalah detik. */
function toSeconds(milliseconds: number): number {
  return Math.round((milliseconds / 1_000) * 10_000) / 10_000;
}

type SignalInput = {
  startedAt: number;
  method: string;
  route: string;
  statusCode: number;
  traceOrigin: "upstream" | "local";
};

async function recordHttpSignals(input: SignalInput): Promise<void> {
  const tags: Record<string, string> = {
    [OTEL_ATTRIBUTE_KEYS.METHOD]: input.method,
    [OTEL_ATTRIBUTE_KEYS.ROUTE]: input.route,
    [OTEL_ATTRIBUTE_KEYS.STATUS_CODE]: String(input.statusCode),
    [OTEL_ATTRIBUTE_KEYS.SERVICE_NAME]: SERVICE_NAME,
    [OTEL_ATTRIBUTE_KEYS.DEPLOYMENT_ENVIRONMENT]: serverEnv.NODE_ENV,
    // Cardinality rendah (dua nilai): membedakan trace yang diteruskan
    // upstream dari trace yang dimulai di aplikasi ini.
    "trace.origin": input.traceOrigin,
  };

  try {
    // Dimuat dinamis: `track.ts` memakai `import "server-only"` dan menarik
    // chain store/UEBA yang tidak boleh masuk bundel Proxy.
    const { trackMetric } = await import("@/features/observability/lib/track");

    trackMetric({
      name: METRIC_NAMES.HTTP_SERVER_ACTIVE_REQUESTS,
      kind: "gauge",
      value: 1,
      unit: METRIC_UNITS[METRIC_NAMES.HTTP_SERVER_ACTIVE_REQUESTS],
      tags,
    });

    trackMetric({
      name: METRIC_NAMES.HTTP_SERVER_REQUEST_DURATION,
      kind: "histogram",
      value: toSeconds(performance.now() - input.startedAt),
      unit: METRIC_UNITS[METRIC_NAMES.HTTP_SERVER_REQUEST_DURATION],
      tags,
    });

    trackMetric({
      name: METRIC_NAMES.HTTP_SERVER_REQUEST_COUNT,
      kind: "counter",
      value: 1,
      unit: METRIC_UNITS[METRIC_NAMES.HTTP_SERVER_REQUEST_COUNT],
      tags,
    });

    if (input.statusCode >= SERVER_ERROR_STATUS) {
      trackMetric({
        name: METRIC_NAMES.HTTP_SERVER_ERROR_COUNT,
        kind: "counter",
        value: 1,
        unit: METRIC_UNITS[METRIC_NAMES.HTTP_SERVER_ERROR_COUNT],
        tags,
      });
    }
  } catch {
    // Metrik tidak boleh mengubah hasil request.
  } finally {
    // Gauge request aktif harus selalu turun kembali, termasuk saat recording
    // gagal di tengah jalan. Import diulang agar blok ini tetap jalan walau
    // import sebelumnya gagal.
    try {
      const { trackMetric } = await import(
        "@/features/observability/lib/track"
      );

      trackMetric({
        name: METRIC_NAMES.HTTP_SERVER_ACTIVE_REQUESTS,
        kind: "gauge",
        value: -1,
        unit: METRIC_UNITS[METRIC_NAMES.HTTP_SERVER_ACTIVE_REQUESTS],
        tags,
      });
    } catch {
      // Tidak ada lagi yang bisa dilakukan tanpa menggagalkan request.
    }
  }
}

export async function proxy(
  request: NextRequest,
  event?: NextFetchEvent,
): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;
  const { context, isNew } = resolveTraceContext(
    request.headers.get(TRACEPARENT_HEADER),
  );
  const requestId = crypto.randomUUID();
  const startedAt = performance.now();

  if (!isStaticAssetPath(pathname)) {
    const response = NextResponse.next();

    response.headers.set(REQUEST_ID_HEADER, requestId);
    response.headers.set(TRACEPARENT_HEADER, formatTraceparent(context));

    const task = recordHttpSignals({
      startedAt,
      method: normalizeMethod(request.method),
      route: normalizeRoute(pathname),
      statusCode: response.status,
      traceOrigin: isNew ? "local" : "upstream",
    });

    // `waitUntil` membiarkan pencatatan selesai setelah response terkirim.
    // `event` tidak selalu ada (mis. saat Proxy diuji langsung), sehingga
    // jalur tanpa `event` tetap aman: task tidak pernah menolak.
    if (event && typeof event.waitUntil === "function") {
      event.waitUntil(task);
    } else {
      void task;
    }

    return response;
  }

  const response = NextResponse.next();

  response.headers.set(REQUEST_ID_HEADER, requestId);
  response.headers.set(TRACEPARENT_HEADER, formatTraceparent(context));

  return response;
}

export const config = {
  /**
   * Positive matching dengan negative lookahead: semua path kecuali aset
   * statis. Nilainya harus literal supaya Next.js bisa menganalisisnya saat
   * build, dan route handler (`/api/*`) sengaja ikut terukur sebagai
   * request traffic.
   */
  matcher: [
    "/((?!_next/static|_next/image|_next/webpack-hmr|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|svg|webp|avif|ico|bmp|woff2?|ttf|otf|eot|css|js|mjs|map|webmanifest|txt|xml)$).*)",
  ],
};
