"use client"

import * as React from "react"
import { z } from "zod"

import { sidebarNav } from "@/config/site"
import { parseBreadcrumb } from "@/lib/parse-breadcrumb"

export const RECENT_PAGES_STORAGE_KEY = "dashboard:recent-pages:v1"
export const RECENT_PAGES_LIMIT = 8
export const RECENT_PAGES_MAX_PAYLOAD = 2048

const recentPageSchema = z.object({
  href: z.string().min(1).max(200).startsWith("/"),
  label: z.string().min(1).max(40),
  visitedAt: z.number().int().nonnegative(),
})

const recentPagesSchema = z.array(recentPageSchema).max(RECENT_PAGES_LIMIT)

export type RecentPage = z.infer<typeof recentPageSchema>

const navItems = sidebarNav.flatMap((group) => group.items)

function normalizeHref(href: string): string {
  const [pathname = "/"] = href.split(/[?#]/)
  if (pathname === "/") return "/"
  return pathname.replace(/\/+$/, "") || "/"
}

/**
 * Hanya route yang benar-benar ada di nav config yang boleh dicatat: path yang
 * sama persis dengan sebuah nav item, atau segmen turunannya (mis. `/users/42`).
 * Dengan begitu tidak ada entri dari URL yang sudah tidak lagi ada di sidebar.
 */
function isKnownRoute(pathname: string): boolean {
  return navItems.some((item) => {
    const base = normalizeHref(item.href)
    return pathname === base || pathname.startsWith(`${base}/`)
  })
}

/** Guard runtime: entri lama yang route-nya sudah hilang dari nav config disembunyikan. */
export function isKnownRouteHref(href: string): boolean {
  return isKnownRoute(normalizeHref(href))
}

function labelForPathname(pathname: string): string | null {
  const last = parseBreadcrumb(pathname, navItems).at(-1)
  if (!last || last.label === "Home") return null
  return last.label
}

function dedupe(pages: RecentPage[]): RecentPage[] {
  const seen = new Set<string>()
  const unique: RecentPage[] = []

  for (const page of pages) {
    if (seen.has(page.href)) continue
    seen.add(page.href)
    unique.push(page)
    if (unique.length === RECENT_PAGES_LIMIT) break
  }

  return unique
}

function readRaw(): string | null {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage.getItem(RECENT_PAGES_STORAGE_KEY)
  } catch {
    // Storage diblokir (mode privat, kebijakan browser): recents dilewati.
    return null
  }
}

function parsePages(raw: string | null): RecentPage[] {
  if (raw === null) return []

  try {
    const parsed: unknown = JSON.parse(raw)
    const result = recentPagesSchema.safeParse(parsed)
    return result.success ? dedupe(result.data) : []
  } catch {
    return []
  }
}

// Snapshot harus stabil antar render, jadi hasil parse di-cache per raw payload.
let cachedRaw: string | null = null
let cachedPages: RecentPage[] = []
let cachePrimed = false

function getSnapshot(): RecentPage[] {
  const raw = readRaw()

  if (!cachePrimed || raw !== cachedRaw) {
    cachePrimed = true
    cachedRaw = raw
    cachedPages = parsePages(raw)
  }

  return cachedPages
}

const SERVER_PAGES: RecentPage[] = []

const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) {
    listener()
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)

  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === RECENT_PAGES_STORAGE_KEY) {
      listener()
    }
  }

  window.addEventListener("storage", onStorage)

  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", onStorage)
  }
}

function writePages(pages: RecentPage[]): void {
  if (typeof window === "undefined") return

  try {
    const payload = JSON.stringify(pages)
    if (payload.length > RECENT_PAGES_MAX_PAYLOAD) return
    window.localStorage.setItem(RECENT_PAGES_STORAGE_KEY, payload)
    emit()
  } catch {
    // Kuota penuh atau storage diblokir: recents adalah fitur tambahan, abaikan.
  }
}

/**
 * Menyimpan `pathname` sebagai kunjungan terbaru: dedupe by href, most-recent-first,
 * maksimal {@link RECENT_PAGES_LIMIT} entri. Path yang tidak dikenal tidak pernah
 * disimpan sehingga command menu tidak pernah menawarkan route yang tidak ada.
 */
function recordVisit(pathname: string): void {
  const normalized = normalizeHref(pathname)
  if (!isKnownRoute(normalized)) return

  const label = labelForPathname(normalized)
  if (label === null) return

  const previous = getSnapshot().filter((page) => page.href !== normalized)

  writePages(
    dedupe([{ href: normalized, label, visitedAt: Date.now() }, ...previous])
  )
}

type UseRecentPages = {
  /** Kunjungan terbaru, most-recent-first, hanya untuk route yang dikenal. */
  pages: RecentPage[]
  /** Catat kunjungan; stabil terhadap re-render sehingga aman untuk effect. */
  recordVisit: (pathname: string) => void
}

export function useRecentPages(): UseRecentPages {
  const pages = React.useSyncExternalStore(subscribe, getSnapshot, () => SERVER_PAGES)
  const record = React.useCallback((pathname: string) => {
    recordVisit(pathname)
  }, [])

  return { pages, recordVisit: record }
}
