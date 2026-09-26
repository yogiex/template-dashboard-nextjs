import type { ActivityHeatmapCell } from "@/features/observability/types";

const DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"] as const;
const HOUR_TICKS = [0, 6, 12, 18, 23] as const;

interface ActivityHeatmapProps {
  cells: ActivityHeatmapCell[];
  dayLabels?: readonly string[];
}

/**
 * Server Component murni: grid 7×24 tanpa client boundary. `gridTemplateColumns`
 * inline dipakai karena Tailwind tidak punya `grid-cols-24`.
 */
export function ActivityHeatmap({
  cells,
  dayLabels = DAYS,
}: ActivityHeatmapProps) {
  const max = Math.max(1, ...cells.map((cell) => cell.count));
  const rows = dayLabels.map((label, day) => ({
    label,
    cells: cells
      .filter((cell) => cell.day === day)
      .sort((left, right) => left.hour - right.hour),
  }));

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[40px_1fr] items-end gap-2">
        <span aria-hidden="true" />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          {HOUR_TICKS.map((hour) => (
            <span key={hour}>{hour}:00</span>
          ))}
        </div>
      </div>

      {rows.map((row) => (
        <div
          key={row.label}
          className="grid grid-cols-[40px_1fr] items-center gap-2"
        >
          <span className="text-xs text-muted-foreground">{row.label}</span>
          <div
            className="grid gap-0.5"
            style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}
          >
            {row.cells.map((cell) => {
              const intensity = cell.count / max;

              return (
                <div
                  key={`${cell.day}-${cell.hour}`}
                  title={`${row.label} ${cell.hour}:00 — ${cell.count} event`}
                  className="aspect-square rounded-sm bg-primary"
                  style={{ opacity: Number((0.12 + intensity * 0.88).toFixed(2)) }}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
