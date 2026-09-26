import "server-only";

import { createHash } from "node:crypto";

import { env } from "@/lib/env";

/**
 * Redaksi data yang masuk ke metrik, log, dan anomaly evidence.
 *
 * Aturan main:
 * - nilai yang bisa mengidentifikasi orang (IP, email, token, id device) tidak
 *   pernah disimpan apa adanya; diganti hash truncated atau dimask;
 * - user-agent dipotong agar tidak menjadi fingerprint penuh;
 * - key yang secara default sensitif dibuang, bukan hanya disamarkan.
 */

const SENSITIVE_KEY_PATTERN =
  /(password|passwd|secret|token|authorization|cookie|apikey|api_key|ssn|credit|card|cvv|otp|code)/i;

const IP_KEY_PATTERN = /^(ip|ipaddress|ip_address|remote_addr|x_forwarded_for)$/i;
const EMAIL_KEY_PATTERN = /^(email|mail|username|user_name)$/i;
const USER_AGENT_KEY_PATTERN = /^(useragent|user_agent|ua)$/i;

const HASH_LENGTH = 16;
const USER_AGENT_MAX_LENGTH = 120;
const MAX_NESTING_DEPTH = 4;
const MAX_ARRAY_ITEMS = 20;
const MAX_OBJECT_KEYS = 20;
const MAX_SERIALIZED_LENGTH = 200;

function hashValue(value: string): string {
  return createHash("sha256")
    .update(`${env.NEXT_PUBLIC_APP_URL}:${value}`)
    .digest("hex")
    .slice(0, HASH_LENGTH);
}

export function hashIp(ip: string): string {
  return hashValue(`ip:${ip}`);
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");

  if (!local || !domain) {
    return "***";
  }

  const visible = local.slice(0, 2);

  return `${visible}${"•".repeat(Math.max(local.length - 2, 2))}@${domain}`;
}

export function truncateUserAgent(userAgent: string): string {
  return userAgent.slice(0, USER_AGENT_MAX_LENGTH);
}

/**
 * Bersihkan satu tag. Nilai iterable (IP bisa berisi daftar di
 * `x-forwarded-for`) diproses per item.
 */
function redactTag(key: string, value: string): string | null {
  if (SENSITIVE_KEY_PATTERN.test(key)) {
    return null;
  }

  if (IP_KEY_PATTERN.test(key)) {
    return value
      .split(",")
      .map((part) => hashIp(part.trim()))
      .filter(Boolean)
      .join(",");
  }

  if (EMAIL_KEY_PATTERN.test(key)) {
    return maskEmail(value);
  }

  if (USER_AGENT_KEY_PATTERN.test(key)) {
    return truncateUserAgent(value);
  }

  return value.slice(0, 200);
}

/**
 * Redaksi nilai yang bukan string.
 *
 * Nilai non-string tidak boleh dilewatkan lewat `String(value)`: object menjadi
 * `"[object Object]"` sehingga seluruh isinya hilang, termasuk nilai yang
 * sebenarnya tidak sensitif. Object dan array diruemah secara rekursif, key
 * sensitif di dalamnya ikut dibuang, dan kedalaman serta panjangnya dibatasi.
 *
 * Nilai yang tidak bisa diserialisasi (BigInt, Symbol, function, object
 * bersiklus) diganti representasi yang tidak membocorkan isi.
 */
function redactValue(value: unknown, depth: number): string {
  if (value === null || value === undefined) {
    return "null";
  }

  const valueType = typeof value;

  if (typeof value === "bigint") {
    return `${String(value)}n`;
  }

  if (typeof value === "symbol") {
    return value.toString();
  }

  if (typeof value === "function") {
    return "[Function]";
  }

  if (typeof value === "string") {
    return truncateSerialized(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (depth >= MAX_NESTING_DEPTH) {
    return "[TRUNCATED]";
  }

  if (Array.isArray(value)) {
    const items = value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => redactValue(item, depth + 1));

    if (value.length > MAX_ARRAY_ITEMS) {
      items.push(`[+${value.length - MAX_ARRAY_ITEMS} more]`);
    }

    return truncateSerialized(`[${items.join(",")}]`);
  }

  if (valueType === "object") {
    let result: string;

    try {
      const pairs: string[] = [];

      for (const [childKey, childValue] of Object.entries(
        value as Record<string, unknown>,
      )) {
        if (pairs.length >= MAX_OBJECT_KEYS) {
          pairs.push("[TRUNCATED]");
          break;
        }

        if (childValue === null || childValue === undefined) {
          continue;
        }

        // Key skalar tetap lewat `redactTag` supaya aturan IP/email/user-agent
        // juga berlaku di dalam object bersarang, bukan hanya key teratas.
        if (typeof childValue === "string") {
          const redacted = redactTag(childKey, childValue);

          if (redacted !== null) {
            pairs.push(`${childKey}:${JSON.stringify(redacted)}`);
          }

          continue;
        }

        if (SENSITIVE_KEY_PATTERN.test(childKey)) {
          continue;
        }

        pairs.push(`${childKey}:${redactValue(childValue, depth + 1)}`);
      }

      result = truncateSerialized(`{${pairs.join(",")}}`);
    } catch {
      // Proxy yang melempar, object bersiklus, atau BigInt di dalam array.
      return "[UNSERIALIZABLE]";
    }

    return result;
  }

  return truncateSerialized(String(value));
}

function truncateSerialized(value: string): string {
  return value.length > MAX_SERIALIZED_LENGTH
    ? `${value.slice(0, MAX_SERIALIZED_LENGTH)}…`
    : value;
}

/** Tag aman untuk disimpan. Key/value yang sensitif dibuang. */
export function redactTags(
  tags: Record<string, unknown> | undefined,
): Record<string, string> {
  if (!tags) {
    return {};
  }

  const result: Record<string, string> = {};

  for (const [key, rawValue] of Object.entries(tags)) {
    if (rawValue === undefined || rawValue === null) {
      continue;
    }

    const redacted =
      typeof rawValue === "string"
        ? redactTag(key, rawValue)
        : redactTag(key, redactValue(rawValue, 0));

    if (redacted !== null) {
      result[key] = redacted;
    }
  }

  return result;
}

/** Samakan bentuk evidence anomaly supaya tidak pernah menyimpan nilai mentah. */
export function redactEvidence(
  evidence: Record<string, unknown>,
): Record<string, string> {
  return redactTags(evidence);
}

export type RedactableActor = {
  id?: string;
  email?: string;
  role?: string;
};

/**
 * Mask `actor.email` sebelum event disimpan.
 *
 * `id` dan `role` bukan PII dan tetap utuh supaya audit tetap bisa menelusuri
 * aktor. Tanpa ini, `actor.email` tersimpan mentah sementara `metadata.email`
 * sudah lewat `maskEmail()` — dua perlakuan berbeda untuk data yang sama.
 */
export function redactActor<T extends RedactableActor>(
  actor: T | undefined,
): T | undefined {
  if (!actor) {
    return undefined;
  }

  if (!actor.email) {
    return actor;
  }

  return { ...actor, email: maskEmail(actor.email) };
}
