"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type DataTableToolbarProps = {
  basePath: string
  initialQuery: string
  initialRole?: string
}

export function DataTableToolbar({ basePath, initialQuery, initialRole }: DataTableToolbarProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [inputValue, setInputValue] = useState(initialQuery)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  const pushParams = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(window.location.search)
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === "") params.delete(key)
      else params.set(key, value)
    }
    params.delete("page")
    const query = params.toString()
    startTransition(() => router.replace(query ? `${basePath}?${query}` : basePath, { scroll: false }))
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center" aria-busy={isPending}>
      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <Input type="search" placeholder="Cari nama atau email..." className="pl-8" value={inputValue} maxLength={100} aria-label="Cari user" onChange={(event) => { const value = event.target.value; setInputValue(value); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => pushParams({ q: value.trim().slice(0, 100) }), 300) }} />
      </div>
      <Select value={initialRole ?? "all"} onValueChange={(value) => pushParams({ role: value === "all" ? undefined : (value ?? undefined) })}>
        <SelectTrigger className="w-full sm:w-40" aria-label="Filter role"><SelectValue placeholder="Semua role" /></SelectTrigger>
        <SelectContent><SelectItem value="all">Semua role</SelectItem><SelectItem value="admin">Admin</SelectItem><SelectItem value="editor">Editor</SelectItem><SelectItem value="viewer">Viewer</SelectItem></SelectContent>
      </Select>
      {isPending ? <span className="text-xs text-muted-foreground" role="status">Memuat...</span> : null}
    </div>
  )
}
