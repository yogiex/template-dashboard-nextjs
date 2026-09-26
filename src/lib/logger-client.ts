/**
 * Logger untuk sisi browser.
 *
 * `@/lib/logger` (pino + `redactTags()`) melakukan `import "server-only"`,
 * jadi modul itu tidak boleh masuk ke client bundle (ARCHITECTURE §7.5,
 * §10.7). Modul yang tetap butuh diagnostik di browser — misalnya modul
 * `localStorage` pada `features/settings` atau `features/notification` —
 * memakai modul ini sebagai gantinya.
 *
 * Kontrak yang dijaga di sini:
 * - context TIDAK pernah dicetak, sehingga tidak ada jalur PII/traffic data ke
 *   console browser. Yang dicetak hanya nama event dan pesan error.
 * - `error` dari server harus sudah berupa `AppError` yang aman untuk
 *   ditampilkan (lihat `src/lib/error.ts`); jangan kirim `Response` mentah.
 * - output development saja; di production console dibiarkan bersih kecuali
 *   `error`, supaya tidak membocorkan detail internal ke perangkat user.
 */

export type LogContext = Record<string, unknown>;

const PREFIX = "[client]";

function emit(method: "debug" | "info" | "warn", message: string): void {
  if (process.env.NODE_ENV === "production") {
    return;
  }
  console[method](`${PREFIX} ${message}`);
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "unknown error";
}

export interface ClientLogger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error: unknown, context?: LogContext): void;
}

export const clientLogger: ClientLogger = {
  debug: (message) => emit("debug", message),
  info: (message) => emit("info", message),
  warn: (message) => emit("warn", message),
  error: (message, error) => {
      console.error(`${PREFIX} ${message}: ${errorMessage(error)}`);
  },
};
