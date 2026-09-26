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
import type {
  AccessGrant,
  AccessLoggingRule,
  AccessModePolicy,
  AccessMonitoringCheck,
  AccessProtection,
  PreservationSource,
} from "@/features/log-management/lib/access";

export function AccessMatrix({ grants }: { grants: readonly AccessGrant[] }) {
  const config = LOG_MANAGEMENT_PAGE_CONFIG;
  const columns = config.accessColumns;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{config.accessTitle}</CardTitle>
        <CardDescription>{config.accessDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{columns.role}</TableHead>
              <TableHead>{columns.level}</TableHead>
              <TableHead>{columns.scope}</TableHead>
              <TableHead>{columns.conditions}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grants.map((grant) => (
              <TableRow key={grant.role}>
                <TableCell className="font-medium">{grant.role}</TableCell>
                <TableCell>
                  {LOG_POLICY_COPY.levelLabels[grant.level] ?? grant.level}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {grant.scope.join(", ")}
                </TableCell>
                <TableCell>
                  <ul className="list-disc pl-4 text-xs text-muted-foreground">
                    {grant.conditions.map((condition) => (
                      <li key={condition}>{condition}</li>
                    ))}
                  </ul>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function AccessModePanel({
  modes,
  protections,
  loggingRules,
  preservationOrder,
  monitoring,
}: {
  modes: readonly AccessModePolicy[];
  protections: readonly AccessProtection[];
  loggingRules: readonly AccessLoggingRule[];
  preservationOrder: readonly PreservationSource[];
  monitoring: readonly AccessMonitoringCheck[];
}) {
  const config = LOG_MANAGEMENT_PAGE_CONFIG;
  const columns = config.columns;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{config.accessModeTitle}</CardTitle>
          <CardDescription>{config.accessModeDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{columns.mode}</TableHead>
                <TableHead>{columns.additionalControls}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {modes.map((mode) => (
                <TableRow key={mode.id}>
                  <TableCell>
                    <p className="font-medium">{mode.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {mode.description}
                    </p>
                  </TableCell>
                  <TableCell className="text-xs">
                    {mode.additionalControls.join(", ")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-3 text-xs text-muted-foreground">
            {LOG_POLICY_COPY.remoteAccessNote}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{config.accessProtectionTitle}</CardTitle>
          <CardDescription>{config.accessProtectionDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{columns.control}</TableHead>
                <TableHead>{columns.value}</TableHead>
                <TableHead>{columns.appliesTo}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {protections.map((protection) => (
                <TableRow key={protection.id}>
                  <TableCell className="font-medium">{protection.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {protection.value}
                  </TableCell>
                  <TableCell className="text-xs">
                    {protection.appliesTo.join(", ")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{config.accessLoggingTitle}</CardTitle>
          <CardDescription>{config.accessLoggingDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {loggingRules.map((rule) => (
              <li key={rule.id} className="rounded-lg border border-border p-3">
                <p className="font-medium">{rule.name}</p>
                <p className="text-xs text-muted-foreground">
                  {rule.description} ({LOG_POLICY_COPY.severityLabels[rule.minimumSeverity]})
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            {LOG_POLICY_COPY.accessLoggingNote}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{config.preservationTitle}</CardTitle>
          <CardDescription>{config.preservationDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 text-sm">
            {preservationOrder.map((source) => (
              <li key={source.id} className="rounded-lg border border-border p-3">
                <p className="font-medium">
                  {source.priority}. {source.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {source.description}
                </p>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-muted-foreground">
            {LOG_POLICY_COPY.preservationNote}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{config.accessMonitoringTitle}</CardTitle>
          <CardDescription>{config.accessMonitoringDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {monitoring.map((check) => (
              <li key={check.id} className="rounded-lg border border-border p-3">
                <p className="font-medium">{check.name}</p>
                <p className="text-xs text-muted-foreground">{check.description}</p>
                <p className="mt-1 text-xs">
                  {LOG_POLICY_COPY.severityLabels[check.escalation]}
                </p>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
