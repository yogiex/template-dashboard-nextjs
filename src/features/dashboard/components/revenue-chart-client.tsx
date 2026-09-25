"use client"

import dynamic from "next/dynamic"
import type { RevenuePoint } from "@/features/dashboard/schema"

const RevenueChart = dynamic(
  () => import("@/features/dashboard/components/revenue-chart").then((module) => module.RevenueChart),
  { ssr: false, loading: () => <div className="h-72 w-full" /> }
)

export function RevenueChartClient({ data }: { data: RevenuePoint[] }) {
  return <RevenueChart data={data} />
}
