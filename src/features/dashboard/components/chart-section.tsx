import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { RevenueChartClient } from "@/features/dashboard/components/revenue-chart-client"
import { TrafficChartClient } from "@/features/dashboard/components/traffic-chart-client"
import type { RevenuePoint, TrafficSource } from "@/features/dashboard/schema"

function ChartLoading() {
  return <Skeleton className="h-72 w-full rounded-md" />
}

interface ChartSectionProps {
  revenue: RevenuePoint[]
  traffic: TrafficSource[]
}

export function ChartSection({ revenue, traffic }: ChartSectionProps) {
  if (revenue.length === 0 && traffic.length === 0) {
    return null
  }

  return (
    <section aria-label="Grafik" className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Revenue Overview</CardTitle>
          <CardDescription>6 bulan terakhir</CardDescription>
        </CardHeader>
        <CardContent>
          {revenue.length > 0 ? <RevenueChartClient data={revenue} /> : <ChartLoading />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sumber Trafik</CardTitle>
          <CardDescription>Kunjungan bulan ini</CardDescription>
        </CardHeader>
        <CardContent>
          {traffic.length > 0 ? <TrafficChartClient data={traffic} /> : <ChartLoading />}
        </CardContent>
      </Card>
    </section>
  )
}
