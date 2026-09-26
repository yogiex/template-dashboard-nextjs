import type { Metadata } from "next"

import { AppSidebar } from "@/components/layout/app-sidebar"
import { SiteHeader } from "@/components/layout/site-header"
import { SidebarProvider } from "@/components/ui/sidebar"
import { requirePageSessionForDev } from "@/features/auth/require-page-session"

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

/**
 * Shell dashboard dijaga di layout, bukan di tiap page: ini satu-satunya tempat
 * yang menaungi seluruh route `(dashboard)`, jadi tidak ada halaman yang bisa
 * lupa memasang guard.
 *
 * `force-dynamic` disengaja dan eksplisit. Sebelumnya semua route di grup ini
 * ter-prerender jadi file statis karena layout tidak pernah membaca session.
 * Shell yang terautentikasi tidak boleh menjadi aset cache: begitu halaman
 * dirender per-user, isinya (nama, role, nav) tidak boleh lagi bisa dipakai
 * ulang antar-pengunjung. `requirePageSessionForDev()` sendiri belum memakai
 * Request-time API, jadi tanpa baris ini Next tidak akan mendeteksi dinamismenya
 * dan grup ini tetap terbaca sebagai "static" walau sudah diguard. Lihat
 * docs/ARCHITECTURE.md §9.
 */
export const dynamic = "force-dynamic"

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Fail-closed: tanpa sesi, `redirect("/login")`; error lain tetap dilempar.
  // Butuh `DEV_AUTH_BYPASS=1` (dan `NODE_ENV` bukan "production") agar template
  // masih bisa dibuka sebelum backend ada.
  await requirePageSessionForDev()

  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <SiteHeader />
        {children}
      </div>
    </SidebarProvider>
  )
}
