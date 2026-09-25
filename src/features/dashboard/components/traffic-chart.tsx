"use client"

import { Bar, BarChart, XAxis, YAxis } from "recharts"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import type { TrafficSource } from "@/features/dashboard/schema"

const trafficChartConfig = {
  visits: { label: "Kunjungan", color: "var(--chart-3)" },
} satisfies ChartConfig

interface TrafficChartProps {
  data: TrafficSource[]
}

export function TrafficChart({ data }: TrafficChartProps) {
  return (
    <ChartContainer config={trafficChartConfig} className="h-72 w-full">
      <BarChart data={data} layout="vertical" margin={{ left: 12, right: 12 }}>
        <XAxis type="number" hide />
        <YAxis dataKey="source" type="category" tickLine={false} axisLine={false} width={80} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="visits" fill="var(--color-visits)" radius={[0, 4, 4, 0]} barSize={24} />
      </BarChart>
    </ChartContainer>
  )
}
