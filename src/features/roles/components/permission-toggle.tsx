"use client"

import { useId } from "react"

import { Checkbox } from "@/components/ui/checkbox"
import type { PermissionDefinition } from "@/features/roles/schema"
import { cn } from "cn"

export type PermissionToggleProps = {
  permission: PermissionDefinition
  checked: boolean
  onCheckedChange?: (checked: boolean) => void
  readOnly?: boolean
  disabled?: boolean
  className?: string
}

export function PermissionToggle({
  permission,
  checked,
  onCheckedChange,
  readOnly = true,
  disabled = false,
  className,
}: PermissionToggleProps) {
  const labelId = useId()
  const descriptionId = useId()
  const isDisabled = disabled || readOnly || onCheckedChange === undefined

  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 rounded-lg border p-3",
        isDisabled && "bg-muted/30",
        className,
      )}
    >
      <div className="min-w-0 space-y-0.5">
        <p id={labelId} className="text-sm font-medium">
          {permission.name}
        </p>
        <p id={descriptionId} className="text-xs text-pretty text-muted-foreground">
          {permission.description}
        </p>
      </div>
      <Checkbox
        checked={checked}
        disabled={isDisabled}
        onCheckedChange={onCheckedChange}
        aria-labelledby={labelId}
        aria-describedby={descriptionId}
        aria-label={permission.name}
        className="mt-0.5"
      />
    </div>
  )
}
