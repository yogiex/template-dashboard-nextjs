"use client"

import dynamic from "next/dynamic"
import type { TrafficSource } from "@/features/dashboard/schema"

const TrafficChart = dynamic(
  () => import("@/features/dashboard/components/traffic-chart").then((module) => module.TrafficChart),
  { ssr: false, loading: () => <div className="h-72 w-full" /> }
)

export function TrafficChartClient({ data }: { data: TrafficSource[] }) {
  return <TrafficChart data={data} />
}
