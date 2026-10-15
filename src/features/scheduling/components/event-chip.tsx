"use client";

import { Repeat } from "lucide-react";

import { cn } from "cn";
import { SCHEDULING_CONFIG } from "@/config/scheduling";
import { formatTime } from "@/features/scheduling/lib/calendar";
import type { EventOccurrence } from "@/features/scheduling/service";
import type { EventCategory } from "@/features/scheduling/schema";

const CATEGORY_CLASS: Record<EventCategory, string> = {
  meeting: "bg-secondary text-secondary-foreground",
  focus: "bg-accent text-accent-foreground",
  release: "bg-primary/10 text-primary",
  personal: "bg-muted text-foreground",
};

type Props = {
  occurrence: EventOccurrence;
  onSelect: (occurrence: EventOccurrence) => void;
  showTime?: boolean;
};

export function EventChip({ occurrence, onSelect, showTime = true }: Props) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onSelect(occurrence);
      }}
      className={cn(
        "flex w-full items-center gap-1 rounded-md px-1.5 py-1 text-left text-xs transition-opacity hover:opacity-90",
        CATEGORY_CLASS[occurrence.category],
      )}
    >
      {showTime ? (
        <span className="shrink-0 font-medium tabular-nums">
          {formatTime(occurrence.start)}
        </span>
      ) : null}
      {occurrence.recurring ? (
        <Repeat className="h-3 w-3 shrink-0" aria-hidden="true" />
      ) : null}
      <span className="truncate">{occurrence.title}</span>
      <span className="sr-only">
        {SCHEDULING_CONFIG.categories[occurrence.category]}
      </span>
    </button>
  );
}
