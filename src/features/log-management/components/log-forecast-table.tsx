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
import type { LogSourceForecast } from "@/features/log-management/lib/config";
import type { LogSourceTier } from "@/features/log-management/lib/config";

const TIER_VARIANT: Record<LogSourceTier, "default" | "secondary" | "outline" | "destructive"> = {
  required: "default",
  recommended: "secondary",
  "not-recommended": "outline",
  prohibited: "destructive",
};

export function LogForecastTable({
  sources,
  totals,
}: {
  sources: readonly LogSourceForecast[];
  totals: { sourceCount: number; estimatedDailyMB: number; estimatedDailyGB: number };
}) {
  const config = LOG_MANAGEMENT_PAGE_CONFIG;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{config.forecastTitle}</CardTitle>
        <CardDescription>{config.forecastDescription}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{config.forecastColumns.source}</TableHead>
              <TableHead>{config.forecastColumns.tier}</TableHead>
              <TableHead>{config.forecastColumns.infrastructure}</TableHead>
              <TableHead className="text-right">
                {config.forecastColumns.dailyVolume}
              </TableHead>
              <TableHead>{config.forecastColumns.workRoles}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sources.map((source) => (
              <TableRow key={source.id}>
                <TableCell>
                  <p className="font-medium">{source.label}</p>
                  <p className="text-xs text-muted-foreground">{source.useCase}</p>
                  <ul className="mt-1 list-disc pl-4 text-xs text-muted-foreground">
                    {source.requirements.map((requirement) => (
                      <li key={requirement}>{requirement}</li>
                    ))}
                  </ul>
                </TableCell>
                <TableCell>
                  <Badge variant={TIER_VARIANT[source.tier]}>
                    {LOG_POLICY_COPY.tierLabels[source.tier] ?? source.tier}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {source.infrastructure}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {source.estimatedDailyMB} MB
                </TableCell>
                <TableCell className="text-xs">
                  {source.workRoles.length > 0 ? source.workRoles.join(", ") : "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <p className="mt-4 text-sm font-medium">{config.forecastTotalsTitle}</p>
        <p className="text-sm tabular-nums text-muted-foreground">
          {totals.sourceCount} source, {totals.estimatedDailyMB} MB/hari (
          {totals.estimatedDailyGB} GB/hari).
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {config.forecastTotalsNote}
        </p>
      </CardContent>
    </Card>
  );
}
