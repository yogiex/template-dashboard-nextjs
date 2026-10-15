"use client";

import { CalendarX2 } from "lucide-react";

import { SCHEDULING_CONFIG } from "@/config/scheduling";
import type { EventOccurrence } from "@/features/scheduling/service";
import { EventChip } from "@/features/scheduling/components/event-chip";

type Props = {
  occurrences: EventOccurrence[];
  onSelectEvent: (occurrence: EventOccurrence) => void;
};

export function CalendarDayView({ occurrences, onSelectEvent }: Props) {
  if (occurrences.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
        <CalendarX2 className="mx-auto mb-2 h-8 w-8" aria-hidden="true" />
        {SCHEDULING_CONFIG.navigation.empty}
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {occurrences.map((occurrence) => (
        <li key={occurrence.id}>
          <EventChip
            occurrence={occurrence}
            onSelect={onSelectEvent}
            showTime
          />
        </li>
      ))}
    </ul>
  );
}
