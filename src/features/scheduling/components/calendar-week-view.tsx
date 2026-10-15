"use client";

import { cn } from "cn";
import { SCHEDULING_CONFIG } from "@/config/scheduling";
import { formatShortDate, toLocalDateKey } from "@/features/scheduling/lib/calendar";
import type { EventOccurrence } from "@/features/scheduling/service";
import { EventChip } from "@/features/scheduling/components/event-chip";

type Props = {
  days: Date[];
  occurrencesByDate: Map<string, EventOccurrence[]>;
  selectedDateKey: string;
  todayDateKey: string;
  onSelectDate: (date: Date) => void;
  onSelectEvent: (occurrence: EventOccurrence) => void;
};

export function CalendarWeekView({
  days,
  occurrencesByDate,
  selectedDateKey,
  todayDateKey,
  onSelectDate,
  onSelectEvent,
}: Props) {
  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((day) => {
        const key = toLocalDateKey(day);
        const occurrences = occurrencesByDate.get(key) ?? [];
        const isSelected = key === selectedDateKey;
        const isToday = key === todayDateKey;

        return (
          <section
            key={key}
            className={cn(
              "min-h-64 rounded-lg border p-2",
              isToday && "border-primary/50",
              isSelected ? "bg-primary/5" : "bg-card",
            )}
          >
            <button
              type="button"
              onClick={() => onSelectDate(day)}
              className="mb-2 block w-full rounded text-left"
            >
              <p className="text-xs text-muted-foreground">
                {day.toLocaleDateString("id-ID", { weekday: "short" })}
              </p>
              <p
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  isToday && "text-primary",
                )}
              >
                {formatShortDate(day)}
              </p>
            </button>
            <div className="space-y-1">
              {occurrences.map((occurrence) => (
                <EventChip
                  key={occurrence.id}
                  occurrence={occurrence}
                  onSelect={onSelectEvent}
                />
              ))}
              {occurrences.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {SCHEDULING_CONFIG.navigation.empty}
                </p>
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}
