import {
  dashboardStatsSchema,
  type DashboardStats,
} from "@/features/dashboard/schema"

const MOCK_STATS: DashboardStats = {
  stats: [
    {
      id: "revenue",
      title: "Revenue",
      value: "Rp 45,2jt",
      delta: { value: 12.5, direction: "up", isPositive: true },
      isAlert: false,
    },
    {
      id: "users",
      title: "Pengguna Aktif",
      value: "1.204",
      delta: { value: 8.2, direction: "up", isPositive: true },
      isAlert: false,
    },
    {
      id: "orders",
      title: "Pesanan",
      value: "342",
      delta: { value: 1.4, direction: "down", isPositive: true },
      isAlert: false,
    },
    {
      id: "churn",
      title: "Churn Rate",
      value: "2,1%",
      delta: { value: 0.6, direction: "up", isPositive: false },
      isAlert: true,
    },
  ],
  revenue: [
    { month: "Jul", revenue: 38000000, target: 35000000 },
    { month: "Agu", revenue: 41000000, target: 40000000 },
    { month: "Sep", revenue: 39500000, target: 40000000 },
    { month: "Okt", revenue: 44000000, target: 42000000 },
    { month: "Nov", revenue: 42800000, target: 43000000 },
    { month: "Des", revenue: 45200000, target: 44000000 },
  ],
  traffic: [
    { source: "Direct", visits: 4520 },
    { source: "Organic", visits: 3210 },
    { source: "Referral", visits: 2310 },
    { source: "Social", visits: 1420 },
  ],
  activities: [
    { id: "act_01", userName: "Budi Santoso", action: "menghapus", target: "Produk #231", createdAt: new Date(Date.now() - 2 * 60_000) },
    { id: "act_02", userName: "Sari Wulandari", action: "memperbarui", target: "Halaman Beranda", createdAt: new Date(Date.now() - 60 * 60_000) },
    { id: "act_03", userName: "Andi Pratama", action: "mendaftar sebagai", target: "Viewer", createdAt: new Date(Date.now() - 3 * 60 * 60_000) },
    { id: "act_04", userName: "Dewi Lestari", action: "membuat", target: "Laporan Penjualan November", createdAt: new Date(Date.now() - 5 * 60 * 60_000) },
    { id: "act_05", userName: "Rizky Hidayat", action: "mengundang", target: "intan@acme.co", createdAt: new Date(Date.now() - 8 * 60 * 60_000) },
  ],
}

const EMPTY_STATS: DashboardStats = {
  stats: [],
  revenue: [],
  traffic: [],
  activities: [],
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const result = dashboardStatsSchema.safeParse(MOCK_STATS)

  if (!result.success) {
    const { logger } = await import("@/lib/logger")
    logger.error("dashboard.stats.invalid", result.error)
    return EMPTY_STATS
  }

  return result.data
}
