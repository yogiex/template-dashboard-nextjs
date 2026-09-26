import Link from "next/link"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"

import { EmptyState } from "@/components/custom/empty-state"
import { buildListUrl } from "@/lib/search-params"
import { DataTablePagination } from "@/features/user/components/data-table-pagination"
import { UserRowActions } from "@/features/user/components/user-row-actions"
import type { UserListResult, UserQuery } from "@/features/user/types"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export function UserTable({ result, query }: { result: UserListResult; query: UserQuery }) {
  if (result.data.length === 0) {
    return <EmptyState title="Tidak ada user" description="Coba ubah kata kunci atau filter Anda." />
  }

  const currentParams = {
    q: query.q,
    page: query.page,
    pageSize: query.pageSize,
    role: query.role,
    sort: query.sort,
    dir: query.dir,
  }

  const sortLink = (field: UserQuery["sort"], label: string) => {
    const active = query.sort === field
    const nextDir = active && query.dir === "asc" ? "desc" : "asc"
    const Icon = !active ? ArrowUpDown : query.dir === "asc" ? ArrowUp : ArrowDown
    return <Link href={buildListUrl("/users", currentParams, { sort: field, dir: nextDir })} className="inline-flex items-center gap-1 hover:text-foreground" aria-label={`Urutkan berdasarkan ${label}`}>{label}<Icon className="h-3.5 w-3.5" aria-hidden="true" /></Link>
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader><TableRow><TableHead>{sortLink("name", "Nama")}</TableHead><TableHead>{sortLink("email", "Email")}</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead>{sortLink("createdAt", "Dibuat")}</TableHead><TableHead className="w-12"><span className="sr-only">Aksi</span></TableHead></TableRow></TableHeader>
          <TableBody>{result.data.map((user) => <TableRow key={user.id}><TableCell className="font-medium">{user.name}</TableCell><TableCell className="text-muted-foreground">{user.email}</TableCell><TableCell><span className="inline-flex rounded-full border px-2 py-0.5 text-xs font-medium">{user.role}</span></TableCell><TableCell>{user.status}</TableCell><TableCell>{user.createdAt.toLocaleDateString("id-ID")}</TableCell><TableCell><UserRowActions user={user} /></TableCell></TableRow>)}</TableBody>
        </Table>
      </div>
      <DataTablePagination result={result} query={query} />
    </div>
  )
}
