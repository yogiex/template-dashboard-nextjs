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
import type { AuditEvent } from "@/features/audit/schema";
import type { LogOverview } from "@/features/log-management/service";

export function RecentLogTable({ events }: { events: readonly AuditEvent[] }) {
  const config = LOG_MANAGEMENT_PAGE_CONFIG;
  const columns = config.columns;

  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{columns.event}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {config.analysisEmpty}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{columns.event}</CardTitle>
        <CardDescription>{config.kpis.entriesHint}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{columns.timestamp}</TableHead>
              <TableHead>{columns.event}</TableHead>
              <TableHead>{columns.category}</TableHead>
              <TableHead>{columns.result}</TableHead>
              <TableHead>{columns.actor}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id}>
                <TableCell className="text-xs tabular-nums">
                  {event.timestamp.slice(0, 19).replace("T", " ")}
                </TableCell>
                <TableCell className="font-mono text-xs">{event.action}</TableCell>
                <TableCell className="text-xs">
                  {LOG_POLICY_COPY.severityLabels[event.severity] ?? event.severity} /{" "}
                  {event.category}
                </TableCell>
                <TableCell className="text-xs">
                  {LOG_POLICY_COPY.resultLabels[event.result] ?? event.result}
                </TableCell>
                <TableCell className="text-xs">
                  {event.actor?.id ?? "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function OverviewSummary({ overview }: { overview: LogOverview }) {
  const config = LOG_MANAGEMENT_PAGE_CONFIG;
  const chainIntact = overview.integrity.lastReport
    ? overview.integrity.lastReport.brokenAtIndex === -1
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{config.kpis.integrity}</CardTitle>
        <CardDescription>{config.kpis.integrityHint}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p>
          {config.integrityVerifiedAt}:{" "}
          {overview.integrity.lastVerifiedAt === null
            ? config.integrityNeverVerified
            : overview.integrity.lastVerifiedAt.replace("T", " ").slice(0, 19)}
        </p>
        <p>
          {config.kpis.integrity}:{" "}
          {chainIntact === null
            ? config.integrityNeverVerified
            : chainIntact
              ? config.integrityIntact
              : config.integrityBrokenTemplate.replace(
                  "{index}",
                  String(overview.integrity.lastReport?.brokenAtIndex ?? 0),
                )}
        </p>
        <p>
          {config.disposalQueueTitle}: {overview.pendingDisposals}
        </p>
      </CardContent>
    </Card>
  );
}
