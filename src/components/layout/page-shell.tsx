import type { ReactNode } from "react"

import { cn } from "cn"

type PageShellProps = {
  title: string
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
}

export function PageShell({
  title,
  description,
  actions,
  children,
  className,
}: PageShellProps) {
  return (
    <main className={cn("flex min-w-0 flex-1 flex-col gap-6 p-4 md:p-6", className)}>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">
            {title}
          </h1>
          {description ? (
            <div className="text-sm text-pretty text-muted-foreground">
              {description}
            </div>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </header>
      <div className="min-w-0 flex-1">{children}</div>
    </main>
  )
}

export type { PageShellProps }
