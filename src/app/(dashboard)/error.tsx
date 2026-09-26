"use client"

import { AlertTriangle, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-20 text-center"
    >
      <AlertTriangle className="h-10 w-10 text-destructive/70" aria-hidden="true" />
      <h2 className="mt-4 text-lg font-semibold">Gagal memuat halaman</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Terjadi kesalahan saat menampilkan halaman ini. Data lain masih bisa diakses melalui menu.
      </p>
      {error.digest ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Kode referensi: <code className="font-mono">{error.digest}</code>
        </p>
      ) : null}
      <Button variant="outline" size="sm" className="mt-6" onClick={reset}>
        <RotateCcw aria-hidden="true" />
        Coba lagi
      </Button>
    </div>
  )
}
