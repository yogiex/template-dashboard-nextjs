import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="space-y-6" role="status" aria-label="Memuat dashboard">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full rounded-lg" />
      <span className="sr-only">Memuat dashboard</span>
    </div>
  )
}
