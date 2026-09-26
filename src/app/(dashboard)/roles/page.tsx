import { Info, UsersRound } from "lucide-react"
import type { Metadata } from "next"

import { EmptyState } from "@/components/custom/empty-state"
import { PageShell } from "@/components/layout/page-shell"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { PermissionMatrix } from "@/features/role/components/permission-matrix"
import { RoleList } from "@/features/role/components/role-list"
import { getRoles } from "@/features/role/service"

export const metadata: Metadata = { title: "Roles" }

export default async function RolesPage() {
  const { roles } = await getRoles()

  return (
    <PageShell title="Roles" description="Peran dan hak akses pengguna aplikasi.">
      <Alert className="mb-6">
        <Info aria-hidden="true" />
        <AlertTitle>Frontend-only reference</AlertTitle>
        <AlertDescription>
          Definisi role berasal dari mock service. Hubungkan backend RBAC melalui service ini untuk enforcement nyata.
        </AlertDescription>
      </Alert>
      {roles.length === 0 ? (
        <EmptyState icon={UsersRound} title="Belum ada role" description="Definisi role akan tampil di sini." />
      ) : (
        <div className="space-y-8">
          <RoleList roles={roles} />
          <PermissionMatrix roles={roles} />
        </div>
      )}
    </PageShell>
  )
}
