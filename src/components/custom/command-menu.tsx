"use client"

import * as React from "react"
import { Dialog } from "@base-ui/react/dialog"
import { CornerDownLeft, HistoryIcon, Search } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { COMMAND_MENU_CONFIG } from "@/config/command-menu"
import { sidebarNav } from "@/config/site"
import { isKnownRouteHref, useRecentPages } from "@/hooks/use-recent-pages"

const navItems = sidebarNav.flatMap((group) => group.items)
const config = COMMAND_MENU_CONFIG

export function CommandMenu() {
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)
  const { pages, recordVisit } = useRecentPages()

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpen((current) => !current)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  // Rekam kunjungan dari client boundary ini; halaman tidak perlu klien sendiri.
  React.useEffect(() => {
    if (pathname) {
      recordVisit(pathname)
    }
  }, [pathname, recordVisit])

  const normalizedQuery = query.trim().toLowerCase()

  const recentItems = React.useMemo(() => {
    const known = pages.filter((page) => isKnownRouteHref(page.href))
    if (!normalizedQuery) return known
    return known.filter((page) => page.label.toLowerCase().includes(normalizedQuery))
  }, [pages, normalizedQuery])

  const filteredItems = React.useMemo(() => {
    if (!normalizedQuery) return navItems
    return navItems.filter((item) => item.title.toLowerCase().includes(normalizedQuery))
  }, [normalizedQuery])

  function navigate(href: string) {
    setOpen(false)
    setQuery("")
    router.push(href)
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1 px-2"
            aria-label={config.triggerLabel}
            aria-keyshortcuts="Control+K Meta+K"
            title={`${config.triggerLabel} (Ctrl+K)`}
          />
        }
      >
        <Search aria-hidden="true" />
        <span className="font-mono text-xs text-muted-foreground">⌘K</span>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/10 backdrop-blur-xs" />
        <Dialog.Popup
          initialFocus={inputRef}
          className="fixed top-[20%] left-1/2 z-50 w-[min(32rem,calc(100%-2rem))] -translate-x-1/2 overflow-hidden rounded-xl border bg-background text-foreground shadow-lg"
        >
          <Dialog.Title className="sr-only">{config.dialogTitle}</Dialog.Title>
          <div className="flex items-center border-b px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (recentItems[0] ?? filteredItems[0])) {
                  event.preventDefault()
                  navigate((recentItems[0] ?? filteredItems[0]).href)
                }
              }}
              placeholder={config.searchPlaceholder}
              aria-label={config.searchLabel}
              className="h-12 w-full bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd className="hidden text-xs text-muted-foreground sm:inline">
              {config.shortcutHint}
            </kbd>
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {recentItems.length > 0 ? (
              <section aria-label={config.recentListLabel} className="mb-2">
                <h3 className="px-2 pt-1 pb-1.5 text-xs font-medium text-muted-foreground">
                  {config.recentGroupTitle}
                </h3>
                <div role="listbox" aria-label={config.recentListLabel}>
                  {recentItems.map((item) => (
                    <button
                      key={item.href}
                      type="button"
                      role="option"
                      aria-selected="false"
                      onClick={() => navigate(item.href)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm outline-none hover:bg-muted focus-visible:bg-muted"
                    >
                      <HistoryIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="truncate">{item.label}</span>
                      <CornerDownLeft className="ml-auto size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            {filteredItems.length > 0 ? (
              <div role="listbox" aria-label={config.navigationListLabel}>
                {filteredItems.map((item) => (
                  <button
                    key={item.href}
                    type="button"
                    role="option"
                    aria-selected="false"
                    disabled={item.disabled}
                    onClick={() => navigate(item.href)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm outline-none hover:bg-muted focus-visible:bg-muted disabled:pointer-events-none disabled:opacity-50"
                  >
                    <item.icon aria-hidden="true" />
                    <span>{item.title}</span>
                    <CornerDownLeft className="ml-auto size-3.5 text-muted-foreground" aria-hidden="true" />
                  </button>
                ))}
              </div>
            ) : null}

            {recentItems.length === 0 && filteredItems.length === 0 ? (
              <CommandEmpty />
            ) : null}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function CommandEmpty() {
  return (
    <p className="px-2 py-6 text-center text-sm text-muted-foreground">{config.emptyLabel}</p>
  )
}
