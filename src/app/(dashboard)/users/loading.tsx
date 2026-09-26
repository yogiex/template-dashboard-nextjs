import { Skeleton } from "@/components/ui/skeleton"

export default function UsersLoading() {
  return <div className="space-y-6"><div className="space-y-2"><Skeleton className="h-8 w-40" /><Skeleton className="h-4 w-64" /></div><div className="flex gap-2"><Skeleton className="h-9 w-full max-w-xs" /><Skeleton className="h-9 w-40" /></div><div className="rounded-lg border"><Skeleton className="h-10 w-full rounded-none" />{Array.from({ length: 10 }).map((_, index) => <Skeleton key={index} className="h-12 w-full rounded-none border-t" />)}</div></div>
}
