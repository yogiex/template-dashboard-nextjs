import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CARDINALITY_LIMITS } from "@/features/observability/lib/cardinality";
import { getCounters, getSeriesCount } from "@/features/observability/lib/store";
import type { RetentionSummary } from "@/features/observability/lib/metric-retention";
import {
  OBSERVABILITY_UI_COPY,
  formatByUnit,
  formatTimestamp,
} from "@/config/observability-ui";

type StoreHealth = {
  totalEvents: number;
  oldestEventAt: string | null;
};

interface StoreHealthCardProps {
  retention: RetentionSummary;
  health: StoreHealth;
}

const COPY = OBSERVABILITY_UI_COPY.storeHealth;
const TOP_METRICS = 5;

/**
 * Cardinality, retensi, dan jumlah event di store metrik.
 *
 * `getCounters()` dan `getSeriesCount()` dibaca langsung di sini, bukan
 * diteruskan dari page, supaya page tidak pernah menyentuh `lib/store` dan
 * semua knowledge tentang bentuk store tetap di dalam feature.
 *
 * `retention.volatile` selalu `true` pada implementasi sekarang: state
 * in-memory hilang saat restart. Angka retensi karena itu hanya menjelaskan
 * berapa lama event masih berguna di dalam satu proses, bukan klaim durable.
 */
export function StoreHealthCard({ retention, health }: StoreHealthCardProps) {
  const counters = Object.entries(getCounters()).sort(
    (left, right) => right[1] - left[1],
  );
  const topMetrics = counters.slice(0, TOP_METRICS);
  const totalSeries = getSeriesCount();
  const retentionDays = Math.round((retention.defaultRetentionMs / 86_400_000) * 100) / 100;

  const summary: { label: string; value: string }[] = [
    { label: COPY.totalEventsLabel, value: String(health.totalEvents) },
    {
      label: COPY.oldestEventLabel,
      value: formatTimestamp(health.oldestEventAt ?? retention.oldestEventAt, COPY.noOldestEvent),
    },
    { label: COPY.totalSeriesLabel, value: String(totalSeries) },
  ];

  const cardinality: { label: string; value: string }[] = [
    { label: COPY.totalSeriesLabel, value: String(CARDINALITY_LIMITS.totalSeries) },
    { label: COPY.perTagLabel, value: String(CARDINALITY_LIMITS.perTag) },
    { label: COPY.maxTagKeysLabel, value: String(CARDINALITY_LIMITS.maxTagKeys) },
  ];

  const retentionRows = retention.policies.map((policy) => ({
    label: policy.label,
    value: `${policy.hotDays}/${policy.warmDays}/${policy.coldDays} ${COPY.retentionTierUnit}`,
    hint: `${policy.eventCount} ${COPY.eventsLabel}`,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{COPY.title}</CardTitle>
        <CardDescription>{COPY.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {summary.map((item) => (
            <div key={item.label} className="rounded-lg border border-border p-3">
              <dt className="text-xs text-muted-foreground">{item.label}</dt>
              <dd className="mt-1 text-sm font-semibold tabular-nums">{item.value}</dd>
            </div>
          ))}
        </dl>

        <section aria-label={COPY.topMetricsLabel} className="space-y-2">
          <h3 className="text-sm font-medium">{COPY.topMetricsLabel}</h3>
          <p className="text-xs text-muted-foreground">{COPY.topMetricsHint}</p>
          {topMetrics.length === 0 ? (
            <p className="text-sm text-muted-foreground">{COPY.emptyEvents}</p>
          ) : (
            <ul className="space-y-1 font-mono text-xs">
              {topMetrics.map(([name, count]) => (
                <li key={name} className="flex justify-between gap-2">
                  <span className="truncate">{name}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {formatByUnit(count, "count")} {COPY.eventsLabel} /{" "}
                    {String(getSeriesCount(name))} {COPY.seriesLabel}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label={COPY.cardinalityTitle} className="space-y-2">
          <h3 className="text-sm font-medium">{COPY.cardinalityTitle}</h3>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {cardinality.map((item) => (
              <div key={item.label} className="rounded-lg border border-border p-3">
                <dt className="text-xs text-muted-foreground">{item.label}</dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums">{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-label={COPY.retentionTitle} className="space-y-2">
          <h3 className="text-sm font-medium">{COPY.retentionTitle}</h3>
          <p className="text-xs text-muted-foreground">
            {`${COPY.retentionDaysLabel}: ${retentionDays} hari (${retention.totalEvents} ${COPY.eventsLabel})`}
          </p>
          <ul className="space-y-1 text-xs">
            {retentionRows.map((row) => (
              <li key={row.label} className="flex justify-between gap-2">
                <span className="truncate">{row.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  {row.value} — {row.hint}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {retention.volatile ? (
          <Alert>
            <AlertDescription>{COPY.retentionVolatileNote}</AlertDescription>
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  );
}
