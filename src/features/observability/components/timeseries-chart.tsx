import type { TimeSeriesPoint } from "@/features/observability/types";

interface TimeseriesChartProps {
  points: TimeSeriesPoint[];
  label: string;
  emptyLabel: string;
  /** Panjang grafik dalam px agar layout deterministik tanpa recharts. */
  height?: number;
}

/**
 * Sparkline/bar chart sebagai Server Component (SVG inline) supaya halaman
 * dashboard tidak menambah client boundary. Kalau butuh interaksi/zoom,
 * ganti dengan recharts + dynamic import.
 */
export function TimeseriesChart({
  points,
  label,
  emptyLabel,
  height = 96,
}: TimeseriesChartProps) {
  if (points.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </p>
    );
  }

  const max = Math.max(1, ...points.map((point) => point.value));
  const barWidth = 100 / points.length;

  return (
    <div className="space-y-2">
      <svg
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
        role="img"
        aria-label={label}
        className="w-full text-primary"
        style={{ height }}
      >
        {points.map((point, index) => {
          const barHeight = (point.value / max) * 38;

          return (
            <rect
              key={point.timestamp}
              x={index * barWidth}
              y={40 - barHeight}
              width={Math.max(barWidth - 0.6, 0.4)}
              height={barHeight}
              rx={0.6}
              className="fill-primary"
            >
              <title>{`${new Date(point.timestamp).toLocaleString("id-ID")} — ${point.value}`}</title>
            </rect>
          );
        })}
      </svg>

      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{new Date(points[0].timestamp).toLocaleString("id-ID")}</span>
        <span>
          {new Date(points[points.length - 1].timestamp).toLocaleString("id-ID")}
        </span>
      </div>
    </div>
  );
}
