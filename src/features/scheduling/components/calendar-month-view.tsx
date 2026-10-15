"use client";

import { cn } from "cn";
import { toLocalDateKey } from "@/features/scheduling/lib/calendar";
import type { EventOccurrence } from "@/features/scheduling/service";
import { EventChip } from "@/features/scheduling/components/event-chip";

const WEEKDAY_LABELS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

type Props = {
  days: Date[];
  occurrencesByDate: Map<string, EventOccurrence[]>;
  selectedDateKey: string;
  todayDateKey: string;
  onSelectDate: (date: Date) => void;
  onSelectEvent: (occurrence: EventOccurrence) => void;
};

export function CalendarMonthView({
  days,
  occurrencesByDate,
  selectedDateKey,
  todayDateKey,
  onSelectDate,
  onSelectEvent,
}: Props) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-2 text-center text-xs text-muted-foreground">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label}>{label}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const key = toLocalDateKey(day);
          const occurrences = occurrencesByDate.get(key) ?? [];
          const isSelected = key === selectedDateKey;
          const isToday = key === todayDateKey;

          return (
            <div
              key={key}
              className={cn(
                "min-h-24 rounded-lg border p-1.5",
                isToday && "border-primary/50",
                isSelected ? "bg-primary/5" : "bg-card",
              )}
            >
              <button
                type="button"
                onClick={() => onSelectDate(day)}
                className={cn(
                  "mb-1 block rounded px-1 text-xs font-medium tabular-nums",
                  isToday
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {day.getDate()}
              </button>
              <div className="space-y-1">
                {occurrences.slice(0, 3).map((occurrence) => (
                  <EventChip
                    key={occurrence.id}
                    occurrence={occurrence}
                    onSelect={onSelectEvent}
                  />
                ))}
                {occurrences.length > 3 ? (
                  <p className="px-1.5 text-[10px] text-muted-foreground">
                    +{occurrences.length - 3} lagi
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
