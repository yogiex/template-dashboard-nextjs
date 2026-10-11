import type { Metadata } from "next"

import { AppSidebar } from "@/components/layout/app-sidebar"
import { SiteHeader } from "@/components/layout/site-header"
import { SidebarProvider } from "@/components/ui/sidebar"
import { requirePageSession } from "@/features/auth/require-page-session"

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
 * Shell terautentikasi tidak boleh menjadi aset cache: begitu isinya dirender
 * per-pengguna (nama, role, nav), hasil itu tidak boleh bisa dipakai ulang
 * antar-pengunjung. Baris ini membuat jaminan itu eksplisit, bukan bergantung
 * pada deteksi otomatis yang bisa lenyap tanpa ada yang sadar begitu
 * implementasi sesi berubah.
 */
export const dynamic = "force-dynamic"

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Fail-closed: tanpa sesi, `redirect("/login")`; error lain (FORBIDDEN,
  // RATE_LIMITED, crash) tetap dilempar. Sengaja tanpa bypass dev — affordance
  // itu ada di `requirePageSessionForDev()` dan harus dipanggil eksplisit,
  // tidak pernah dari guard shell.
  await requirePageSession()

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
