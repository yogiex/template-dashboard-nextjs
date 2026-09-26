import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ALERT_SEVERITY_LABELS,
  ALERT_STATE_LABELS,
} from "@/config/alerting";
import {
  OBSERVABILITY_UI_COPY,
  STATUS_BADGE_CLASS,
  formatByUnit,
  formatTimestamp,
  type StatusTone,
} from "@/config/observability-ui";
import type {
  AlertEvaluation,
  AlertSnapshot,
  AlertState,
} from "@/features/observability/lib/alerting";

interface AlertRulesTableProps {
  snapshot: AlertSnapshot;
}

const COPY = OBSERVABILITY_UI_COPY.alerts;

/** State `firing` yang paling penting, jadi nadanya paling menonjol. */
const STATE_TONE: Record<AlertState, StatusTone> = {
  firing: "critical",
  pending: "warning",
  resolved: "healthy",
  ok: "unknown",
};

/**
 * Tabel hasil evaluasi seluruh rule alert.
 *
 * Dua hal yang sengaja ditampilkan eksplisit: `channels.dryRun` dan
 * `channels.slackConfigured`. Tanpa itu, tabel terlihat seperti sistem paging
 * yang benar-benar aktif padahal secara default tidak ada satu pun permintaan
 * jaringan yang keluar.
 */
export function AlertRulesTable({ snapshot }: AlertRulesTableProps) {
  const columns = COPY.columns;
  const unmeasured = OBSERVABILITY_UI_COPY.common.unmeasured;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{COPY.title}</CardTitle>
        <CardDescription>{COPY.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {snapshot.channels.dryRun ? (
          <Alert>
            <AlertTitle>{COPY.dryRunTitle}</AlertTitle>
            <AlertDescription>{COPY.dryRunNote}</AlertDescription>
          </Alert>
        ) : null}
        {!snapshot.channels.slackConfigured ? (
          <Alert>
            <AlertTitle>{COPY.slackMissingTitle}</AlertTitle>
            <AlertDescription>{COPY.slackMissingNote}</AlertDescription>
          </Alert>
        ) : null}

        <p className="text-xs text-muted-foreground">
          {`${COPY.firing}: ${snapshot.firing} — ${COPY.pending}: ${snapshot.pending} — ${COPY.ok}: ${snapshot.ok} — ${formatTimestamp(snapshot.evaluatedAt, unmeasured)}`}
        </p>

        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  {columns.rule}
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  {columns.severity}
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  {columns.state}
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  {columns.value}
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  {columns.since}
                </th>
                <th scope="col" className="px-4 py-3 text-left font-medium">
                  {columns.runbook}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {snapshot.alerts.map((alert) => (
                <AlertRow key={alert.ruleId} alert={alert} unmeasured={unmeasured} />
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted-foreground">{COPY.runbookNote}</p>
      </CardContent>
    </Card>
  );
}

type AlertRowProps = {
  alert: AlertEvaluation;
  unmeasured: string;
};

function AlertRow({ alert, unmeasured }: AlertRowProps) {
  const stateLabel = ALERT_STATE_LABELS[alert.state] ?? alert.state;
  const severityLabel = ALERT_SEVERITY_LABELS[alert.severity] ?? alert.severity;

  return (
    <tr className="align-top hover:bg-muted/30">
      <td className="px-4 py-3">
        <p className="font-medium">{alert.name}</p>
        <p className="mt-0.5 max-w-md text-xs text-muted-foreground">{alert.summary}</p>
      </td>
      <td className="px-4 py-3">
        <Badge variant="outline">{severityLabel}</Badge>
      </td>
      <td className="px-4 py-3">
        <Badge variant="secondary" className={STATUS_BADGE_CLASS[STATE_TONE[alert.state]]}>
          {stateLabel}
        </Badge>
      </td>
      <td className="px-4 py-3 text-right text-xs tabular-nums">
        <span className="block">
          {`${COPY.valuePrefix}: ${alert.value === null ? unmeasured : formatByUnit(alert.value, alert.unit)}`}
        </span>
        <span className="block text-muted-foreground">
          {`${COPY.thresholdPrefix}: ${formatByUnit(alert.threshold, alert.unit)}`}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">
        {formatTimestamp(alert.since, unmeasured)}
      </td>
      <td className="px-4 py-3">
        <span className="break-all font-mono text-[10px] text-muted-foreground">
          {alert.runbook}
        </span>
      </td>
    </tr>
  );
}
