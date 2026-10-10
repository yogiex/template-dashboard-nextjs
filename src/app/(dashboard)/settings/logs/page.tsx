import type { Metadata } from "next";
import { Activity, AlertTriangle, Database, ShieldCheck } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { LOG_MANAGEMENT_PAGE_CONFIG } from "@/config/log-management";
import { MetricCard } from "@/features/observability/components/metric-card";
import { IntegrityPanel } from "@/features/log-management/components/integrity-panel";
import { LogAnalysisPanel } from "@/features/log-management/components/log-analysis-panel";
import { LogForecastTable } from "@/features/log-management/components/log-forecast-table";
import { LogSectionNav } from "@/features/log-management/components/log-section-nav";
import {
  OverviewSummary,
  RecentLogTable,
} from "@/features/log-management/components/log-overview";
import { getForecastInventory, getLogOverview } from "@/features/log-management/service";
import { getStorageCapacity } from "@/features/log-management/lib/storage";
import { StorageCapacityCard } from "@/features/log-management/components/retention-matrix";
import { verifyAuditIntegrity } from "@/features/audit/service";
import { getLastIntegrityVerification } from "@/features/log-management/lib/schedule";

export const metadata: Metadata = {
  title: "Log Management",
  description:
    "Ringkasan inventaris log, kapasitas store, dan analisis log berbasis NIST SP 800-92.",
};

export default function LogManagementPage() {
  const config = LOG_MANAGEMENT_PAGE_CONFIG;
  const overview = getLogOverview();
  const forecast = getForecastInventory();
  const capacity = getStorageCapacity();
  // Report dihitung ulang di server, bukan diambil dari teks statis.
  const liveReport = verifyAuditIntegrity();
  const verification = getLastIntegrityVerification();

  return (
    <div className="space-y-6">
      <LogSectionNav current={config.sections.forecast.href} />

      <Alert>
        <AlertDescription>{config.mockAlert}</AlertDescription>
      </Alert>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={Database}
          label={config.kpis.entries}
          value={overview.totalEntries}
          hint={config.kpis.entriesHint}
        />
        <MetricCard
          icon={AlertTriangle}
          label={config.kpis.errors24h}
          value={overview.failed24h}
        />
        <MetricCard
          icon={Activity}
          label={config.kpis.capacity}
          value={`${overview.usedPercent}%`}
          hint={config.kpis.capacityHint}
        />
        <MetricCard
          icon={ShieldCheck}
          label={config.kpis.integrity}
          value={
            verification.lastReport === null
              ? config.integrityValueUnknown
              : verification.lastReport.brokenAtIndex === -1
                ? config.integrityValueOk
                : config.integrityValueBrokenTemplate.replace(
                    "{index}",
                    String(verification.lastReport.brokenAtIndex),
                  )
          }
          hint={config.kpis.integrityHint}
        />
      </div>

      <IntegrityPanel verification={verification} liveReport={liveReport} />

      <OverviewSummary overview={overview} />

      <LogForecastTable
        sources={forecast.sources}
        totals={{
          sourceCount: forecast.totals.sourceCount,
          estimatedDailyMB: forecast.totals.estimatedDailyMB,
          estimatedDailyGB: forecast.totals.estimatedDailyGB,
        }}
      />

      <StorageCapacityCard capacity={capacity} />

      <RecentLogTable events={overview.recent} />

      <LogAnalysisPanel analysis={overview.analysis} />
    </div>
  );
}
