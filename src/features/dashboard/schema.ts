import { z } from "zod"

export const statDeltaSchema = z.object({
  value: z.number(),
  direction: z.enum(["up", "down"]),
  isPositive: z.boolean(),
})

export type StatDelta = z.infer<typeof statDeltaSchema>

export const statSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(40),
  value: z.string().min(1).max(20),
  delta: statDeltaSchema.optional(),
  isAlert: z.boolean().default(false),
})

export type Stat = z.infer<typeof statSchema>

export const revenuePointSchema = z.object({
  month: z.string().min(1).max(10),
  revenue: z.number().nonnegative(),
  target: z.number().nonnegative(),
})

export type RevenuePoint = z.infer<typeof revenuePointSchema>

export const trafficSourceSchema = z.object({
  source: z.string().min(1).max(30),
  visits: z.number().nonnegative(),
})

export type TrafficSource = z.infer<typeof trafficSourceSchema>

export const activitySchema = z.object({
  id: z.string().min(1),
  userName: z.string().min(1).max(100),
  action: z.string().min(1).max(60),
  target: z.string().min(1).max(100),
  createdAt: z.date(),
})

export type Activity = z.infer<typeof activitySchema>

export const dashboardStatsSchema = z.object({
  stats: z.array(statSchema).max(4),
  revenue: z.array(revenuePointSchema),
  traffic: z.array(trafficSourceSchema).max(5),
  activities: z.array(activitySchema).max(10),
})

export type DashboardStats = z.infer<typeof dashboardStatsSchema>
