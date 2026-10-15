"use client";

import { Download, MapPin, Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SCHEDULING_CONFIG } from "@/config/scheduling";
import type { Event } from "@/features/scheduling/schema";
import {
  formatDateTime,
  formatTimeRange,
} from "@/features/scheduling/lib/calendar";
import type { EventOccurrence } from "@/features/scheduling/service";

const C = SCHEDULING_CONFIG.details;

type SelectedEvent = {
  event: Event;
  occurrence: EventOccurrence;
};

type Props = {
  selected: SelectedEvent | null;
  onOpenChange: (open: boolean) => void;
  onEdit: (event: Event) => void;
  onDelete: (event: Event) => void;
  onDownload: (event: Event) => void;
};

export function EventDetailDialog({
  selected,
  onOpenChange,
  onEdit,
  onDelete,
  onDownload,
}: Props) {
  const event = selected?.event ?? null;
  const occurrence = selected?.occurrence ?? null;

  return (
    <Dialog open={Boolean(selected)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {selected && event && occurrence ? (
          <>
            <DialogHeader>
              <DialogTitle>{event.title}</DialogTitle>
              <DialogDescription>
                {event.allDay
                  ? C.allDay
                  : formatTimeRange(occurrence.start, occurrence.end)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">
                  {SCHEDULING_CONFIG.categories[event.category]}
                </Badge>
                {occurrence.recurring ? (
                  <Badge variant="outline">
                    {SCHEDULING_CONFIG.recurrence[event.recurrence.frequency]}
                  </Badge>
                ) : null}
              </div>

              {occurrence.recurring ? (
                <p className="text-xs text-muted-foreground">
                  {C.recurringInstance}
                </p>
              ) : null}

              <p>
                <span className="text-muted-foreground">{C.time}: </span>
                {formatDateTime(occurrence.start)} – {formatDateTime(occurrence.end)}
              </p>

              <p>
                <span className="text-muted-foreground">{C.recurrence}: </span>
                {recurrenceLabel(event.recurrence)}
              </p>

              {event.location ? (
                <p className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                  <span className="text-muted-foreground">{C.location}: </span>
                  {event.location}
                </p>
              ) : null}

              {event.attendees.length > 0 ? (
                <p>
                  <span className="text-muted-foreground">{C.attendees}: </span>
                  {event.attendees.join(", ")}
                </p>
              ) : null}

              <p>
                <span className="text-muted-foreground">{C.reminders}: </span>
                {event.reminders.length > 0
                  ? event.reminders
                      .map((minutes) => reminderLabel(minutes))
                      .join(", ")
                  : C.none}
              </p>

              {event.description ? (
                <p className="whitespace-pre-wrap">
                  <span className="text-muted-foreground">{C.description}: </span>
                  {event.description}
                </p>
              ) : null}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDownload(event)}
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                {SCHEDULING_CONFIG.actions.download}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(event)}
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                {SCHEDULING_CONFIG.actions.edit}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onDelete(event)}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                {SCHEDULING_CONFIG.actions.delete}
              </Button>
            </DialogFooter>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function recurrenceLabel(recurrence: Event["recurrence"]): string {
  const label = SCHEDULING_CONFIG.recurrence[recurrence.frequency];
  if (recurrence.frequency === "none") return label;
  const interval = `${SCHEDULING_CONFIG.form.label.interval}: ${recurrence.interval}`;
  const until = recurrence.until
    ? ` • ${SCHEDULING_CONFIG.form.label.until}: ${recurrence.until}`
    : "";
  return `${label} • ${interval}${until}`;
}

function reminderLabel(minutes: number): string {
  switch (minutes) {
    case 0:
      return SCHEDULING_CONFIG.reminders.onTime;
    case 10:
      return SCHEDULING_CONFIG.reminders.tenMinutes;
    case 30:
      return SCHEDULING_CONFIG.reminders.thirtyMinutes;
    case 60:
      return SCHEDULING_CONFIG.reminders.oneHour;
    case 1440:
      return SCHEDULING_CONFIG.reminders.oneDay;
    default:
      return `${minutes} menit`;
  }
}
