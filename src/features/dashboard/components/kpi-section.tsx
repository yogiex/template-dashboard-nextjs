import { dashboardStatsConfig } from "@/config/dashboard"
import { StatCard } from "@/features/dashboard/components/stat-card"
import type { DashboardStats } from "@/features/dashboard/schema"

interface KpiSectionProps {
  stats: DashboardStats["stats"]
}

export function KpiSection({ stats }: KpiSectionProps) {
  if (stats.length === 0) {
    return null
  }

  return (
    <section aria-label="Ringkasan metrik utama">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const meta = dashboardStatsConfig.find((item) => item.id === stat.id)
          return <StatCard key={stat.id} stat={stat} isAnchor={meta?.isAnchor} />
        })}
      </div>
    </section>
  )
}
