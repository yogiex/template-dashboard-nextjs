import { z } from "zod";
import { API_KEYS_CONFIG } from "@/config/api-keys";

export const scopeKeySchema = z.enum(
  Object.keys(API_KEYS_CONFIG.scopesCatalog) as [string, ...string[]],
);
export type ScopeKey = z.infer<typeof scopeKeySchema>;

export const apiKeySchema = z.object({
  id: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/),
  name: z.string().min(1).max(60),
  prefix: z.string().min(4).max(12),
  digest: z.string().regex(/^[a-f0-9]{64}$/),
  scopes: z.array(scopeKeySchema).min(1).max(12),
  createdAt: z.string().datetime(),
  revoked: z.boolean(),
  revokedAt: z.string().datetime().nullable(),
  lastUsedAt: z.string().datetime().nullable(),
});

export type ApiKey = z.infer<typeof apiKeySchema>;

export const apiKeyListSchema = z.array(apiKeySchema).max(100);

export const createApiKeySchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi").max(60, "Nama maksimal 60 karakter"),
  scopes: z.array(scopeKeySchema).min(1, "Pilih minimal satu scope").max(12),
});

export type CreateApiKeyValues = z.infer<typeof createApiKeySchema>;

export function maskApiKey(key: ApiKey): string {
  return `${key.prefix}••••••••`;
}

export function generateApiKeySecret(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let out = "sk_live_";
  const randomChar = () => {
    try {
      const b = new Uint8Array(1);
      crypto.getRandomValues(b);
      return alphabet[b[0] % alphabet.length];
    } catch {
      return alphabet[Math.floor(Math.random() * alphabet.length)];
    }
  };
  for (let i = 0; i < 32; i += 1) out += randomChar();
  return out;
}

export async function digestSha256(input: string): Promise<string | null> {
  try {
    if (typeof crypto !== "undefined" && crypto.subtle) {
      const data = new TextEncoder().encode(input);
      const buf = await crypto.subtle.digest("SHA-256", data);
      return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    }
  } catch {
    // fallthrough to fallback
  }
  // Fallback: simple random digest-shaped string (mock only)
  return `${Date.now().toString(16).padStart(16, "0")}${input.length.toString(16).padStart(4, "0")}`.padEnd(64, "0");
}
