"use client"

import { Check, Minus } from "lucide-react"

import { cn } from "cn"

export type PermissionToggleProps = {
  granted: boolean
  roleLabel: string
  permissionLabel: string
}

export function PermissionToggle({ granted, roleLabel, permissionLabel }: PermissionToggleProps) {
  const label = granted
    ? `${roleLabel}: boleh ${permissionLabel}`
    : `${roleLabel}: tidak boleh ${permissionLabel}`

  return (
    <span
      role="img"
      aria-label={label}
      className={cn(
        "mx-auto flex h-6 w-6 items-center justify-center rounded-full",
        granted ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground/40",
      )}
    >
      {granted ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Minus className="h-3.5 w-3.5" aria-hidden="true" />}
    </span>
  )
}
