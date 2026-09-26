import type { Metadata } from "next";
import { Activity, AlertTriangle, Clock, Users } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/custom/empty-state";
import { BUSINESS_FUNNEL_STEPS } from "@/config/slo";
import { OBSERVABILITY_PAGE_CONFIG } from "@/config/observability";
import { ActivityHeatmap } from "@/features/observability/components/activity-heatmap";
import { AlertRulesTable } from "@/features/observability/components/alert-rules-table";
import { ErrorBudgetCard } from "@/features/observability/components/error-budget-card";
import { GoldenSignalsCard } from "@/features/observability/components/golden-signals-card";
import { MetricCard } from "@/features/observability/components/metric-card";
import { ObservabilityRefreshButton } from "@/features/observability/components/observability-refresh-button";
import { OBSERVABILITY_UI_COPY } from "@/config/observability-ui";
import { SaturationCard } from "@/features/observability/components/saturation-card";
import { SeedDemoButton } from "@/features/observability/components/seed-demo-button";
import { SloTable } from "@/features/observability/components/slo-table";
import { StoreHealthCard } from "@/features/observability/components/store-health-card";
import { TimeseriesChart } from "@/features/observability/components/timeseries-chart";
import { TopActionsTable } from "@/features/observability/components/top-actions-table";
import { evaluateAlerts } from "@/features/observability/lib/alerting";
import { summarizeRetention } from "@/features/observability/lib/metric-retention";
import {
  getBusinessMetricsSnapshot,
  getGoldenSignalsSnapshot,
  getObservabilitySnapshot,
  getSloSnapshot,
  getStoreHealth,
} from "@/features/observability/service";

export const metadata: Metadata = {
  title: "Observability",
  description: "Metrik aktivitas, latensi, dan penggunaan fitur.",
};

/**
 * Server Component di bawah `(dashboard)/settings/layout.tsx`, jadi TIDAK memakai
 * `PageShell` lagi — layout tersebut sudah menyediakan `<main>`.
 */
export const dynamic = "force-dynamic";

const BUSINESS_COPY = OBSERVABILITY_UI_COPY.business;
const UNMEASURED = OBSERVABILITY_UI_COPY.common.unmeasured;

/** Label funnel berasal dari config; snapshot hanya membawa key step-nya. */
function funnelLabel(step: string): string {
  return BUSINESS_FUNNEL_STEPS.find((entry) => entry.key === step)?.label ?? step;
}

export default function ObservabilitySettingsPage() {
  const config = OBSERVABILITY_PAGE_CONFIG;
  const isDemoAvailable = process.env.NODE_ENV !== "production";

  // Satu blok pembacaan data supaya semua panel berasal dari render yang sama.
  // `Date.now()` tidak dipanggil di sini: aturan `react-hooks/purity` melarang
  // impure call saat render, dan setiap fungsi sudah punya default `now`
  // sendiri. Selisihnya antar panel hanya beberapa milidetik dan tidak
  // memengaruhi window 1 jam/24 jam.
  // Tidak ada `try/catch`: fungsi service/lib ini dijamin tidak melempar, dan
  // try/catch hanya akan menyembunyikan bug.
  const snapshot = getObservabilitySnapshot();
  const { results, errorBudget } = getSloSnapshot();
  const goldenSignals = getGoldenSignalsSnapshot();
  const business = getBusinessMetricsSnapshot();
  const alerts = evaluateAlerts();
  const retention = summarizeRetention();
  const storeHealth = getStoreHealth();

  const hasAnyData = snapshot.totalEvents > 0;
  const businessRows = [
    {
      label: BUSINESS_COPY.authSuccessLabel,
      value: business.authSuccessRate,
    },
    { label: BUSINESS_COPY.mfaSuccessLabel, value: business.mfaSuccessRate },
  ];

  return (
    <div className="space-y-6">
      <Alert>
        <AlertDescription>{config.storeAlert}</AlertDescription>
      </Alert>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {isDemoAvailable ? (
          <SeedDemoButton label={config.seedLabel} />
        ) : null}
        <ObservabilityRefreshButton
          label={OBSERVABILITY_UI_COPY.common.refresh.label}
          pendingLabel={OBSERVABILITY_UI_COPY.common.refresh.pending}
          ariaLabel={OBSERVABILITY_UI_COPY.common.refresh.ariaLabel}
        />
      </div>

      {hasAnyData ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              icon={Activity}
              label={config.kpis.loginSuccess}
              value={snapshot.kpis.loginSuccess24h}
            />
            <MetricCard
              icon={AlertTriangle}
              label={config.kpis.loginFailure}
              value={snapshot.kpis.loginFailure24h}
            />
            <MetricCard
              icon={Users}
              label={config.kpis.activeActors}
              value={snapshot.kpis.activeActors1h}
            />
            <MetricCard
              icon={Clock}
              label={config.kpis.latency}
              value={`${Math.round(snapshot.latency.p95)} ms`}
              hint={config.kpis.latencyHint
                .replace("{avg}", String(Math.round(snapshot.latency.avg)))
                .replace("{count}", String(snapshot.latency.count))}
            />
          </div>

          <GoldenSignalsCard snapshot={goldenSignals} />

          <div className="grid gap-6 lg:grid-cols-2">
            <ErrorBudgetCard summary={errorBudget} />
            <SloTable results={results} />
          </div>

          <AlertRulesTable snapshot={alerts} />

          <div className="grid gap-6 lg:grid-cols-2">
            <SaturationCard saturation={goldenSignals.saturation} />
            <StoreHealthCard retention={retention} health={storeHealth} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{BUSINESS_COPY.title}</CardTitle>
                <CardDescription>{BUSINESS_COPY.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {(
                    [
                      [BUSINESS_COPY.dauLabel, business.dau],
                      [BUSINESS_COPY.mauLabel, business.mau],
                      [
                        BUSINESS_COPY.ratioLabel,
                        business.hasData
                          ? business.dauMauRatio.toFixed(2)
                          : UNMEASURED,
                      ],
                    ] as const
                  ).map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-border p-3">
                      <dt className="text-xs text-muted-foreground">{label}</dt>
                      <dd className="mt-1 text-lg font-semibold tabular-nums">{value}</dd>
                    </div>
                  ))}
                </dl>
                <dl className="grid grid-cols-2 gap-3">
                  {businessRows.map((row) => (
                    <div key={row.label} className="rounded-lg border border-border p-3">
                      <dt className="text-xs text-muted-foreground">{row.label}</dt>
                      <dd className="mt-1 text-sm font-semibold tabular-nums">
                        {row.value === null ? UNMEASURED : `${(row.value * 100).toFixed(1)}%`}
                      </dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{BUSINESS_COPY.funnelLabel}</CardTitle>
                <CardDescription>{BUSINESS_COPY.funnelHint}</CardDescription>
              </CardHeader>
              <CardContent>
                {business.funnel.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    {BUSINESS_COPY.empty}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {business.funnel.map((step) => (
                      <li key={step.step} className="flex items-center justify-between gap-2">
                        <span className="text-sm">{funnelLabel(step.step)}</span>
                        <span className="text-sm font-semibold tabular-nums">{step.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{config.heatmapTitle}</CardTitle>
              <CardDescription>{config.heatmapDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <ActivityHeatmap cells={snapshot.activityHeatmap} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{config.timeseriesTitle}</CardTitle>
              <CardDescription>{config.timeseriesDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <TimeseriesChart
                points={snapshot.loginTimeseries}
                label={config.timeseriesTitle}
                emptyLabel={config.emptyState}
              />
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{config.latencyTitle}</CardTitle>
                <CardDescription>
                  {config.eventNameLabel}: {snapshot.latency.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {(
                    [
                      ["p50", snapshot.latency.p50],
                      ["p95", snapshot.latency.p95],
                      ["p99", snapshot.latency.p99],
                      ["min", snapshot.latency.min],
                      ["max", snapshot.latency.max],
                      [config.countLabel, snapshot.latency.count],
                    ] as const
                  ).map(([label, value]) => (
                    <div key={label} className="rounded-lg border border-border p-3">
                      <dt className="text-xs text-muted-foreground">{label}</dt>
                      <dd className="mt-1 text-lg font-semibold tabular-nums">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{config.topActionsTitle}</CardTitle>
                <CardDescription>{config.topActionsDescription}</CardDescription>
              </CardHeader>
              <CardContent>
                <TopActionsTable
                  actions={snapshot.topActions}
                  nameLabel={config.eventNameLabel}
                  countLabel={config.countLabel}
                  emptyLabel={config.topActionsEmpty}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{config.countLabel}</CardTitle>
              <CardDescription>
                {config.windowLabel}: {snapshot.windowStart.slice(0, 16).replace("T", " ")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{snapshot.totalEvents}</p>
              <Separator className="my-3" />
              <ul className="space-y-1 font-mono text-xs text-muted-foreground">
                {Object.entries(snapshot.counters).map(([name, value]) => (
                  <li key={name} className="flex justify-between gap-2">
                    <span>{name}</span>
                    <span className="tabular-nums">{value}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      ) : (
        <EmptyState
          title={OBSERVABILITY_UI_COPY.empty.title}
          description={OBSERVABILITY_UI_COPY.empty.description}
          action={
            isDemoAvailable ? (
              <SeedDemoButton label={config.seedLabel} />
            ) : (
              <ObservabilityRefreshButton
                label={OBSERVABILITY_UI_COPY.common.refresh.label}
                pendingLabel={OBSERVABILITY_UI_COPY.common.refresh.pending}
                ariaLabel={OBSERVABILITY_UI_COPY.common.refresh.ariaLabel}
              />
            )
          }
        />
      )}
    </div>
  );
}
