import { z } from "zod";

export const mfaStateSchema = z.object({
  enrolled: z.boolean(),
  secret: z
    .string()
    .trim()
    .regex(/^[A-Z2-7]{16,64}$/, "Secret MFA tidak valid")
    .nullable(),
  backupCodes: z.array(z.string().min(4).max(32)).max(20),
  deviceTrust: z.boolean(),
  enrolledAt: z
    .string()
    .datetime({ message: "Timestamp enroll tidak valid" })
    .nullable(),
});

export type MfaState = z.infer<typeof mfaStateSchema>;

export const totpVerifySchema = z.object({
  code: z
    .string()
    .trim()
    .length(6, "Kode harus 6 digit")
    .regex(/^[0-9]+$/, "Kode hanya angka"),
});

export type TotpVerifyValues = z.infer<typeof totpVerifySchema>;

export const backupCodesSchema = z.array(z.string().min(4).max(32)).min(4).max(20);

export const MOCK_TOTP = "123456";

export function generateBackupCodes(count = 10): string[] {
  const out: string[] = [];
  const safeRandom = () => {
    try {
      return crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
    } catch {
      return Math.random().toString(36).slice(2, 12).toUpperCase();
    }
  };
  for (let i = 0; i < count; i += 1) {
    const raw = safeRandom();
    out.push(`${raw.slice(0, 5)}-${raw.slice(5, 10)}`);
  }
  return out;
}

export function generateBase32Secret(length = 32): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const out: string[] = [];
  const randomValue = () => {
    try {
      const bytes = new Uint8Array(1);
      crypto.getRandomValues(bytes);
      return bytes[0];
    } catch {
      return Math.floor(Math.random() * 256);
    }
  };
  for (let i = 0; i < length; i += 1) {
    out.push(alphabet[randomValue() % alphabet.length]);
  }
  return out.join("");
}
