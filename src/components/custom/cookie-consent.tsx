"use client"

import { useEffect, useId, useState, useSyncExternalStore } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { cookieConsentCopy } from "@/config/cookie-consent"
import {
  announceCookieConsent,
  getCookieConsentChoice,
  saveCookieConsent,
  subscribeCookieConsent,
} from "@/features/cookie-consent/service"
import type { CookieConsentChoice } from "@/features/cookie-consent/schema"

function subscribe(onStoreChange: () => void) {
  return subscribeCookieConsent(onStoreChange)
}

function getSnapshot() {
  return getCookieConsentChoice()
}

function getServerSnapshot(): CookieConsentChoice | null {
  return null
}

/**
 * Banner persetujuan cookie.
 *
 * Sifat penting:
 * - SSR-safe: snapshot server selalu `null`, jadi markup server dan render
 *   hydrasi sama-sama kosong dan banner baru muncul setelah hydration selesai.
 * - Tidak memblokir halaman: `fixed` di bawah viewport, tanpa overlay, tanpa
 *   focus trap, dan dapat ditutup dengan Escape untuk sesi ini saja.
 * - Tidak memuat satu pun skrip pelacak; satu-satunya efek ke luar adalah
 *   `CustomEvent` lokal untuk integrator analytics.
 */
export function CookieConsent() {
  const choice = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const [dismissed, setDismissed] = useState(false)
  const titleId = useId()
  const descriptionId = useId()

  const visible = choice === null && !dismissed

  useEffect(() => {
    if (!visible) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return
      setDismissed(true)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [visible])

  if (!visible) return null

  function decide(next: CookieConsentChoice) {
    try {
      const stored = saveCookieConsent(next)
      announceCookieConsent(next)
      if (!stored) console.warn("[cookie-consent] pilihan tidak tersimpan")
    } catch (error) {
      console.error("[cookie-consent] gagal menyimpan pilihan", error)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      className="animate-reveal motion-reduce:animate-none fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card text-card-foreground shadow-lg"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 id={titleId} className="text-sm font-semibold">
            {cookieConsentCopy.title}
          </h2>
          <p id={descriptionId} className="text-sm text-muted-foreground">
            {cookieConsentCopy.description}{" "}
            <Link
              href={cookieConsentCopy.privacy.href}
              className="underline underline-offset-4 hover:text-foreground"
            >
              {cookieConsentCopy.privacy.label}
            </Link>
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => decide("rejected")}>
            {cookieConsentCopy.actions.reject}
          </Button>
          <Button onClick={() => decide("accepted")}>
            {cookieConsentCopy.actions.accept}
          </Button>
          <Button variant="ghost" size="xs" onClick={() => setDismissed(true)}>
            {cookieConsentCopy.dismiss}
          </Button>
        </div>
      </div>
    </div>
  )
}
