import { Skeleton } from "@/components/ui/skeleton"

export default function AuditLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-56" />
      </div>

      <Skeleton className="h-[420px] w-full rounded-lg" />

      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-8 w-48" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </div>
    </div>
  )
}
