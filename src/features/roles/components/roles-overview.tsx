import { KeyRound, ShieldCheck, UserRound } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { RoleSummary } from "@/features/roles/schema"
import { cn } from "cn"

const roleTone: Record<
  RoleSummary["id"],
  "default" | "secondary" | "outline"
> = {
  admin: "default",
  editor: "secondary",
  viewer: "outline",
}

export type RolesOverviewProps = {
  roles: readonly RoleSummary[]
  className?: string
}

export function RolesOverview({ roles, className }: RolesOverviewProps) {
  return (
    <section aria-labelledby="roles-overview-title" className={cn("space-y-4", className)}>
      <div className="space-y-1">
        <h2 id="roles-overview-title" className="text-lg font-semibold tracking-tight">
          Daftar role
        </h2>
        <p className="text-sm text-muted-foreground">
          Ringkasan role dan cakupan aksesnya dalam workspace.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {roles.map((role) => (
          <Card key={role.id} className="min-w-0">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ShieldCheck className="size-5" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle>{role.name}</CardTitle>
                    <CardDescription className="mt-1 text-pretty">
                      {role.description}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant={roleTone[role.id]}>{role.id}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 border-t pt-4">
                <div className="flex items-center gap-2">
                  <UserRound className="size-4 text-muted-foreground" aria-hidden="true" />
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
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
