import type { ActorTimelineEntry } from "@/features/ueba/lib/user-timeline";

interface UserTimelineProps {
  entries: ActorTimelineEntry[];
  emptyLabel: string;
}

export function UserTimeline({ entries, emptyLabel }: UserTimelineProps) {
  if (entries.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </p>
    );
  }

  return (
    <ol className="space-y-2">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"
        >
          <span className="font-mono text-xs">{entry.name}</span>
          <span className="flex items-center gap-3">
            <span className="tabular-nums text-xs text-muted-foreground">
              {entry.value}
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date(entry.timestamp).toLocaleString("id-ID")}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}
