import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
import type { CorrelationRule } from "@/features/log-management/lib/storage";
import type { DataReductionRule, LogFormat, StorageCapacity, TransferMethod, TransferPolicy, RetentionPolicy } from "@/features/log-management/lib/storage";

export function RetentionMatrix({ policies }: { policies: readonly RetentionPolicy[] }) {
  const config = LOG_MANAGEMENT_PAGE_CONFIG;
  const columns = config.retentionColumns;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{config.retentionTitle}</CardTitle>
        <CardDescription>{config.retentionDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{columns.category}</TableHead>
              <TableHead>{columns.tier}</TableHead>
              <TableHead className="text-right">{columns.days}</TableHead>
              <TableHead>{columns.rationale}</TableHead>
              <TableHead>{columns.basis}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {policies.map((policy) => (
              <TableRow key={policy.category}>
                <TableCell className="font-medium">{policy.category}</TableCell>
                <TableCell>
                  {LOG_POLICY_COPY.storageTierLabels[policy.tier] ?? policy.tier}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {policy.retentionDays} hari
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {policy.rationale}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {policy.regulatoryBasis}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function StorageCapacityCard({ capacity }: { capacity: StorageCapacity }) {
  const config = LOG_MANAGEMENT_PAGE_CONFIG;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{config.storageTitle}</CardTitle>
        <CardDescription>{config.storageDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(
            [
              [config.storageEntriesLabel, `${capacity.totalEntries}`],
              [
                config.storageSizeLabel,
                `${capacity.approximateSizeKB} KB`,
              ],
              [config.storageUsageLabel, `${capacity.usedPercent}%`],
              [config.storageLimitLabel, `${capacity.maxEntries}`],
              [config.storageDroppedLabel, `${capacity.droppedEntries}`],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="rounded-lg border border-border p-3">
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
        <Separator className="my-4" />
        <p className="text-xs text-muted-foreground">
          {capacity.note} {config.storageStorageNote}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {LOG_POLICY_COPY.storageMonitoringNote}
        </p>
      </CardContent>
    </Card>
  );
}

export function StorageOperationsPanel({
  transfers,
  transferMethods,
  correlationRules,
  dataReduction,
  formats,
  protection,
}: {
  transfers: readonly TransferPolicy[];
  transferMethods: readonly TransferMethod[];
  correlationRules: readonly CorrelationRule[];
  dataReduction: readonly DataReductionRule[];
  formats: readonly LogFormat[];
  protection: { confidentiality: string; integrity: string; availability: string };
}) {
  const config = LOG_MANAGEMENT_PAGE_CONFIG;
  const columns = config.columns;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{config.storageOpsTitle}</CardTitle>
          <CardDescription>{config.storageOpsDescription}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-sm">
          <div>
            <p className="font-medium">{columns.transfer}</p>
            <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
              {transfers.map((transfer) => (
                <li key={transfer.id}>
                  <span className="font-medium text-foreground">
                    {transfer.name}
                  </span>
                  : {transfer.description}{" "}
                  {transfer.confirmationRequired ? "(perlu konfirmasi)" : "(otomatis)"}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              {LOG_POLICY_COPY.transferNote}
            </p>
          </div>

          <div>
            <p className="font-medium">{columns.transferMethod}</p>
            <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
              {transferMethods.map((method) => (
                <li key={method.id}>
                  <span className="font-medium text-foreground">{method.name}</span>:{" "}
                  {method.encryptionInTransit ? "terenkripsi saat transit" : "transit polos"},
                  {method.encryptionAtRest
                    ? " dan saat disimpan"
                    : ", penyimpanan polos"}
                  . {method.integrityCheck}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-medium">{config.correlationTitle}</p>
            <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
              {correlationRules.map((rule) => (
                <li key={rule.id}>
                  <span className="font-medium text-foreground">{rule.name}</span> (
                  {rule.joinKey}, {rule.windowMinutes} menit): {rule.description}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-medium">{config.dataReductionTitle}</p>
            <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
              {dataReduction.map((rule) => (
                <li key={rule.id}>
                  <span className="font-medium text-foreground">{rule.name}</span>:{" "}
                  {rule.description}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-medium">{config.formatTitle}</p>
            <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
              {formats.map((format) => (
                <li key={format.id}>
                  <span className="font-medium text-foreground">{format.name}</span>
                  {format.recommended ? " (disarankan)" : ""}: {format.description}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{config.protectionTitle}</CardTitle>
          <CardDescription>{config.protectionDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="font-medium">{config.confidentialityLabel}</dt>
              <dd className="text-muted-foreground">
                {protection.confidentiality}
              </dd>
            </div>
            <div>
              <dt className="font-medium">{config.integrityLabel}</dt>
              <dd className="text-muted-foreground">{protection.integrity}</dd>
            </div>
            <div>
              <dt className="font-medium">{config.availabilityLabel}</dt>
              <dd className="text-muted-foreground">
                {protection.availability}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            {LOG_POLICY_COPY.protectionNote}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
