import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { buildListUrl } from "@/lib/search-params"
import type { UserListResult, UserQuery } from "@/features/user/types"

export function DataTablePagination({ result, query }: { result: UserListResult; query: UserQuery }) {
  const currentParams = { q: query.q, pageSize: query.pageSize, role: query.role, sort: query.sort, dir: query.dir }
  const previous = result.page > 1 ? result.page - 1 : undefined
  const next = result.page < result.totalPages ? result.page + 1 : undefined
  const first = result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1
  const last = Math.min(result.page * result.pageSize, result.total)

  return <nav aria-label="Paginasi tabel" className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><p>{result.total === 0 ? "Tidak ada data" : `${first}–${last} dari ${result.total} user`}</p><div className="flex items-center gap-2">{previous ? <Button variant="outline" size="sm" render={<Link href={buildListUrl("/users", currentParams, { page: previous })} rel="prev" />}><ChevronLeft aria-hidden="true" />Sebelumnya</Button> : <Button variant="outline" size="sm" disabled><ChevronLeft aria-hidden="true" />Sebelumnya</Button>}<span className="tabular-nums px-1" aria-current="page">{result.page} / {result.totalPages}</span>{next ? <Button variant="outline" size="sm" render={<Link href={buildListUrl("/users", currentParams, { page: next })} rel="next" />}>Berikutnya<ChevronRight aria-hidden="true" /></Button> : <Button variant="outline" size="sm" disabled>Berikutnya<ChevronRight aria-hidden="true" /></Button>}</div></nav>
}
