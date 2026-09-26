import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const DEFAULT_STEP_SECONDS = 30;
const DEFAULT_DIGITS = 6;

export const TOTP_ISSUER = "Dashboard";

type GenerateTotpCodeOptions = {
  timestamp?: number;
  stepSeconds?: number;
  digits?: number;
};

type VerifyTotpCodeOptions = GenerateTotpCodeOptions & {
  /** Jumlah step ke depan dan ke belakang yang masih diterima. Default 1 (±30 detik). */
  window?: number;
};

/** Base32 secret acak sesuai RFC 4226. Panjang default 20 byte = 32 karakter. */
export function generateTotpSecret(byteLength = 20): string {
  const bytes = randomBytes(byteLength);
  let bits = "";

  for (const byte of bytes) {
    bits += byte.toString(2).padStart(8, "0");
  }

  let secret = "";

  for (let index = 0; index + 5 <= bits.length; index += 5) {
    secret += BASE32_ALPHABET[Number.parseInt(bits.slice(index, index + 5), 2)];
  }

  return secret;
}

function decodeBase32(secret: string): Buffer {
  const normalized = secret.toUpperCase().replace(/[\s=]+/g, "");
  let bits = "";

  for (const char of normalized) {
    const index = BASE32_ALPHABET.indexOf(char);

    if (index === -1) {
      throw new Error("INVALID_TOTP_SECRET");
    }

    bits += index.toString(2).padStart(5, "0");
  }

  const bytes: number[] = [];

  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }

  return Buffer.from(bytes);
}

/** Kode TOTP RFC 6238 (HMAC-SHA1, truncated dynamic binary code). */
export function generateTotpCode(
  secret: string,
  options: GenerateTotpCodeOptions = {},
): string {
  const stepSeconds = options.stepSeconds ?? DEFAULT_STEP_SECONDS;
  const digits = options.digits ?? DEFAULT_DIGITS;
  const timestamp = options.timestamp ?? Date.now();
  const counter = Math.floor(timestamp / 1000 / stepSeconds);
  const counterBuffer = Buffer.alloc(8);

  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const digest = createHmac("sha1", decodeBase32(secret))
    .update(counterBuffer)
    .digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binaryCode = digest.readUInt32BE(offset) & 0x7fffffff;
  const modulo = 10 ** digits;

  return String(binaryCode % modulo).padStart(digits, "0");
}

export function verifyTotpCode(
  secret: string,
  code: string,
  options: VerifyTotpCodeOptions = {},
): boolean {
  if (!new RegExp(`^\\d{${options.digits ?? DEFAULT_DIGITS}}$`).test(code)) {
    return false;
  }

  const stepSeconds = options.stepSeconds ?? DEFAULT_STEP_SECONDS;
  const window = options.window ?? 1;
  const timestamp = options.timestamp ?? Date.now();

  try {
    for (let drift = -window; drift <= window; drift += 1) {
      const expected = generateTotpCode(secret, {
        timestamp: timestamp + drift * stepSeconds * 1000,
        stepSeconds,
        digits: options.digits,
      });

      if (timingSafeEqual(Buffer.from(expected), Buffer.from(code))) {
        return true;
      }
    }
  } catch {
    return false;
  }

  return false;
}

export function buildOtpAuthUrl(input: {
  secret: string;
  accountName: string;
  issuer?: string;
  stepSeconds?: number;
  digits?: number;
}): string {
  const issuer = input.issuer ?? TOTP_ISSUER;
  const stepSeconds = input.stepSeconds ?? DEFAULT_STEP_SECONDS;
  const digits = input.digits ?? DEFAULT_DIGITS;
  const label = encodeURIComponent(`${issuer}:${input.accountName}`);
  const params = new URLSearchParams({
    secret: input.secret,
    issuer,
    algorithm: "SHA1",
    digits: String(digits),
    period: String(stepSeconds),
  });

  return `otpauth://totp/${label}?${params.toString()}`;
}
