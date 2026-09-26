import { Skeleton } from "@/components/ui/skeleton"

export default function RolesLoading() {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-36 w-full rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-96 w-full rounded-lg" />
    </div>
  )
}
