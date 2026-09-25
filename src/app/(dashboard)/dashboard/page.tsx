import type { Metadata } from "next"

import { EmptyState } from "@/components/custom/empty-state"
import { PageShell } from "@/components/layout/page-shell"
import { ActivityTable } from "@/features/dashboard/components/activity-table"
import { ChartSection } from "@/features/dashboard/components/chart-section"
import { KpiSection } from "@/features/dashboard/components/kpi-section"
import { getDashboardStats } from "@/features/dashboard/service"

export const metadata: Metadata = { title: "Dashboard" }

export default async function DashboardPage() {
  const stats = await getDashboardStats()
  const isEmpty =
    stats.stats.length === 0 &&
    stats.revenue.length === 0 &&
    stats.activities.length === 0

  return (
    <PageShell
      title="Dashboard"
      description="Ringkasan aktivitas dan metrik aplikasi Anda."
    >
      {isEmpty ? (
        <EmptyState
          title="Belum ada data"
          description="Data metrik akan tampil di sini setelah sumber data terhubung."
        />
      ) : (
        <div className="space-y-6">
          <KpiSection stats={stats.stats} />
          <ChartSection revenue={stats.revenue} traffic={stats.traffic} />
          <ActivityTable activities={stats.activities} />
        </div>
      )}
    </PageShell>
  )
}
