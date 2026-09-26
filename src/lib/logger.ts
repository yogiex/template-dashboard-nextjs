import pino from "pino";

import { redactTags } from "@/lib/redact";

export type LogContext = Record<string, unknown>;

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error: unknown, context?: LogContext): void;
}

/**
 * Setiap context yang masuk ke pino dilewatkan `redactTags()` dari
 * `@/lib/redact`, sehingga password/token/cookie dibuang, email dimask, dan IP
 * di-hash — nilai mentah tidak pernah ikut ter-log (ARCHITECTURE §7.5, §10.7).
 *
 * `redactTags` hanya jalan di server (`import "server-only"` di `redact.ts`),
 * dan `redact.ts` tidak mengimpor logger, jadi tidak ada circular import.
 */
function redactContext(context: LogContext | undefined): Record<string, unknown> {
  if (!context) {
    return {};
  }

  const flat = redactTags(context);
  const result: Record<string, unknown> = { ...flat };

  // Nilai objek/array tidak punya bentuk yang berguna setelah di-`String()`;
  // rekursifkan aturan redaksi yang sama agar struktur tetap terbaca tanpa
  // membuka key/value sensitif di dalam object.
  for (const [key, value] of Object.entries(context)) {
    if (typeof value !== "object" || value === null || value instanceof Error) {
      continue;
    }

    if (!(key in flat)) {
      continue;
    }

    const nested = redactTags(value as Record<string, unknown>);

    if (Object.keys(nested).length > 0) {
      result[key] = nested;
    } else {
      delete result[key];
    }
  }

  return result;
}

const baseLogger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: {
    service: "nextjs",
    environment: process.env.NODE_ENV,
  },
});

export const logger: Logger = {
  debug(message, context) {
    baseLogger.debug(redactContext(context), message);
  },
  info(message, context) {
    baseLogger.info(redactContext(context), message);
  },
  warn(message, context) {
    baseLogger.warn(redactContext(context), message);
  },
  error(message, error, context) {
    // `err` tetap utuh supaya serializer pino bekerja; context tetap direduksi.
    baseLogger.error({ ...redactContext(context), err: error }, message);
  },
};
