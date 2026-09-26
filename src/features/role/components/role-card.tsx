import { ShieldCheck, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Role } from "@/features/role/schema"

export function RoleCard({ role }: { role: Role }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
          {role.name}
        </CardTitle>
        <Badge variant="secondary" className="gap-1">
          <Users className="h-3 w-3" aria-hidden="true" />
          <span className="tabular-nums">{role.userCount}</span>
          <span className="sr-only">pengguna dengan role ini</span>
        </Badge>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{role.description}</p>
        <p className="mt-3 text-xs tabular-nums text-muted-foreground">
          {role.permissions.length} permission aktif
        </p>
      </CardContent>
    </Card>
  )
}
