import {
  COOKIE_CONSENT_STORAGE_KEY,
  COOKIE_CONSENT_VERSION,
  cookieConsentRecordSchema,
  type CookieConsentChoice,
  type CookieConsentRecord,
} from "@/features/cookie-consent/schema"

/**
 * Modul ini berjalan di browser (dipakai dari client component), jadi tidak
 * boleh mengimpor `@/lib/logger`: logger menarik `redact.ts` yang ber-
 * `import "server-only"`, dan itu membuat build gagal pada client boundary.
 * Kegagalan storage sengaja tidak di-log: isinya hanya pilihan consent, bukan
 * data pribadi, dan banner akan tampil ulang bila bacaan gagal.
 */
function isBrowser() {
  return typeof window !== "undefined"
}

/**
 * Baca pilihan tersimpan. `null` berarti "belum pernah memilih" — baik karena
 * key tidak ada, JSON rusak, atau versinya sudah berbeda. Semua kondisi itu
 * diperlakukan sama: tampilkan banner lagi.
 */
export function loadCookieConsent(): CookieConsentRecord | null {
  if (!isBrowser()) return null
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)
    if (!raw) return null
    const parsed = cookieConsentRecordSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) return null
    return parsed.data
  } catch {
    return null
  }
}

/**
 * Nama event yang dipakai untuk memublikasikan pilihan ke integrator analytics.
 *
 * Template ini tidak mengirim apa pun; yang terjadi hanya `CustomEvent` lokal
 * di `window`. Deployer yang menambahkan analytics cukup listen ke event ini
 * dan memuat atau menahan skrip berdasarkan `detail.choice` — bukan saat
 * komponen ini dirender.
 */
export const COOKIE_CONSENT_EVENT = "cookie-consent:change"

const listeners = new Set<() => void>()

function notify() {
  for (const listener of listeners) listener()
}

/**
 * `localStorage` diperlakukan sebagai external store supaya komponen bisa
 * membacanya dengan `useSyncExternalStore`: snapshot server selalu `null`, jadi
 * tidak ada hydration mismatch, dan re-render terjadi lewat subscription —
 * bukan `setState` di dalam effect.
 */
export function subscribeCookieConsent(listener: () => void): () => void {
  if (!isBrowser()) return () => {}
  listeners.add(listener)
  if (listeners.size === 1) {
    window.addEventListener("storage", onStorageChange)
    window.addEventListener(COOKIE_CONSENT_EVENT, onConsentEvent)
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      window.removeEventListener("storage", onStorageChange)
      window.removeEventListener(COOKIE_CONSENT_EVENT, onConsentEvent)
    }
  }
}

function onStorageChange(event: StorageEvent) {
  if (event.key !== null && event.key !== COOKIE_CONSENT_STORAGE_KEY) return
  notify()
}

function onConsentEvent() {
  notify()
}

export function getCookieConsentChoice(): CookieConsentChoice | null {
  return loadCookieConsent()?.choice ?? null
}

export function saveCookieConsent(choice: CookieConsentChoice): boolean {
  if (!isBrowser()) return false
  const record: CookieConsentRecord = {
    version: COOKIE_CONSENT_VERSION,
    choice,
    decidedAt: new Date().toISOString(),
  }
  const parsed = cookieConsentRecordSchema.safeParse(record)
  if (!parsed.success) return false
  try {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(parsed.data))
    return true
  } catch {
    return false
  }
}

export function announceCookieConsent(choice: CookieConsentChoice) {
  if (!isBrowser()) return
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: { choice } }))
}
