import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  OBSERVABILITY_UI_COPY,
  formatByUnit,
} from "@/config/observability-ui";
import type { GoldenSignalsSnapshot } from "@/features/observability/lib/golden-signals";

interface SaturationCardProps {
  saturation: GoldenSignalsSnapshot["saturation"];
}

const COPY = OBSERVABILITY_UI_COPY.saturation;

type Field = {
  label: string;
  value: number | null;
  unit: string;
};

/**
 * Lima-enam kolom kondisi proses.
 *
 * Kolom yang `null` berarti event runtime-nya tidak ada di store, jadi ditulis
 * sebagai "Tidak terukur". Sengaja tidak menulis 0: nol berarti proses terukur
 * dan nilainya memang nol, sedangkan `null` berarti tidak ada pengukuran sama
 * sekali. Keduanya harus terlihat jelas di UI.
 */
export function SaturationCard({ saturation }: SaturationCardProps) {
  const unmeasured = OBSERVABILITY_UI_COPY.common.unmeasured;
  const fields: Field[] = [
    { label: COPY.eventLoopLagLabel, value: saturation.eventLoopLagMs, unit: "ms" },
    { label: COPY.heapUsedLabel, value: saturation.heapUsedBytes, unit: "By" },
    { label: COPY.rssLabel, value: saturation.rssBytes, unit: "By" },
    { label: COPY.activeRequestsLabel, value: saturation.activeRequests, unit: "count" },
    { label: COPY.cpuUserLabel, value: saturation.cpuUserMs, unit: "ms" },
    { label: COPY.uptimeLabel, value: saturation.uptimeSeconds, unit: "s" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{COPY.title}</CardTitle>
        <CardDescription>{COPY.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {fields.map((field) => (
            <div key={field.label} className="rounded-lg border border-border p-3">
              <dt className="text-xs text-muted-foreground">{field.label}</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums">
                {field.value === null ? unmeasured : formatByUnit(field.value, field.unit)}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-xs text-muted-foreground">
          {saturation.hasData ? null : COPY.noDataNote}
        </p>
      </CardContent>
    </Card>
  );
}
