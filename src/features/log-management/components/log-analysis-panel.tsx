import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LOG_MANAGEMENT_PAGE_CONFIG,
  LOG_POLICY_COPY,
} from "@/config/log-management";
import type { LogAnalysis } from "@/features/log-management/lib/analysis";

export function LogAnalysisPanel({ analysis }: { analysis: LogAnalysis }) {
  const config = LOG_MANAGEMENT_PAGE_CONFIG;
  const columns = config.analysisColumns;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{config.analysisTitle}</CardTitle>
          <CardDescription>{config.analysisDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          {analysis.eventsScanned === 0 ? (
            <p className="text-sm text-muted-foreground">{config.analysisEmpty}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{columns.rule}</TableHead>
                  <TableHead>{columns.severity}</TableHead>
                  <TableHead className="text-right">{columns.matches}</TableHead>
                  <TableHead>{columns.detail}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysis.findings.map((finding) => (
                  <TableRow key={finding.ruleId}>
                    <TableCell className="font-mono text-xs">
                      {finding.ruleId}
                    </TableCell>
                    <TableCell className="text-xs">
                      {LOG_POLICY_COPY.severityLabels[finding.severity] ??
                        finding.severity}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {finding.matches}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {finding.observed}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            {analysis.eventsScanned} event dipindai dalam {analysis.windowHours} jam
            (dihitung {analysis.analyzedAt.replace("T", " ").slice(0, 19)}).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{config.monitoringTitle}</CardTitle>
          <CardDescription>{config.monitoringDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{config.monitoringColumns.check}</TableHead>
                <TableHead>{config.monitoringColumns.status}</TableHead>
                <TableHead>{config.monitoringColumns.observed}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analysis.monitoring.map((check) => (
                <TableRow key={check.id}>
                  <TableCell className="font-mono text-xs">{check.id}</TableCell>
                  <TableCell>
                    <span
                      className={
                        check.status === "critical"
                          ? "text-xs font-medium text-destructive"
                          : "text-xs font-medium"
                      }
                    >
                      {check.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {check.observed}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{config.incidentTitle}</CardTitle>
            <CardDescription>{config.incidentDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {analysis.incidentResponse.map((link) => (
                <li key={link.id} className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">{link.condition}</p>
                  <p className="mt-1">{link.action}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {config.columns.target}: {link.targetMinutes} menit
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              {LOG_POLICY_COPY.incidentNote}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{config.reportTitle}</CardTitle>
            <CardDescription>{config.reportDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border p-3">
                <dt className="text-xs text-muted-foreground">
                  {config.storageEntriesLabel}
                </dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums">
                  {analysis.monitoring.find((check) => check.id === "capacity")
                    ?.observed ?? "-"}
                </dd>
              </div>
              <div className="rounded-lg border border-border p-3">
                <dt className="text-xs text-muted-foreground">
                  {config.monitoringColumns.observed}
                </dt>
                <dd className="mt-1 text-xs">
                  {analysis.monitoring.map((check) => check.id).join(", ")}
                </dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">
              {LOG_POLICY_COPY.reportNote}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
