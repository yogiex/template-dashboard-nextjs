import type { LucideIcon } from "lucide-react"
import { Inbox } from "lucide-react"
import type { ReactNode } from "react"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "cn"

type EmptyStateProps = {
  title: string
  description?: ReactNode
  icon?: LucideIcon
  action?: ReactNode
  className?: string
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className,
}: EmptyStateProps) {
  return (
    <Card
      role="status"
      aria-live="polite"
      className={cn("items-center justify-center py-10 text-center", className)}
    >
      <CardContent className="flex max-w-md flex-col items-center px-6 text-center">
        <div className="mb-4 flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="size-5" aria-hidden="true" />
        </div>
        <h2 className="text-base font-medium">{title}</h2>
        {description ? (
          <div className="mt-1 text-sm text-pretty text-muted-foreground">
            {description}
          </div>
        ) : null}
        {action ? <div className="mt-4 flex items-center gap-2">{action}</div> : null}
      </CardContent>
    </Card>
  )
}

export type { EmptyStateProps }
