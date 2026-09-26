import type { Metadata } from "next"
import { PageShell } from "@/components/layout/page-shell"
import { CreateUserButton } from "@/features/user/components/create-user-button"
import { DataTableToolbar } from "@/features/user/components/data-table-toolbar"
import { UserTable } from "@/features/user/components/user-table"
import { userQuerySchema } from "@/features/user/schema"
import { getUsers } from "@/features/user/service"

export const metadata: Metadata = { title: "Users" }

type UsersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const resolved = await searchParams
  const flat = Object.fromEntries(Object.entries(resolved).map(([key, value]) => [key, Array.isArray(value) ? (value[0] ?? "") : (value ?? "")]))
  const parsed = userQuerySchema.safeParse(flat)
  const query = parsed.success ? parsed.data : userQuerySchema.parse({})
  const result = await getUsers(query)

  return <PageShell title="Users" description="Kelola pengguna aplikasi." actions={<CreateUserButton />}><div className="space-y-4"><DataTableToolbar basePath="/users" initialQuery={query.q} initialRole={query.role} /><UserTable result={result} query={query} /></div></PageShell>
}
