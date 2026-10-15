"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarPlus, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SCHEDULING_CONFIG } from "@/config/scheduling";
import { clientLogger } from "@/lib/logger-client";
import {
  createEventFromForm,
  schedulingViewSchema,
  updateEventFromForm,
  type Event,
  type EventFormValues,
} from "@/features/scheduling/schema";
import {
  findRecurrenceConflicts,
  getEventsForRange,
  groupOccurrencesByDate,
  loadEvents,
  resetEvents,
  saveEvents,
  downloadIcs,
  type EventOccurrence,
} from "@/features/scheduling/service";
import {
  addDays,
  addMonths,
  endOfDay,
  formatDayLabel,
  formatMonthLabel,
  formatShortDate,
  monthGridDates,
  startOfDay,
  startOfMonth,
  toLocalDateKey,
  weekDates,
} from "@/features/scheduling/lib/calendar";
import { CalendarMonthView } from "@/features/scheduling/components/calendar-month-view";
import { CalendarWeekView } from "@/features/scheduling/components/calendar-week-view";
import { CalendarDayView } from "@/features/scheduling/components/calendar-day-view";
import { EventDetailDialog } from "@/features/scheduling/components/event-detail-dialog";
import { EventFormDialog } from "@/features/scheduling/components/event-form-dialog";

const C = SCHEDULING_CONFIG;
const F = C.form;

type FormState = {
  open: boolean;
  event: Event | null;
};

type SaveResult = {
  ok: boolean;
  message?: string;
};

export function SchedulingPageClient() {
  const [events, setEvents] = useState<Event[]>(() => loadEvents());
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [formState, setFormState] = useState<FormState>({
    open: false,
    event: null,
  });
  const [selected, setSelected] = useState<{
    event: Event;
    occurrence: EventOccurrence;
  } | null>(null);

  const todayKey = toLocalDateKey(new Date());
  const selectedKey = toLocalDateKey(selectedDate);
  const eventsById = useMemo(
    () => new Map(events.map((event) => [event.id, event])),
    [events],
  );

  const weekDays = useMemo(() => weekDates(selectedDate), [selectedDate]);
  const monthDays = useMemo(() => monthGridDates(cursor), [cursor]);

  const range = useMemo(() => {
    if (view === "month") {
      return {
        start: startOfMonth(cursor),
        end: endOfDay(new Date(monthDays[41] ?? cursor)),
      };
    }
    if (view === "week") {
      return { start: weekDays[0] ?? startOfDay(selectedDate), end: endOfDay(weekDays[6] ?? selectedDate) };
    }
    return { start: startOfDay(selectedDate), end: endOfDay(selectedDate) };
  }, [view, cursor, monthDays, weekDays, selectedDate]);

  const visibleOccurrences = useMemo(
    () =>
      getEventsForRange(
        events,
        range.start.toISOString(),
        range.end.toISOString(),
      ),
    [events, range.start, range.end],
  );

  const occurrencesByDate = useMemo(
    () => groupOccurrencesByDate(visibleOccurrences),
    [visibleOccurrences],
  );

  const selectedOccurrences = useMemo(
    () =>
      getEventsForRange(
        events,
        startOfDay(selectedDate).toISOString(),
        endOfDay(selectedDate).toISOString(),
      ),
    [events, selectedDate],
  );

  const upcomingOccurrences = useMemo(
    () =>
      getEventsForRange(
        events,
        new Date().toISOString(),
        addDays(new Date(), 14).toISOString(),
      ).slice(0, 5),
    [events],
  );

  const summary = useMemo(
    () => ({
      total: events.length,
      recurring: events.filter((event) => event.recurrence.frequency !== "none")
        .length,
      reminders: events.filter((event) => event.reminders.length > 0).length,
      today: selectedOccurrences.length,
    }),
    [events, selectedOccurrences],
  );

  const rangeLabel =
    view === "month"
      ? formatMonthLabel(cursor)
      : view === "week"
        ? `${formatShortDate(weekDays[0] ?? selectedDate)} – ${formatShortDate(
            weekDays[6] ?? selectedDate,
          )}`
        : formatDayLabel(selectedDate);

  const shiftRange = useCallback(
    (direction: -1 | 1) => {
      const next =
        view === "month"
          ? addMonths(cursor, direction)
          : addDays(cursor, view === "week" ? direction * 7 : direction);
      setCursor(next);
      setSelectedDate(next);
    },
    [cursor, view],
  );

  const handleSelectEvent = useCallback(
    (occurrence: EventOccurrence) => {
      const event = eventsById.get(occurrence.sourceEventId);
      if (!event) {
        clientLogger.warn("scheduling.occurrence.source_missing");
        return;
      }
      setSelected({ event, occurrence });
    },
    [eventsById],
  );

  const handleSave = useCallback(
    (values: EventFormValues): SaveResult => {
      const existing = formState.event;
      try {
        const candidate = existing
          ? updateEventFromForm(existing, values)
          : createEventFromForm(values);
        const conflicts = findRecurrenceConflicts(events, candidate);
        if (conflicts.length > 0) {
          return { ok: false, message: F.error.conflict };
        }
        const next = existing
          ? events.map((event) => (event.id === existing.id ? candidate : event))
          : [candidate, ...events];
        if (!saveEvents(next)) {
          return { ok: false, message: F.error.saveFailed };
        }
        setEvents(next);
        return { ok: true };
      } catch (error) {
        clientLogger.error("scheduling.event.save_failed", error);
        return { ok: false, message: F.error.saveFailed };
      }
    },
    [events, formState.event],
  );

  const handleDelete = (event: Event) => {
    const next = events.filter((item) => item.id !== event.id);
    if (!saveEvents(next)) {
      toast.error(F.error.saveFailed);
      return;
    }
    setEvents(next);
    setSelected(null);
    toast.success(F.success.deleted);
  };

  const handleDownload = (event: Event) => {
    downloadIcs([event]);
    toast.success(F.success.downloaded);
  };

  const handleReset = () => {
    const next = resetEvents();
    setEvents(next);
    setSelected(null);
    toast.success(F.success.reset);
  };

  return (
    <div className="space-y-6">
      <Alert>
        <AlertDescription>{C.infoAlert}</AlertDescription>
      </Alert>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={view}
            onValueChange={(value) => setView(schedulingViewSchema.parse(value))}
          >
            <SelectTrigger aria-label={C.controls.viewLabel} className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">{C.views.month}</SelectItem>
              <SelectItem value="week">{C.views.week}</SelectItem>
              <SelectItem value="day">{C.views.day}</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => shiftRange(-1)}
            aria-label={C.navigation.previous}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <span className="min-w-40 text-center text-sm font-medium">
            {rangeLabel}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => shiftRange(1)}
            aria-label={C.navigation.next}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const now = new Date();
              setCursor(startOfMonth(now));
              setSelectedDate(now);
            }}
          >
            {C.navigation.today}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {C.actions.reset}
          </Button>
          <Button onClick={() => setFormState({ open: true, event: null })}>
            <CalendarPlus className="h-4 w-4" aria-hidden="true" />
            {C.actions.create}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label={C.summary.total} value={summary.total} />
        <SummaryCard label={C.summary.recurring} value={summary.recurring} />
        <SummaryCard label={C.summary.reminders} value={summary.reminders} />
        <SummaryCard label={C.summary.today} value={summary.today} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr),320px]">
        <section className="rounded-lg border p-3">
          {view === "month" ? (
            <CalendarMonthView
              days={monthDays}
              occurrencesByDate={occurrencesByDate}
              selectedDateKey={selectedKey}
              todayDateKey={todayKey}
              onSelectDate={setSelectedDate}
              onSelectEvent={handleSelectEvent}
            />
          ) : null}
          {view === "week" ? (
            <CalendarWeekView
              days={weekDays}
              occurrencesByDate={occurrencesByDate}
              selectedDateKey={selectedKey}
              todayDateKey={todayKey}
              onSelectDate={setSelectedDate}
              onSelectEvent={handleSelectEvent}
            />
          ) : null}
          {view === "day" ? (
            <CalendarDayView
              occurrences={selectedOccurrences}
              onSelectEvent={handleSelectEvent}
            />
          ) : null}
        </section>

        <aside className="space-y-4">
          <section className="space-y-3 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">{C.navigation.selectedDay}</h2>
              <Badge variant="outline">
                {formatShortDate(selectedDate)}
              </Badge>
            </div>
            {selectedOccurrences.length === 0 ? (
              <p className="text-sm text-muted-foreground">{C.navigation.empty}</p>
            ) : (
              <ul className="space-y-2">
                {selectedOccurrences.map((occurrence) => (
                  <li key={`agenda-${occurrence.id}`}>
                    <button
                      type="button"
                      className="w-full rounded-md border p-2 text-left text-xs hover:bg-muted/40"
                      onClick={() => handleSelectEvent(occurrence)}
                    >
                      <p className="font-medium">
                        {new Date(occurrence.start).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        — {occurrence.title}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3 rounded-lg border p-3">
            <h2 className="text-sm font-semibold">{C.navigation.upcoming}</h2>
            {upcomingOccurrences.length === 0 ? (
              <p className="text-sm text-muted-foreground">{C.navigation.empty}</p>
            ) : (
              <ul className="space-y-2">
                {upcomingOccurrences.map((occurrence) => (
                  <li key={`upcoming-${occurrence.id}`}>
                    <button
                      type="button"
                      className="w-full rounded-md border p-2 text-left text-xs hover:bg-muted/40"
                      onClick={() => handleSelectEvent(occurrence)}
                    >
                      <p className="font-medium">{occurrence.title}</p>
                      <p className="text-muted-foreground">
                        {formatShortDate(new Date(occurrence.start))} •{" "}
                        {new Date(occurrence.start).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      {formState.open ? (
        <EventFormDialog
          key={formState.event?.id ?? "new"}
          open
          event={formState.event}
          onOpenChange={(open) =>
            setFormState((prev) => ({ ...prev, open }))
          }
          onSave={handleSave}
        />
      ) : null}

      <EventDetailDialog
        selected={selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        onEdit={(event) => {
          setSelected(null);
          setFormState({ open: true, event });
        }}
        onDelete={handleDelete}
        onDownload={handleDownload}
      />
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
