import { randomBytes } from "node:crypto";

/**
 * Implementasi W3C Trace Context (`traceparent`) tanpa OpenTelemetry SDK.
 *
 * Keputusan sadar: tidak memasang SDK OTel karena template ini belum punya
 * collector/exporter. Yang dibuat hanya landasan konteks korelasi minimal:
 * - header masuk dari upstream (reverse proxy, load balancer, service lain)
 *   divalidasi ketat; jika tidak valid, trace baru dibuat dan request tetap
 *   berjalan normal;
 * - konteks diformat ulang ke response header supaya setiap hop punya identitas
 *   yang sama dan bisa dikorelasikan lewat log sederhana.
 *
 * Modul ini bebas dependency (hanya `node:crypto`) dan sengaja TIDAK memakai
 * `import "server-only"` supaya bisa dipakai dari Proxy, `instrumentation.ts`,
 * dan test tanpa perlu stub. Modul ini tidak pernah melempar exception:
 * input eksternal dianggap tidak dipercaya, bukan exception-worthy.
 */

export interface TraceContext {
  traceId: string;
  spanId: string;
  traceFlags: string;
  sampled: boolean;
}

const TRACE_ID_PATTERN = /^[0-9a-f]{32}$/;
const SPAN_ID_PATTERN = /^[0-9a-f]{16}$/;
const TRACE_FLAGS_PATTERN = /^0[01]$/;

/** Nilai all-zero dilarang oleh spesifikasi W3C Trace Context. */
const INVALID_TRACE_ID = "0".repeat(32);
const INVALID_SPAN_ID = "0".repeat(16);

const SUPPORTED_VERSION = "00";

/** traceId harus 32 hex lowercase. */
export function isValidTraceId(value: string): boolean {
  return TRACE_ID_PATTERN.test(value) && value !== INVALID_TRACE_ID;
}

/** spanId harus 16 hex lowercase. */
export function isValidSpanId(value: string): boolean {
  return SPAN_ID_PATTERN.test(value) && value !== INVALID_SPAN_ID;
}

/** traceFlags yang dikenali hanya `00` (tidak dicuplik) dan `01` (dicuplik). */
export function isValidTraceFlags(value: string): boolean {
  return TRACE_FLAGS_PATTERN.test(value);
}

export function generateTraceId(): string {
  let traceId = randomBytes(16).toString("hex");

  // Trace id all-zero hampir mustahil terjadi, tapi spesifikasi melarangnya;
  // putar ulang sekali supaya hasil selalu valid.
  if (traceId === INVALID_TRACE_ID) {
    traceId = randomBytes(16).toString("hex");
  }

  return traceId;
}

export function generateSpanId(): string {
  let spanId = randomBytes(8).toString("hex");

  if (spanId === INVALID_SPAN_ID) {
    spanId = randomBytes(8).toString("hex");
  }

  return spanId;
}

/**
 * Trace context baru dengan sampling acak memakai bit 01 `trace-flags`.
 * Sampling hanya penanda; tidak ada pipeline yang menjatuhkan data saat
 * `sampled === false`.
 */
export function generateTraceContext(): TraceContext {
  const sampled = (randomBytes(1)[0] ?? 0) % 2 === 1;

  return {
    traceId: generateTraceId(),
    spanId: generateSpanId(),
    traceFlags: sampled ? "01" : "00",
    sampled,
  };
}

/**
 * Baca header `traceparent` dengan format `00-<32hex>-<16hex>-<2hex>`.
 * Mengembalikan `null` untuk header yang tidak valid; tidak pernah melempar.
 *
 * Versi selain `00` ditolak: versi berikutnya bisa menambah field, dan kita
 * tidak punya parser-nya. Menolak lebih aman daripada menebak.
 */
export function parseTraceparent(header: string | null): TraceContext | null {
  if (typeof header !== "string") {
    return null;
  }

  const parts = header.trim().split("-");

  if (parts.length !== 4) {
    return null;
  }

  const [version, traceId, spanId, traceFlags] = parts as [
    string,
    string,
    string,
    string,
  ];

  if (version !== SUPPORTED_VERSION) {
    return null;
  }

  if (!isValidTraceId(traceId) || !isValidSpanId(spanId)) {
    return null;
  }

  if (!isValidTraceFlags(traceFlags)) {
    return null;
  }

  return {
    traceId,
    spanId,
    traceFlags,
    sampled: (Number.parseInt(traceFlags, 16) & 0x01) === 0x01,
  };
}

export function formatTraceparent(context: TraceContext): string {
  return `${SUPPORTED_VERSION}-${context.traceId}-${context.spanId}-${context.traceFlags}`;
}

/**
 * Titik masuk utama untuk request handling: lanjutkan `traceId` yang masuk
 * bila valid, atau buat trace baru. `spanId` selalu baru karena satu request =
 * satu span baru.
 *
 * `isNew` dipakai untuk membedakan "trace diteruskan upstream" dari "trace
 * dimulai di aplikasi ini" saat agregasi metrik.
 */
export function resolveTraceContext(incoming: string | null): {
  context: TraceContext;
  isNew: boolean;
} {
  const parsed = parseTraceparent(incoming);

  if (!parsed) {
    return { context: generateTraceContext(), isNew: true };
  }

  return {
    context: {
      traceId: parsed.traceId,
      spanId: generateSpanId(),
      traceFlags: parsed.traceFlags,
      sampled: parsed.sampled,
    },
    isNew: false,
  };
}
