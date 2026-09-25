import { AlertTriangle, ArrowDown, ArrowUp } from "lucide-react"
import { cn } from "cn"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Stat } from "@/features/dashboard/schema"

interface StatCardProps {
  stat: Stat
  isAnchor?: boolean
}

export function StatCard({ stat, isAnchor = false }: StatCardProps) {
  return (
    <Card
      className={cn(
        stat.isAlert && "border-destructive/40 bg-destructive/5",
        isAnchor && "border-primary/40 ring-1 ring-primary/20"
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {stat.title}
        </CardTitle>
        {stat.isAlert ? (
          <AlertTriangle className="h-4 w-4 text-destructive" aria-label="Perlu perhatian" />
        ) : null}
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold tabular-nums tracking-tight">{stat.value}</p>
        {stat.delta ? <StatDelta delta={stat.delta} /> : null}
      </CardContent>
    </Card>
  )
}

function StatDelta({ delta }: { delta: NonNullable<Stat["delta"]> }) {
  const Icon = delta.direction === "up" ? ArrowUp : ArrowDown
  const sign = delta.direction === "up" ? "+" : "−"

  return (
    <p
      className={cn(
        "mt-1 flex items-center gap-1 text-xs",
        delta.isPositive
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-destructive"
      )}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      <span className="tabular-nums font-medium">
        {sign}
        {delta.value}%
      </span>
      <span className="sr-only">
        {delta.isPositive ? "membaik" : "memburuk"} — {delta.direction === "up" ? "naik" : "turun"} {delta.value} persen dari periode lalu
      </span>
      <span className="text-muted-foreground">vs bulan lalu</span>
    </p>
  )
}

export type { StatCardProps }
