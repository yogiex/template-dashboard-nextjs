export const ERROR_CODES = [
  "VALIDATION_ERROR",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "RATE_LIMITED",
  "INTERNAL_ERROR",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];
export type FieldErrors = Record<string, string[]>;

export type AppErrorOptions = {
  message?: string;
  fieldErrors?: FieldErrors;
  cause?: unknown;
};

const HTTP_STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

const USER_MESSAGES: Record<ErrorCode, string> = {
  VALIDATION_ERROR: "Data yang dikirim tidak valid.",
  UNAUTHENTICATED: "Sesi berakhir. Silakan login kembali.",
  FORBIDDEN: "Anda tidak memiliki akses.",
  NOT_FOUND: "Data tidak ditemukan.",
  CONFLICT: "Data sudah ada.",
  RATE_LIMITED: "Terlalu banyak percobaan. Coba lagi nanti.",
  INTERNAL_ERROR: "Terjadi kesalahan. Silakan coba lagi.",
};

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly fieldErrors?: FieldErrors;

  constructor(code: ErrorCode, options: AppErrorOptions = {}) {
    super(options.message ?? USER_MESSAGES[code], { cause: options.cause });
    this.name = "AppError";
    this.code = code;
    this.fieldErrors = options.fieldErrors;
  }

  get status(): number {
    return HTTP_STATUS[this.code];
  }

  get userMessage(): string {
    return USER_MESSAGES[this.code];
  }
}

export function getErrorStatus(code: ErrorCode): number {
  return HTTP_STATUS[code];
}

export function getErrorMessage(code: ErrorCode): string {
  return USER_MESSAGES[code];
}
