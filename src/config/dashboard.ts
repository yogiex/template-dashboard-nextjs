import type { Stat } from "@/features/dashboard/schema"

export interface StatMeta {
  id: string
  isAnchor?: boolean
}

export const dashboardStatsConfig: StatMeta[] = [
  { id: "revenue", isAnchor: true },
  { id: "users" },
  { id: "orders" },
  { id: "churn" },
]

export const statIconMap = {
  revenue: "wallet",
  users: "users",
  orders: "shopping-cart",
  churn: "alert-triangle",
} as const

export type StatIconName = keyof typeof statIconMap

export type DashboardStat = Stat & { isAnchor: boolean }
