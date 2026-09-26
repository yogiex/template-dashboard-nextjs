import { z } from "zod"

/**
 * Bentuk data yang disimpan di `localStorage`.
 *
 * Key memakai versi (`v1`) dan payload juga menyimpan `version` supaya migrasi
 * ke format baru cukup mengganti konstanta: key lama tidak lagi dibaca, jadi
 * user otomatis diminta memilih ulang.
 */
export const COOKIE_CONSENT_VERSION = 1
export const COOKIE_CONSENT_STORAGE_KEY = `cookie-consent-v${COOKIE_CONSENT_VERSION}`

export const cookieConsentChoiceSchema = z.enum(["accepted", "rejected"])
export type CookieConsentChoice = z.infer<typeof cookieConsentChoiceSchema>

export const cookieConsentRecordSchema = z.object({
  version: z.literal(COOKIE_CONSENT_VERSION),
  choice: cookieConsentChoiceSchema,
  decidedAt: z.string().max(40),
})

export type CookieConsentRecord = z.infer<typeof cookieConsentRecordSchema>
