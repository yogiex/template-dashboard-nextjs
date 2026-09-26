import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AUDIT_PAGE_CONFIG } from "@/config/audit-page";
import { buildListUrl } from "@/lib/search-params";

export type AuditPaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  /**
   * Query string filter aktif TANPA `page` (mis. `category=auth&action=login`).
   * Dipakai apa adanya supaya pindah halaman tidak kehilangan filter.
   */
  baseQuery: string;
};

/**
 * Isi `{token}` pada template copy dari `AUDIT_PAGE_CONFIG`. Helper lokal,
 * bukan util baru: hanya dua template di config ini yang punya token.
 */
function fillTemplate(
  template: string,
  tokens: Record<string, string | number>,
): string {
  return Object.entries(tokens).reduce(
    (text, [token, value]) => text.replaceAll(`{${token}}`, String(value)),
    template,
  );
}

/**
 * Paginasi audit log. Server Component murni: tautan `next/link` supaya
 * navigasi terjadi lewat RSC, tanpa menambah client boundary.
 */
export function AuditPagination({
  page,
  totalPages,
  total,
  pageSize,
  baseQuery,
}: AuditPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const filters: Record<string, string> = {};

  for (const [key, value] of new URLSearchParams(baseQuery)) {
    filters[key] = value;
  }

  // `page` selalu ditulis ulang oleh tautan di bawah; nilai lama tidak boleh bocor.
  delete filters.page;

  const hrefForPage = (target: number): string =>
    buildListUrl(
      AUDIT_PAGE_CONFIG.basePath,
      filters,
      target === 1 ? {} : { page: target },
    );

  const previous = page > 1 ? page - 1 : null;
  const next = page < totalPages ? page + 1 : null;
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const { pagination } = AUDIT_PAGE_CONFIG;

  return (
    <nav
      aria-label={pagination.navLabel}
      className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"
    >
      <p>
        {fillTemplate(pagination.summary, { start: first, end: last, total })}
      </p>
      <div className="flex items-center gap-2">
        {previous ? (
          <Button
            variant="outline"
            size="sm"
            render={<Link href={hrefForPage(previous)} rel="prev" />}
          >
            <ChevronLeftIcon aria-hidden="true" />
            {pagination.previous}
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            <ChevronLeftIcon aria-hidden="true" />
            {pagination.previous}
          </Button>
        )}
        <span className="px-1 tabular-nums" aria-current="page">
          {fillTemplate(pagination.pagePosition, { page, totalPages })}
        </span>
        {next ? (
          <Button
            variant="outline"
            size="sm"
            render={<Link href={hrefForPage(next)} rel="next" />}
          >
            {pagination.next}
            <ChevronRightIcon aria-hidden="true" />
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            {pagination.next}
            <ChevronRightIcon aria-hidden="true" />
          </Button>
        )}
      </div>
    </nav>
  );
}
