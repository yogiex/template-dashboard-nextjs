import type { Metadata } from "next";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { AUDIT_PAGE_CONFIG } from "@/config/audit-page";
import { AuditFilters } from "@/features/audit/components/audit-filters";
import { AuditPagination } from "@/features/audit/components/audit-pagination";
import { AuditTable } from "@/features/audit/components/audit-table";
import { queryAuditEvents } from "@/features/audit/service";

export const metadata: Metadata = {
  title: AUDIT_PAGE_CONFIG.title,
  description: AUDIT_PAGE_CONFIG.description,
  robots: { index: false, follow: false },
};

/**
 * Server Component di bawah `(dashboard)/settings/layout.tsx`, jadi TIDAK memakai
 * `PageShell` lagi — layout tersebut sudah menyediakan `<main>` dan h1 "Settings".
 * `force-dynamic` wajib karena store audit in-memory berubah tiap request.
 */
export const dynamic = "force-dynamic";

type AuditSettingsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Kunci yang boleh diteruskan ke query store; `page` ditangani terpisah. */
const QUERY_KEYS = [
  ...AUDIT_PAGE_CONFIG.filterKeys,
  "from",
  "to",
  "page",
  "pageSize",
] as const;

function firstValue(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default async function AuditSettingsPage({ searchParams }: AuditSettingsPageProps) {
  const resolved = await searchParams;

  // Hanya normalisasi string mentah: coagulasi angka dan batas nilainya
  // tetap milik `auditQuerySchema` di dalam `queryAuditEvents`, sehingga
  // `?page=abc` jatuh ke default, bukan melempar.
  const query: Record<string, string> = {};
  for (const key of QUERY_KEYS) {
    const value = firstValue(resolved[key]);
    if (value !== "") query[key] = value;
  }

  const { items, total, page, pageSize, totalPages } = queryAuditEvents(query);

  // `baseQuery` hanya filter aktif, tanpa `page`, supaya link pagination
  // tidak mengulang halaman yang sama dan tidak menumpuk query string.
  const baseQuery = new URLSearchParams(
    Object.entries(query).filter(([key]) => key !== "page" && key !== "pageSize"),
  ).toString();

  return (
    <div className="space-y-6">
      <Alert>
        <AlertDescription>{AUDIT_PAGE_CONFIG.description}</AlertDescription>
      </Alert>

      <AuditFilters
        initialCategory={query.category ?? ""}
        initialSeverity={query.severity ?? ""}
        initialResult={query.result ?? ""}
        initialAction={query.action ?? ""}
        initialActorId={query.actorId ?? ""}
      />

      <AuditTable events={items} />

      <AuditPagination
        page={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        baseQuery={baseQuery}
      />
    </div>
  );
}
