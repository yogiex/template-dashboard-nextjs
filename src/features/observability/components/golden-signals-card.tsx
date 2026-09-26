import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { GoldenSignalsSnapshot } from "@/features/observability/lib/golden-signals";
import {
  OBSERVABILITY_UI_COPY,
  STATUS_TEXT_CLASS,
  formatByUnit,
} from "@/config/observability-ui";

interface GoldenSignalsCardProps {
  snapshot: GoldenSignalsSnapshot;
}

type Signal = {
  title: string;
  hint: string;
  rows: { label: string; value: string }[];
  footer: string | null;
  tone: keyof typeof STATUS_TEXT_CLASS;
};

const COPY = OBSERVABILITY_UI_COPY.goldenSignals;

/**
 * Empat golden signal sebagai Server Component murni: empat panel statis, tanpa
 * client boundary.
 *
 * Aturan tampilan yang dijaga file ini: snapshot tanpa data HTTP
 * (`hasData: false`) menampilkan "Belum ada data" pada setiap panel, bukan
 * angka 0. Nol adalah hasil pengukuran yang sah; "belum ada data" adalah
 * kondisi yang berbeda dan tidak boleh disamarkan.
 */
export function GoldenSignalsCard({ snapshot }: GoldenSignalsCardProps) {
  const { hasData, traffic, latency, errors, saturation } = snapshot;
  const emptyValue = OBSERVABILITY_UI_COPY.common.unmeasured;
  const empty = hasData ? null : COPY.noData;

  const latencyValue = (value: number): string =>
    hasData ? formatByUnit(value, "ms") : emptyValue;

  const signals: Signal[] = [
    {
      title: COPY.trafficTitle,
      hint: COPY.trafficHint,
      rows: [
        {
          label: COPY.requestsLabel,
          value: hasData ? formatByUnit(traffic.total, "count") : emptyValue,
        },
        {
          label: COPY.routesLabel,
          value: hasData ? String(traffic.byRoute.length) : emptyValue,
        },
      ],
      footer: hasData
        ? traffic.byRoute
            .slice(0, 3)
            .map((route) => `${route.route} (${formatByUnit(route.requests, "count")})`)
            .join(", ")
        : null,
      tone: "unknown",
    },
    {
      title: COPY.latencyTitle,
      hint: COPY.latencyHint,
      rows: [
        { label: COPY.p50, value: latencyValue(latency.overall.p50Ms) },
        { label: COPY.p95, value: latencyValue(latency.overall.p95Ms) },
        { label: COPY.p99, value: latencyValue(latency.overall.p99Ms) },
      ],
      footer: null,
      tone: "unknown",
    },
    {
      title: COPY.errorsTitle,
      hint: COPY.errorsHint,
      rows: [
        {
          label: COPY.requestsLabel,
          value: hasData ? formatByUnit(errors.total, "count") : emptyValue,
        },
        {
          label: COPY.errorRateLabel,
          value: hasData ? formatByUnit(errors.rate, "1") : emptyValue,
        },
      ],
      footer: hasData
        ? errors.byRoute
            .filter((route) => route.errors > 0)
            .slice(0, 3)
            .map((route) => `${route.route} (${formatByUnit(route.errors, "count")})`)
            .join(", ") || COPY.routesEmpty
        : null,
      tone: hasData && errors.rate > 0 ? "critical" : "unknown",
    },
    {
      title: COPY.saturationTitle,
      hint: COPY.saturationHint,
      rows: [
        {
          label: COPY.eventLoopLagLabel,
          value:
            saturation.eventLoopLagMs === null
              ? emptyValue
              : formatByUnit(saturation.eventLoopLagMs, "ms"),
        },
        {
          label: COPY.heapUsedLabel,
          value:
            saturation.heapUsedBytes === null
              ? emptyValue
              : formatByUnit(saturation.heapUsedBytes, "By"),
        },
      ],
      footer: null,
      tone: "unknown",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{COPY.title}</CardTitle>
        <CardDescription>{COPY.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {empty ? (
          <p className="py-4 text-sm text-muted-foreground">{empty}</p>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {signals.map((signal) => (
            <section
              key={signal.title}
              aria-label={signal.title}
              className="rounded-lg border border-border p-4"
            >
              <p className="text-sm font-medium">{signal.title}</p>
              <p className="text-xs text-muted-foreground">{signal.hint}</p>
              <dl className="mt-3 space-y-2">
                {signal.rows.map((row) => (
                  <div key={row.label} className="flex items-baseline justify-between gap-2">
                    <dt className="text-xs text-muted-foreground">{row.label}</dt>
                    <dd
                      className={`text-sm font-semibold tabular-nums ${STATUS_TEXT_CLASS[signal.tone]}`}
                    >
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
              {signal.footer ? (
                <p className="mt-3 break-words font-mono text-[10px] text-muted-foreground">
                  {signal.footer}
                </p>
              ) : null}
            </section>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
