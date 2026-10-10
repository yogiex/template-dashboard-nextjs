import type { Metadata } from "next"
import { Suspense } from "react"
import { PageShell } from "@/components/layout/page-shell"
import { CreateUserButton } from "@/features/user/components/create-user-button"
import { DataTableToolbar } from "@/features/user/components/data-table-toolbar"
import { UserTable } from "@/features/user/components/user-table"
import { userQuerySchema } from "@/features/user/schema"
import { getUsers } from "@/features/user/service"

export const metadata: Metadata = { title: "Users" }

function UsersFallback() {
  return <PageShell title="Users" description="Kelola pengguna aplikasi."><div className="space-y-4"><div className="h-10 w-full animate-pulse rounded bg-muted" /></div></PageShell>
}

export default function UsersPage() {
  return <Suspense fallback={<UsersFallback />}><UsersContent /></Suspense>
}

async function UsersContent() {
  const query = userQuerySchema.parse({})
  const result = await getUsers(query)

  return <PageShell title="Users" description="Kelola pengguna aplikasi." actions={<CreateUserButton />}><div className="space-y-4"><DataTableToolbar basePath="/users" initialQuery={query.q} initialRole={query.role} /><UserTable result={result} query={query} /></div></PageShell>
}
