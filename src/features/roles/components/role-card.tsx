import { KeyRound, ShieldCheck, UsersRound } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PermissionToggle } from "@/features/roles/components/permission-toggle"
import type {
  PermissionDefinition,
  RolePermissionMatrix,
  RoleSummary,
} from "@/features/roles/schema"
import { cn } from "cn"

const roleTone: Record<
  RoleSummary["id"],
  "default" | "secondary" | "outline"
> = {
  admin: "default",
  editor: "secondary",
  viewer: "outline",
}

export type RoleCardProps = {
  role: RoleSummary
  permissions: readonly PermissionDefinition[]
  matrix: RolePermissionMatrix
  readOnly?: boolean
  className?: string
}

export function RoleCard({
  role,
  permissions,
  matrix,
  readOnly = true,
  className,
}: RoleCardProps) {
  return (
    <Card
      size="sm"
      className={cn("min-w-0", className)}
      aria-label={`Role ${role.name}`}
    >
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>{role.name}</CardTitle>
              <Badge variant={roleTone[role.id]}>{role.id}</Badge>
            </div>
            <CardDescription className="mt-1 text-pretty">
              {role.description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 border-b pb-4">
          <div className="flex items-center gap-2">
            <UsersRound className="size-4 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-xs text-muted-foreground">Pengguna</p>
              <p className="text-sm font-medium tabular-nums">{role.userCount}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <KeyRound className="size-4 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-xs text-muted-foreground">Izin aktif</p>
              <p className="text-sm font-medium tabular-nums">
                {role.permissions.length}
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-2" aria-label={`Izin role ${role.name}`}>
          {permissions.length > 0 ? (
            permissions.map((permission) => (
              <PermissionToggle
                key={permission.key}
                permission={permission}
                checked={matrix[role.id][permission.key]}
                readOnly={readOnly}
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              Belum ada izin yang dikonfigurasi.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
