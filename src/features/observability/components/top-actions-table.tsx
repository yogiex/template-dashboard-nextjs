import type { TopAction } from "@/features/observability/types";
import { METRIC_DESCRIPTIONS, METRIC_NAMES } from "@/features/observability/lib/constants";

interface TopActionsTableProps {
  actions: TopAction[];
  nameLabel: string;
  countLabel: string;
  emptyLabel: string;
}

const KNOWN_NAMES = new Set<string>(Object.values(METRIC_NAMES));

export function TopActionsTable({
  actions,
  nameLabel,
  countLabel,
  emptyLabel,
}: TopActionsTableProps) {
  if (actions.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-3 text-left font-medium">
              {nameLabel}
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              {countLabel}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {actions.map((action) => (
            <tr key={action.name} className="hover:bg-muted/30">
              <td className="px-4 py-3">
                <span className="font-mono text-xs">{action.name}</span>
                {KNOWN_NAMES.has(action.name) ? (
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {METRIC_DESCRIPTIONS[
                      action.name as keyof typeof METRIC_DESCRIPTIONS
                    ]}
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                {action.count}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
