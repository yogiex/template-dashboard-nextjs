import { AlertTriangle, RotateCcw } from "lucide-react"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "cn"

type ErrorStateProps = {
  title?: string
  description?: ReactNode
  onRetry?: () => void
  retryLabel?: string
  retrying?: boolean
  className?: string
}

export function ErrorState({
  title = "Terjadi kesalahan",
  description = "Data tidak dapat dimuat saat ini. Silakan coba kembali.",
  onRetry,
  retryLabel = "Coba lagi",
  retrying = false,
  className,
}: ErrorStateProps) {
  return (
    <Card
      role="alert"
      aria-live="assertive"
      className={cn("border-destructive/30 py-10 text-center", className)}
    >
      <CardContent className="mx-auto flex max-w-md flex-col items-center px-6 text-center">
        <div className="mb-4 flex size-11 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="size-5" aria-hidden="true" />
        </div>
        <h2 className="text-base font-medium text-destructive">{title}</h2>
        {description ? (
          <div className="mt-1 text-sm text-pretty text-muted-foreground">
            {description}
          </div>
        ) : null}
        {onRetry ? (
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={onRetry}
            disabled={retrying}
            aria-busy={retrying}
          >
            <RotateCcw aria-hidden="true" />
            {retrying ? "Memuat ulang" : retryLabel}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}

export type { ErrorStateProps }
