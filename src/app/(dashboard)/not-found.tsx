import Link from "next/link"

import { Button } from "@/components/ui/button"

export default function DashboardNotFound() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-20 text-center">
      <p className="font-mono text-sm text-muted-foreground">404</p>
      <h2 className="mt-2 text-lg font-semibold">Halaman tidak ditemukan</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Halaman yang Anda cari tidak tersedia.
      </p>
      <Button variant="outline" size="sm" className="mt-6" render={<Link href="/dashboard" />}>
        Kembali ke Dashboard
      </Button>
    </div>
  )
}
