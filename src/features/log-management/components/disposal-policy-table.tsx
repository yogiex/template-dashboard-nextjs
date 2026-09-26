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
  DisposalPolicy,
  DisposalVerificationStep,
  UnauthorizedDisposalPrevention,
} from "@/features/log-management/lib/disposal";
import type { DisposalQueueItem } from "@/features/log-management/lib/disposal-queue";
import { DisposalControls } from "@/features/log-management/components/disposal-controls";
import { DisposalRowActions } from "@/features/log-management/components/disposal-row-actions";

export function DisposalPolicyTable({ policies }: { policies: readonly DisposalPolicy[] }) {
  const config = LOG_MANAGEMENT_PAGE_CONFIG;
  const columns = config.disposalColumns;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{config.disposalTitle}</CardTitle>
        <CardDescription>{config.disposalDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{columns.category}</TableHead>
              <TableHead>{columns.method}</TableHead>
              <TableHead>{columns.standard}</TableHead>
              <TableHead className="text-right">{columns.retention}</TableHead>
              <TableHead className="text-right">{columns.grace}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {policies.map((policy) => (
              <TableRow key={policy.category}>
                <TableCell>
                  <p className="font-medium">{policy.category}</p>
                  <p className="text-xs text-muted-foreground">
                    {policy.rationale}
                  </p>
                </TableCell>
                <TableCell className="text-xs">
                  {LOG_POLICY_COPY.methodLabels[policy.method] ?? policy.method}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {policy.standard}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {policy.retentionDays} hari
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {policy.gracePeriodHours} jam
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="mt-3 text-xs text-muted-foreground">
          {LOG_POLICY_COPY.dispositionNote}
        </p>
      </CardContent>
    </Card>
  );
}

export function DisposalControlsPanel({
  prevention,
  verificationSteps,
}: {
  prevention: readonly UnauthorizedDisposalPrevention[];
  verificationSteps: readonly DisposalVerificationStep[];
}) {
  const config = LOG_MANAGEMENT_PAGE_CONFIG;
  const columns = config.columns;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{config.disposalPreventionTitle}</CardTitle>
          <CardDescription>{config.disposalPreventionDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{columns.prevention}</TableHead>
                <TableHead>{columns.enforced}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prevention.map((control) => (
                <TableRow key={control.id}>
                  <TableCell>
                    <p className="font-medium">{control.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {control.description}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {control.implementationNote}
                    </p>
                  </TableCell>
                  <TableCell className="text-xs">
                    {LOG_POLICY_COPY.approvedLabels[
                      control.enforcedInTemplate ? "required" : "not-recommended"
                    ]}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{config.disposalVerificationTitle}</CardTitle>
          <CardDescription>{config.disposalVerificationDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{columns.verificationStep}</TableHead>
                <TableHead>{columns.automated}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {verificationSteps.map((step) => (
                <TableRow key={step.id}>
                  <TableCell>
                    <p className="font-medium">{step.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {step.description}
                    </p>
                  </TableCell>
                  <TableCell className="text-xs">
                    {LOG_POLICY_COPY.approvedLabels[
                      step.automated ? "required" : "not-recommended"
                    ]}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export function DisposalQueueTable({ items }: { items: readonly DisposalQueueItem[] }) {
  const config = LOG_MANAGEMENT_PAGE_CONFIG;
  const columns = config.disposalQueueColumns;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{config.disposalQueueTitle}</CardTitle>
        <CardDescription>{config.disposalQueueDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <DisposalControls />

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {config.disposalQueueEmpty}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{columns.id}</TableHead>
                <TableHead>{columns.category}</TableHead>
                <TableHead>{columns.status}</TableHead>
                <TableHead>{columns.scheduled}</TableHead>
                <TableHead>{columns.eligible}</TableHead>
                <TableHead>{columns.action}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">{item.id}</TableCell>
                  <TableCell className="text-xs">{item.category}</TableCell>
                  <TableCell className="text-xs">
                    {LOG_POLICY_COPY.statusLabels[item.status] ?? item.status}
                  </TableCell>
                  <TableCell className="text-xs tabular-nums">
                    {item.scheduledAt.slice(0, 16).replace("T", " ")}
                  </TableCell>
                  <TableCell className="text-xs tabular-nums">
                    {item.eligibleAt.slice(0, 16).replace("T", " ")}
                  </TableCell>
                  <TableCell>
                    <DisposalRowActions
                      disposalId={item.id}
                      status={item.status}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
