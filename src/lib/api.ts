import { randomUUID } from "node:crypto";

import { AppError, ERROR_CODES, type ErrorCode } from "@/lib/error";
import { logger } from "@/lib/logger";

const PROBLEM_TYPE_BASE = "https://docs.appmu.id/errors";

export type ProblemResponseOptions = {
  instance?: string;
  traceId?: string;
};

function getProblemType(code: ErrorCode): string {
  return `${PROBLEM_TYPE_BASE}/${code.toLowerCase()}`;
}

export function problemResponse(
  error: unknown,
  options: ProblemResponseOptions = {},
): Response {
  const traceId = options.traceId ?? randomUUID();
  const appError =
    error instanceof AppError
      ? error
      : new AppError("INTERNAL_ERROR", { cause: error });

  if (appError.status >= 500) {
    logger.error("request.failed", error, {
      code: appError.code,
      traceId,
    });
  } else {
    logger.warn("request.rejected", {
      code: appError.code,
      traceId,
    });
  }

  const problem = {
    type: getProblemType(appError.code),
    title: appError.code,
    status: appError.status,
    detail: appError.userMessage,
    traceId,
    ...(options.instance ? { instance: options.instance } : {}),
    ...(appError.fieldErrors ? { fieldErrors: appError.fieldErrors } : {}),
  };

  return Response.json(problem, {
    status: appError.status,
    headers: {
      "Content-Type": "application/problem+json",
      "X-Trace-Id": traceId,
    },
  });
}

export { ERROR_CODES };
