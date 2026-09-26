import { Check, Minus } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type {
  PermissionDefinition,
  RoleDefinition,
  RolePermissionMatrix,
} from "@/features/roles/schema"
import { cn } from "cn"

export type PermissionsMatrixProps = {
  permissions: readonly PermissionDefinition[]
  roles: readonly RoleDefinition[]
  matrix: RolePermissionMatrix
  className?: string
}

export function PermissionsMatrix({
  permissions,
  roles,
  matrix,
  className,
}: PermissionsMatrixProps) {
  return (
    <Card className={cn("min-w-0", className)}>
      <CardHeader>
        <CardTitle>Matriks izin</CardTitle>
        <CardDescription>
          Referensi izin yang tersedia untuk setiap role. Tampilan bersifat baca saja.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table className="min-w-[680px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[320px]">Izin</TableHead>
              {roles.map((role) => (
                <TableHead key={role.id} className="text-center">
                  {role.name}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {permissions.map((permission) => (
              <TableRow key={permission.key}>
                <TableCell>
                  <div className="space-y-0.5">
                    <p className="font-medium">{permission.name}</p>
                    <p className="text-xs whitespace-normal text-muted-foreground">
                      {permission.description}
                    </p>
                  </div>
                </TableCell>
                {roles.map((role) => {
                  const allowed = matrix[role.id][permission.key]

                  return (
                    <TableCell key={role.id} className="text-center">
                      <span
                        className={cn(
                          "mx-auto flex size-7 items-center justify-center rounded-full",
                          allowed
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {allowed ? (
                          <Check className="size-4" aria-hidden="true" />
                        ) : (
                          <Minus className="size-4" aria-hidden="true" />
                        )}
                        <span className="sr-only">
                          {allowed ? "Diizinkan" : "Tidak diizinkan"}
                        </span>
                      </span>
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
