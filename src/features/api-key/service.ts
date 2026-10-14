import { clientLogger } from "@/lib/logger-client";
import {
  apiKeyListSchema,
  type ApiKey,
  generateApiKeySecret,
  digestSha256,
  maskApiKey,
} from "@/features/api-key/schema";

export type { ApiKey };

const STORAGE_KEY = "apikey.records";
const DEFAULT: ApiKey[] = [];

function parseList(input: unknown): ApiKey[] | null {
  const r = apiKeyListSchema.safeParse(input);
  return r.success ? r.data : null;
}

export function loadApiKeys(): ApiKey[] {
  if (typeof window === "undefined") return [...DEFAULT];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT];
    const parsed = JSON.parse(raw);
    const validated = parseList(parsed);
    if (validated) return validated;
    clientLogger.warn("apikey.list.invalid");
    return [...DEFAULT];
  } catch (error) {
    clientLogger.error("apikey.list.load_failed", error);
    return [...DEFAULT];
  }
}

export function saveApiKeys(list: ApiKey[]): boolean {
  if (typeof window === "undefined") return false;
  const validated = parseList(list);
  if (!validated) return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(validated));
    return true;
  } catch (error) {
    clientLogger.error("apikey.list.save_failed", error);
    return false;
  }
}

export type CreatedKey = { raw: string; record: ApiKey };

export async function createApiKey(
  name: string,
  scopes: string[],
): Promise<CreatedKey | null> {
  // validate inputs
  const { createApiKeySchema } = await import("@/features/api-key/schema");
  const parsed = createApiKeySchema.safeParse({ name, scopes });
  if (!parsed.success) return null;

  const raw = generateApiKeySecret();
  const digest = await digestSha256(raw);
  if (!digest) return null;

  const prefix = raw.slice(0, 11); // "sk_live_abcd"
  const record: ApiKey = {
    id: `ak_${crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "").slice(0, 12) : Math.random().toString(36).slice(2, 14)}`,
    name: parsed.data.name,
    prefix,
    digest,
    scopes: parsed.data.scopes as ApiKey["scopes"],
    createdAt: new Date().toISOString(),
    revoked: false,
    revokedAt: null,
    lastUsedAt: null,
  };

  const list = loadApiKeys();
  list.unshift(record);
  if (!saveApiKeys(list)) return null;
  return { raw, record };
}

export function revokeApiKey(id: string): boolean {
  if (typeof window === "undefined" || !id) return false;
  const list = loadApiKeys();
  const idx = list.findIndex((k) => k.id === id);
  if (idx === -1) return false;
  const next = [...list];
  next[idx] = {
    ...next[idx],
    revoked: true,
    revokedAt: new Date().toISOString(),
  };
  if (!saveApiKeys(next)) return false;
  return true;
}

export { maskApiKey };
