import type { Metadata } from "next";
import { Suspense } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { AUDIT_PAGE_CONFIG } from "@/config/audit-page";
import { AuditFilters } from "@/features/audit/components/audit-filters";
import { AuditPagination } from "@/features/audit/components/audit-pagination";
import { AuditEnhancements } from "@/features/audit/components/audit-enhancements";
import { AuditTable } from "@/features/audit/components/audit-table";
import { queryAuditEvents, verifyAuditIntegrity } from "@/features/audit/service";

export const metadata: Metadata = {
  title: AUDIT_PAGE_CONFIG.title,
  description: AUDIT_PAGE_CONFIG.description,
  robots: { index: false, follow: false },
};

function AuditSettingsFallback() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-full animate-pulse rounded bg-muted" />
    </div>
  );
}

export default function AuditSettingsPage() {
  return (
    <Suspense fallback={<AuditSettingsFallback />}>
      <AuditSettingsContent />
    </Suspense>
  );
}

async function AuditSettingsContent() {
  const query: Record<string, string> = {};
  const { items, total, page, pageSize, totalPages } = queryAuditEvents(query);

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

      <AuditEnhancements events={items} report={verifyAuditIntegrity()} />

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
