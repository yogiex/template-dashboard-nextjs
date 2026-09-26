import { RiskBadge } from "@/features/ueba/components/risk-badge";
import type { UebaPageConfig } from "@/config/observability";
import type { Anomaly } from "@/features/ueba/types";

interface AnomalyFeedProps {
  anomalies: Anomaly[];
  config: UebaPageConfig;
  emptyLabel: string;
}

export function AnomalyFeed({ anomalies, config, emptyLabel }: AnomalyFeedProps) {
  if (anomalies.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {anomalies.map((anomaly) => (
        <li key={anomaly.id} className="rounded-xl border border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-medium">
              {config.kindLabels[anomaly.kind] ?? anomaly.kind}
            </span>
            <RiskBadge
              level={anomaly.severity}
              score={Math.round(anomaly.score * 100)}
              label={config.levelLabels[anomaly.severity]}
            />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{anomaly.message}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {new Date(anomaly.detectedAt).toLocaleString("id-ID")}
          </p>
          {Object.keys(anomaly.evidence).length > 0 ? (
            <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] text-muted-foreground">
              {Object.entries(anomaly.evidence)
                .filter(([key]) => key !== "kindLabel")
                .map(([key, value]) => (
                  <div key={key} className="flex gap-1">
                    <dt>{key}:</dt>
                    <dd className="truncate">{value}</dd>
                  </div>
                ))}
            </dl>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
