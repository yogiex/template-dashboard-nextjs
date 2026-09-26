import { RoleCard } from "@/features/role/components/role-card"
import type { Role } from "@/features/role/schema"

export function RoleList({ roles }: { roles: Role[] }) {
  if (roles.length === 0) return null

  return (
    <section aria-label="Daftar peran" className="grid gap-4 md:grid-cols-3">
      {roles.map((role) => <RoleCard key={role.id} role={role} />)}
    </section>
  )
}
