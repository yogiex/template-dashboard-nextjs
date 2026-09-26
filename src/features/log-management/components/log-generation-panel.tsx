import { Badge } from "@/components/ui/badge";
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
  GenerationPolicy,
  LogEventTypePolicy,
  SourceClassification,
} from "@/features/log-management/lib/generation";

export function LogGenerationPanel({
  classifications,
  allowed,
  prohibited,
  policy,
}: {
  classifications: SourceClassification[];
  allowed: LogEventTypePolicy[];
  prohibited: LogEventTypePolicy[];
  policy: GenerationPolicy;
}) {
  const config = LOG_MANAGEMENT_PAGE_CONFIG;
  const columns = config.columns;
  const all = [...allowed, ...prohibited];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{config.generationTitle}</CardTitle>
          <CardDescription>{config.generationDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          {all.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {config.generationEmpty}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{columns.eventType}</TableHead>
                  <TableHead>{columns.status}</TableHead>
                  <TableHead>{columns.frequency}</TableHead>
                  <TableHead>{columns.requiredCharacteristics}</TableHead>
                  <TableHead>{columns.sensitiveKeys}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {all.map((eventType) => (
                  <TableRow key={eventType.id}>
                    <TableCell>
                      <p className="font-medium">{eventType.label}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {eventType.id}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={eventType.allowed ? "secondary" : "destructive"}
                      >
                        {LOG_POLICY_COPY.permissionLabels[
                          eventType.allowed ? "allowed" : "prohibited"
                        ]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {LOG_POLICY_COPY.frequencyLabels[eventType.frequency] ??
                        eventType.frequency}
                    </TableCell>
                    <TableCell>
                      <ul className="list-disc pl-4 text-xs text-muted-foreground">
                        {eventType.requiredCharacteristics.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {eventType.sensitiveKeys.length > 0
                        ? eventType.sensitiveKeys.join(", ")
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{config.classificationTitle}</CardTitle>
          <CardDescription>
            {config.classificationDescriptionTemplate.replace(
              "{count}",
              String(classifications.length),
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {classifications.map((classification) => (
              <li
                key={classification.sourceId}
                className="flex flex-wrap items-center gap-2"
              >
                <Badge
                  variant={
                    classification.tier === "prohibited"
                      ? "destructive"
                      : classification.tier === "required"
                        ? "default"
                        : "secondary"
                  }
                >
                  {LOG_POLICY_COPY.tierLabels[classification.tier] ??
                    classification.tier}
                </Badge>
                <span className="font-mono text-xs">
                  {classification.sourceId}
                </span>
                <span className="text-xs text-muted-foreground">
                  {classification.eventTypeIds.length} event type
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{config.handlingTitle}</CardTitle>
          <CardDescription>{config.handlingDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">{LOG_POLICY_COPY.sensitiveNote}</p>
          <p className="text-muted-foreground">{LOG_POLICY_COPY.frequencyNote}</p>
          <p className="text-muted-foreground">
            {LOG_POLICY_COPY.failurePolicyNote}
          </p>
          <p className="text-muted-foreground">{LOG_POLICY_COPY.clockNote}</p>
          <p className="text-muted-foreground">{LOG_POLICY_COPY.monitoringNote}</p>
          <dl className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-border p-3">
              <dt className="text-xs text-muted-foreground">
                {config.hashedFieldsLabel}
              </dt>
              <dd className="mt-1 font-mono text-xs">
                {policy.cleartextVsHashed.hashedFields.join(", ")}
              </dd>
            </div>
            <div className="rounded-lg border border-border p-3">
              <dt className="text-xs text-muted-foreground">
                {config.neverStoredLabel}
              </dt>
              <dd className="mt-1 font-mono text-xs">
                {policy.cleartextVsHashed.neverStored.join(", ")}
              </dd>
            </div>
            <div className="rounded-lg border border-border p-3">
              <dt className="text-xs text-muted-foreground">{config.clockLabel}</dt>
              <dd className="mt-1 text-xs">
                {config.clockValueTemplate
                  .replace("{protocol}", policy.clockSync.protocol)
                  .replace(
                    "{drift}",
                    String(policy.clockSync.maxDriftSeconds),
                  )
                  .replace("{timezone}", policy.clockSync.timezone)}
              </dd>
            </div>
            <div className="rounded-lg border border-border p-3">
              <dt className="text-xs text-muted-foreground">
                {config.failureLabel}
              </dt>
              <dd className="mt-1 text-xs">
                {config.failureValueTemplate.replace(
                  "{fallback}",
                  policy.failurePolicy.fallback,
                )}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
