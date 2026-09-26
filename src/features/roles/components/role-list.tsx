import { ShieldOff } from "lucide-react"

import { EmptyState } from "@/components/custom/empty-state"
import { RoleCard } from "@/features/roles/components/role-card"
import type {
  PermissionDefinition,
  RolePermissionMatrix,
  RoleSummary,
} from "@/features/roles/schema"
import { cn } from "cn"

export type RoleListProps = {
  roles: readonly RoleSummary[]
  permissions: readonly PermissionDefinition[]
  matrix: RolePermissionMatrix
  readOnly?: boolean
  className?: string
}

export function RoleList({
  roles,
  permissions,
  matrix,
  readOnly = true,
  className,
}: RoleListProps) {
  if (roles.length === 0) {
    return (
      <EmptyState
        icon={ShieldOff}
        title="Belum ada role"
        description="Role yang tersedia akan ditampilkan di sini."
        className={className}
      />
    )
  }

  return (
    <section aria-label="Daftar role" className={cn("grid gap-4 md:grid-cols-2 xl:grid-cols-3", className)}>
      {roles.map((role) => (
        <RoleCard
          key={role.id}
          role={role}
          permissions={permissions}
          matrix={matrix}
          readOnly={readOnly}
        />
      ))}
    </section>
  )
}
