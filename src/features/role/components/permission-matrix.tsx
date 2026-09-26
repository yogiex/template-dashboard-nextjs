import { Fragment } from "react"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PERMISSION_CATALOG } from "@/config/roles"
import { PermissionToggle } from "@/features/role/components/permission-toggle"
import type { Role } from "@/features/role/schema"

export function PermissionMatrix({ roles }: { roles: Role[] }) {
  if (roles.length === 0) return null

  const permissionMap = new Map(roles.map((role) => [role.id, new Set(role.permissions)]))

  return (
    <section aria-label="Matriks izin akses">
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="min-w-48">Izin</TableHead>
              {roles.map((role) => <TableHead key={role.id} className="text-center">{role.name}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {PERMISSION_CATALOG.map((group) => (
              <Fragment key={group.resource}>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableCell colSpan={roles.length + 1} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.label}
                  </TableCell>
                </TableRow>
                {group.permissions.map((permission) => (
                  <TableRow key={permission.id}>
                    <TableCell>
                      <p className="text-sm font-medium">{permission.action}</p>
                      <p className="text-xs text-muted-foreground">{permission.description}</p>
                    </TableCell>
                    {roles.map((role) => (
                      <TableCell key={role.id} className="text-center">
                        <PermissionToggle
                          granted={permissionMap.get(role.id)?.has(permission.id) ?? false}
                          roleLabel={role.name}
                          permissionLabel={permission.action}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Daftar izin bersifat referensi — ubah katalog di <code className="font-mono">src/config/roles.ts</code>.
      </p>
    </section>
  )
}
