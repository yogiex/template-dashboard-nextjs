import type { Metadata } from "next"
import { Plus } from "lucide-react"

import { EmptyState } from "@/components/custom/empty-state"
import { PageShell } from "@/components/layout/page-shell"
import { Button } from "@/components/ui/button"
import { logger } from "@/lib/logger"
import { parseListParams } from "@/lib/search-params"

export const metadata: Metadata = {
  title: "Users",
}

type UsersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function UsersPage({
  searchParams,
}: UsersPageProps) {
  const params = await parseListParams(searchParams)

  if (params.page > 1 || params.q) {
    logger.debug("users.list.params", {
      page: params.page,
      q: params.q,
    })
  }

  return (
    <PageShell
      title="Users"
      description="Kelola pengguna aplikasi."
      actions={
        <Button size="sm" disabled>
          <Plus aria-hidden="true" />
          Tambah user
        </Button>
      }
    >
      {params.q ? (
        <EmptyState
          title={`Tidak ada hasil untuk "${params.q}"`}
          description="Coba kata kunci lain atau hapus filter pencarian."
        />
      ) : (
        <EmptyState
          title="Belum ada user"
          description="Fitur manajemen user dibangun di Sprint 3 (DataTable)."
        />
      )}
    </PageShell>
  )
}
