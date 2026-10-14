"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "cn";

interface PaginationProps {
  page: number;
  totalPages: number;
  buildUrl: (page: number) => string;
}

export function DataTablePagination({ page, totalPages, buildUrl }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        Halaman {page} dari {totalPages}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link
            href={buildUrl(page - 1)}
            className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Prev
          </Link>
        ) : null}
        {page < totalPages ? (
          <Link
            href={buildUrl(page + 1)}
            className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
          >
            Next
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
