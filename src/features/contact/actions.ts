"use server";

import {
  contactFormSchema,
  type ContactFormValues,
} from "@/features/contact/schema";
import { METRIC_NAMES } from "@/features/observability/lib/constants";
import { trackMetric } from "@/features/observability/lib/track";
import { AUDIT_ACTIONS } from "@/features/audit/lib/categories";
import { logAudit } from "@/features/audit/lib/log-audit";
import { AppError, type ErrorCode, type FieldErrors } from "@/lib/error";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getSafeRequestContext } from "@/lib/request-context";

export type ContactActionState =
  | { success: true }
  | {
      success: false;
      error: {
        code: ErrorCode;
        message: string;
        fieldErrors?: FieldErrors;
      };
    };

function failure(code: ErrorCode, fieldErrors?: FieldErrors): ContactActionState {
  return {
    success: false,
    error: { code, message: new AppError(code).userMessage, fieldErrors },
  };
}

function getEmailHint(input: unknown): string {
  if (typeof input !== "object" || input === null || !("email" in input)) {
    return "unknown";
  }

  return String((input as { email: unknown }).email).slice(0, 254);
}

/**
 * Identifier rate limit untuk Pengirim anonim. `ipHash` (hash, bukan IP mentah)
 * dipakai supaya tidak ada email mentah yang tersimpan sebagai key; email hanya
 * jadi fallback ketika header IP tidak tersedia.
 */
async function resolveRateLimitKey(input: unknown): Promise<string> {
  const { ipHash } = await getSafeRequestContext();

  return ipHash ? `ip:${ipHash}` : `email:${getEmailHint(input)}`;
}

export async function sendContactMessage(
  input: unknown,
): Promise<ContactActionState> {
  try {
    enforceRateLimit(await resolveRateLimitKey(input), "contact");
    enforceRateLimit("global", "contact");

    const result = contactFormSchema.safeParse(input);

    if (!result.success) {
      const fieldErrors = result.error.issues.reduce<FieldErrors>(
        (errors, issue) => {
          const field = issue.path[0];

          if (typeof field === "string") {
            errors[field] = [...(errors[field] ?? []), issue.message];
          }

          return errors;
        },
        {},
      );

      return failure("VALIDATION_ERROR", fieldErrors);
    }

    trackMetric({
      name: METRIC_NAMES.CONTACT_MESSAGE,
      tags: { subject: result.data.subject, delivery: "log-only" },
    });

    logger.info("contact.message.received", {
      subject: result.data.subject,
      delivery: "log-only",
    });

    // Email pengirim boleh ikut karena `logAudit` memaksa redaksi metadata;
    // isi pesan dan field sensitif tidak pernah dikirim ke sini.
    void logAudit({
      action: AUDIT_ACTIONS.CONTACT_MESSAGE_RECEIVED,
      category: "data",
      severity: "info",
      result: "success",
      source: "contact/send",
      metadata: {
        email: result.data.email,
        subject: result.data.subject,
        delivery: "log-only",
      },
    });

    return { success: true };
  } catch (error) {
    if (error instanceof AppError) {
      if (error.code === "RATE_LIMITED") {
        void logAudit({
          action: AUDIT_ACTIONS.RATE_LIMIT_HIT,
          category: "security",
          severity: "warning",
          result: "failure",
          source: "contact/send",
          metadata: { control: "rate-limit" },
        });
      }

      return {
        success: false,
        error: {
          code: error.code,
          message: error.userMessage,
          fieldErrors: error.fieldErrors,
        },
      };
    }

    logger.error("contact.unexpected_error", error);

    return failure("INTERNAL_ERROR");
  }
}

export type { ContactFormValues };
