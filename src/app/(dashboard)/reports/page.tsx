import type { Metadata } from "next";

import { PageShell } from "@/components/layout/page-shell";
import { REPORTS_CONFIG } from "@/config/reports";
import { ReportsBuilder } from "@/features/reports/components/reports-builder";

export const metadata: Metadata = { title: REPORTS_CONFIG.title };

export default function ReportsPage() {
  return (
    <PageShell title={REPORTS_CONFIG.title} description={REPORTS_CONFIG.description}>
      <div className="max-w-6xl">
        <ReportsBuilder />
      </div>
    </PageShell>
  );
}
