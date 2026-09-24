import pino from "pino";

export type LogContext = Record<string, unknown>;

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error: unknown, context?: LogContext): void;
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
    baseLogger.debug(context ?? {}, message);
  },
  info(message, context) {
    baseLogger.info(context ?? {}, message);
  },
  warn(message, context) {
    baseLogger.warn(context ?? {}, message);
  },
  error(message, error, context) {
    baseLogger.error({ ...context, err: error }, message);
  },
};
