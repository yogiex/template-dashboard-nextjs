import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SLO_ORDER, SLO_STATUS_LABELS } from "@/config/slo";
import {
  OBSERVABILITY_UI_COPY,
  STATUS_BADGE_CLASS,
  formatByUnit,
  toPercent,
} from "@/config/observability-ui";
import type { SloResult } from "@/features/observability/lib/slo";

interface SloTableProps {
  results: SloResult[];
}

const COPY = OBSERVABILITY_UI_COPY.slo;

/**
 * Tabel semua SLO template, diurutkan mengikuti `SLO_ORDER` dari config
 * (bukan urutan respons server) supaya barisnya tidak lompat antar request.
 *
 * Format angka selalu lewat `unit` milik hasil, bukan placeholder per baris:
 * rasio 0..1 jadi persen, miliditet jadi `ms`, dan nilai tanpa unit tetap
 * angka. Baris tanpa error budget (mis. latensi) menulis "Tidak ada" pada
 * kolom budget, bukan 0% — 0% di sana berarti anggaran habis.
 */
export function SloTable({ results }: SloTableProps) {
  const byKey = new Map(results.map((result) => [result.key, result]));
  const ordered = SLO_ORDER.map((key) => byKey.get(key)).filter(
    (result): result is SloResult => result !== undefined,
  );

  const columns = COPY.columns;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{COPY.title}</CardTitle>
        <CardDescription>{COPY.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  {columns.objective}
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  {columns.status}
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  {columns.value}
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  {columns.target}
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  {columns.window}
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  {columns.burnRate}
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  {columns.budget}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ordered.map((result) => {
                const statusLabel = SLO_STATUS_LABELS[result.status] ?? result.status;
                const comparisonLabel =
                  result.comparison === "lte" ? COPY.comparisonLte : COPY.comparisonGte;

                return (
                  <tr key={result.key} className="align-top hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-medium">{result.label}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {result.description}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="secondary"
                        className={STATUS_BADGE_CLASS[result.status]}
                      >
                        {statusLabel}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {result.status === "unknown"
                        ? OBSERVABILITY_UI_COPY.common.unmeasured
                        : formatByUnit(result.value, result.unit)}
                    </td>
                    <td className="px-4 py-3 text-right text-xs tabular-nums text-muted-foreground">
                      {comparisonLabel} {formatByUnit(result.target, result.unit)}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {result.windowLabel}
                    </td>
                    <td className="px-4 py-3 text-right text-xs tabular-nums">
                      {result.status === "unknown"
                        ? OBSERVABILITY_UI_COPY.common.unmeasured
                        : `${result.burnRate.toFixed(2)}x`}
                    </td>
                    <td className="px-4 py-3 text-right text-xs tabular-nums">
                      {result.errorBudgetRemaining === null
                        ? COPY.noBudget
                        : result.status === "unknown"
                          ? OBSERVABILITY_UI_COPY.common.unmeasured
                          : `${toPercent(result.errorBudgetRemaining).toFixed(1)}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">{COPY.burnRateHint}</p>
      </CardContent>
    </Card>
  );
}
