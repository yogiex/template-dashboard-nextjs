import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  OBSERVABILITY_UI_COPY,
  STATUS_BADGE_CLASS,
  formatTimestamp,
  toPercent,
} from "@/config/observability-ui";
import {
  ERROR_BUDGET_STATUS_LABELS,
  ERROR_BUDGET_POLICY,
} from "@/config/slo";
import type { ErrorBudgetSummary } from "@/features/observability/lib/slo";

interface ErrorBudgetCardProps {
  summary: ErrorBudgetSummary;
}

const COPY = OBSERVABILITY_UI_COPY.errorBudget;

/**
 * Ringkasan error budget SLO ketersediaan.
 *
 * Peringatan utama file ini: `ErrorBudgetSummary.errorBudgetRemaining` bertipe
 * `number` dan bernilai `1` saat `hasData: false` — angka itu BUKAN "anggaran
 * utuh", itu placeholder supaya tidak NaN. Karena itu `hasData` selalu dibaca
 * lebih dulu; tanpa data kartu ini menampilkan status `unknown` dan catatan
 * eksplisit, bukan "100% sehat".
 */
export function ErrorBudgetCard({ summary }: ErrorBudgetCardProps) {
  const { hasData } = summary;
  const status = hasData ? summary.status : "unknown";
  const remainingPercent = hasData ? toPercent(summary.errorBudgetRemaining) : 0;
  const consumedPercent = hasData ? toPercent(summary.budgetConsumedRatio) : 0;
  const statusLabel = ERROR_BUDGET_STATUS_LABELS[status] ?? status;

  const rows: { label: string; value: string }[] = [
    {
      label: COPY.availabilityLabel,
      value: hasData ? summary.availability.toFixed(3) : OBSERVABILITY_UI_COPY.common.unmeasured,
    },
    {
      label: COPY.errorsLabel,
      value: hasData ? String(summary.errors) : OBSERVABILITY_UI_COPY.common.unmeasured,
    },
    {
      label: COPY.totalLabel,
      value: hasData ? String(summary.total) : OBSERVABILITY_UI_COPY.common.unmeasured,
    },
    {
      label: COPY.windowLabel,
      value: summary.windowLabel,
    },
    {
      label: COPY.evaluatedAtLabel,
      value: formatTimestamp(summary.evaluatedAt, OBSERVABILITY_UI_COPY.common.unmeasured),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{COPY.title}</CardTitle>
        <CardDescription>{COPY.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-3xl font-semibold tabular-nums">
            {hasData ? `${remainingPercent.toFixed(1)}%` : OBSERVABILITY_UI_COPY.common.unmeasured}
          </span>
          <Badge className={STATUS_BADGE_CLASS[status]} variant="secondary">
            {statusLabel}
          </Badge>
        </div>

        <div
          role="progressbar"
          aria-label={COPY.remainingLabel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={hasData ? Number(remainingPercent.toFixed(1)) : undefined}
          className="h-2 w-full overflow-hidden rounded-full bg-muted"
        >
          <div
            className={`h-full rounded-full ${hasData ? "bg-primary" : "bg-muted-foreground/30"}`}
            style={{ width: `${remainingPercent}%` }}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          {hasData
            ? `${COPY.consumedLabel}: ${consumedPercent.toFixed(1)}%`
            : COPY.noDataNote}
        </p>

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {rows.map((row) => (
            <div key={row.label} className="rounded-lg border border-border p-3">
              <dt className="text-xs text-muted-foreground">{row.label}</dt>
              <dd className="mt-1 text-sm font-semibold tabular-nums">{row.value}</dd>
            </div>
          ))}
        </dl>

        <p className="text-xs text-muted-foreground">{ERROR_BUDGET_POLICY.notes}</p>
      </CardContent>
    </Card>
  );
}
