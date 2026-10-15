import { clientLogger } from "@/lib/logger-client";
import {
  eventListSchema,
  type Event,
  type EventCategory,
} from "@/features/scheduling/schema";

const STORAGE_KEY = "scheduling.events";
const DAY_MS = 86_400_000;
const MAX_EXPANSION_OCCURRENCES = 365;

export interface EventOccurrence {
  id: string;
  sourceEventId: string;
  title: string;
  description: string;
  location: string;
  category: EventCategory;
  start: string;
  end: string;
  attendees: readonly string[];
  recurring: boolean;
}

function atTime(dayOffset: number, hour: number, minute = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function seedEvents(): Event[] {
  const raw = [
    {
      id: "evt_seed_standup",
      title: "Standup harian",
      description: "Update cepat per fitur dan blocker.",
      location: "Google Meet",
      category: "meeting",
      start: atTime(0, 9),
      end: atTime(0, 9, 30),
      allDay: false,
      recurrence: { frequency: "weekly", interval: 1, until: null },
      reminders: [10],
      attendees: ["budi@acme.co", "sari@acme.co"],
      createdAt: atTime(-30, 8),
      updatedAt: atTime(-5, 8),
    },
    {
      id: "evt_seed_release",
      title: "Rilis Sprint",
      description: "Deploy staging lalu verifikasi smoke test.",
      location: "Ruang Engineering",
      category: "release",
      start: atTime(3, 14),
      end: atTime(3, 16),
      allDay: false,
      recurrence: { frequency: "weekly", interval: 1, until: null },
      reminders: [30, 1440],
      attendees: ["tim@acme.co"],
      createdAt: atTime(-20, 10),
      updatedAt: atTime(-5, 10),
    },
    {
      id: "evt_seed_focus",
      title: "Fokus Deep Work",
      description: "Tanpa meeting, fokus penulisan kode scheduling.",
      location: "",
      category: "focus",
      start: atTime(1, 8),
      end: atTime(1, 10),
      allDay: false,
      recurrence: { frequency: "daily", interval: 1, until: null },
      reminders: [0],
      attendees: [],
      createdAt: atTime(-15, 7),
      updatedAt: atTime(-3, 7),
    },
    {
      id: "evt_seed_payroll",
      title: "Rapat Payroll Bulanan",
      description: "Review rekap payroll dan approval.",
      location: "Ruang Finance",
      category: "meeting",
      start: atTime(12, 13),
      end: atTime(12, 14),
      allDay: false,
      recurrence: { frequency: "monthly", interval: 1, until: null },
      reminders: [60],
      attendees: ["finance@acme.co"],
      createdAt: atTime(-40, 9),
      updatedAt: atTime(-6, 9),
    },
  ];
  return eventListSchema.parse(raw);
}

function readValidEvents(): Event[] | null {
  if (typeof window === "undefined") return seedEvents();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    const result = eventListSchema.safeParse(parsed);
    if (result.success) return result.data;
    clientLogger.warn("scheduling.events.invalid");
    return null;
  } catch (error) {
    clientLogger.error("scheduling.events.load_failed", error);
    return null;
  }
}

export function loadEvents(): Event[] {
  const stored = readValidEvents();
  if (stored) return stored;
  const seeded = seedEvents();
  saveEvents(seeded);
  return seeded;
}

export function saveEvents(events: Event[]): boolean {
  const result = eventListSchema.safeParse(events);
  if (!result.success) {
    clientLogger.warn("scheduling.events.save_invalid");
    return false;
  }
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(result.data));
    return true;
  } catch (error) {
    clientLogger.error("scheduling.events.save_failed", error);
    return false;
  }
}

export function resetEvents(): Event[] {
  const seeded = seedEvents();
  saveEvents(seeded);
  return seeded;
}

function parseTime(value: string): number {
  return Date.parse(value);
}

export function isDateOnly(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function addMonths(start: Date, months: number): Date {
  const next = new Date(start.getTime());
  const day = next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + months);
  const daysInMonth = new Date(
    next.getFullYear(),
    next.getMonth() + 1,
    0,
  ).getDate();
  next.setDate(Math.min(day, daysInMonth));
  return next;
}

function multiplyDuration(startMs: number, endMs: number): number {
  return Math.max(endMs - startMs, 60_000);
}

function getRecurrenceStart(
  startDate: Date,
  frequency: Event["recurrence"]["frequency"],
  interval: number,
  occurrence: number,
): Date {
  switch (frequency) {
    case "daily":
      return new Date(startDate.getTime() + occurrence * interval * DAY_MS);
    case "weekly":
      return new Date(startDate.getTime() + occurrence * interval * 7 * DAY_MS);
    case "monthly":
      return addMonths(startDate, occurrence * interval);
    default:
      return new Date(startDate.getTime());
  }
}

function withinUntil(startDate: Date, until: string | null): boolean {
  if (!until) return true;
  const normalized = new Date(`${until}T23:59:59.999`);
  return startDate.getTime() <= normalized.getTime();
}

export function overlaps(a: Event, b: Event): boolean {
  return (
    parseTime(a.start) < parseTime(b.end) &&
    parseTime(b.start) < parseTime(a.end)
  );
}

function occurrencesOverlap(a: EventOccurrence, b: EventOccurrence): boolean {
  return (
    parseTime(a.start) < parseTime(b.end) &&
    parseTime(b.start) < parseTime(a.end)
  );
}

/**
 * Mencari konflik termasuk pengulangan, dengan horizon terbatas 90 hari dari
 * kandidat. Tanpa batas ini, event harian tak hingga bisa memperluang ribuan
 * instance ketika memvalidasi form.
 */
export function findRecurrenceConflicts(
  events: readonly Event[],
  candidate: Event,
): EventOccurrence[] {
  const horizonDate = new Date(
    Math.max(
      parseTime(candidate.end) + 90 * DAY_MS,
      parseTime(candidate.start) + DAY_MS,
    ),
  );
  const horizonIso = horizonDate.toISOString();
  const candidateOccurrences = expandEvents([candidate], horizonIso);
  const otherOccurrences = expandEvents(
    events.filter((event) => event.id !== candidate.id),
    horizonIso,
  );
  return otherOccurrences.filter((other) =>
    candidateOccurrences.some((item) => occurrencesOverlap(item, other)),
  );
}

export function findConflicts(
  events: readonly Event[],
  candidate: Event,
  excludeId?: string,
): Event[] {
  return events
    .filter((event) => event.id !== excludeId)
    .filter((event) => overlaps(event, candidate));
}

function occurrenceId(event: Event, startMs: number): string {
  return `${event.id}__${startMs}`;
}

export function expandEvents(
  events: readonly Event[],
  horizonIso?: string,
): EventOccurrence[] {
  const horizon = horizonIso ? parseTime(horizonIso) : Number.POSITIVE_INFINITY;
  if (!Number.isFinite(horizon)) {
    return events.map((event) => toOccurrence(event, undefined, undefined, false));
  }

  const horizonDate = new Date(horizon);
  const output: EventOccurrence[] = [];

  for (const event of events) {
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      continue;
    }
    const duration = multiplyDuration(startDate.getTime(), endDate.getTime());
    const frequency = event.recurrence.frequency;

    if (frequency === "none") {
      output.push(
        toOccurrence(
          event,
          startDate.getTime(),
          startDate.getTime() + duration,
          false,
        ),
      );
      continue;
    }

    let count = 0;
    let occurrence = 0;
    while (count < MAX_EXPANSION_OCCURRENCES) {
      const occurrenceStart = getRecurrenceStart(
        startDate,
        frequency,
        event.recurrence.interval,
        occurrence,
      );
      if (!withinUntil(occurrenceStart, event.recurrence.until)) {
        break;
      }
      if (occurrenceStart.getTime() > horizonDate.getTime()) {
        break;
      }
      output.push(
        toOccurrence(
          event,
          occurrenceStart.getTime(),
          occurrenceStart.getTime() + duration,
          true,
        ),
      );
      count += 1;
      occurrence += 1;
    }
  }

  return output.sort((a, b) => parseTime(a.start) - parseTime(b.start));
}

function toOccurrence(
  event: Event,
  startMs?: number,
  endMs?: number,
  recurring = false,
): EventOccurrence {
  const start = startMs ?? parseTime(event.start);
  const end = endMs ?? parseTime(event.end);
  return {
    id: occurrenceId(event, start),
    sourceEventId: event.id,
    title: event.title,
    description: event.description,
    location: event.location,
    category: event.category,
    start: new Date(start).toISOString(),
    end: new Date(end).toISOString(),
    attendees: event.attendees,
    recurring,
  };
}

export function getEventsForRange(
  events: readonly Event[],
  fromIso: string,
  toIso: string,
): EventOccurrence[] {
  const from = parseTime(fromIso);
  const to = parseTime(toIso);
  if (Number.isNaN(from) || Number.isNaN(to) || to <= from) return [];
  return expandEvents(events, new Date(to).toISOString()).filter(
    (occurrence) =>
      parseTime(occurrence.end) > from && parseTime(occurrence.start) < to,
  );
}

export function groupOccurrencesByDate(
  occurrences: readonly EventOccurrence[],
): Map<string, EventOccurrence[]> {
  const map = new Map<string, EventOccurrence[]>();
  for (const occurrence of occurrences) {
    const key = new Date(occurrence.start).toLocaleDateString("en-CA");
    const list = map.get(key) ?? [];
    list.push(occurrence);
    map.set(key, list);
  }
  return map;
}

export function buildIcs(events: readonly Event[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//template-dashboard-nextjs//Scheduling//ID",
  ];
  for (const event of events) {
    const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0];
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.id}@local`,
      `DTSTAMP:${stamp}Z`,
      `DTSTART:${toIcsStamp(event.start)}`,
      `DTEND:${toIcsStamp(event.end)}`,
      `SUMMARY:${escapeIcs(event.title)}`,
    );
    if (event.description) {
      lines.push(`DESCRIPTION:${escapeIcs(event.description)}`);
    }
    if (event.location) {
      lines.push(`LOCATION:${escapeIcs(event.location)}`);
    }
    if (event.recurrence.frequency !== "none") {
      lines.push(
        `RRULE:FREQ=${event.recurrence.frequency.toUpperCase()};INTERVAL=${
          event.recurrence.interval
        }${
          event.recurrence.until ? `;UNTIL=${toIcsDateOnly(event.recurrence.until)}` : ""
        }`,
      );
    }
    for (const reminder of event.reminders) {
      const minutes = reminder === 0 ? 0 : reminder;
      lines.push(
        "BEGIN:VALARM",
        `TRIGGER:-PT${minutes}M`,
        "ACTION:DISPLAY",
        "DESCRIPTION:Reminder",
        "END:VALARM",
      );
    }
    lines.push("END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}

function toIcsStamp(value: string): string {
  const date = new Date(value);
  return `${date.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
}

function toIcsDateOnly(value: string): string {
  return value.replace(/-/g, "");
}

function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

export function downloadIcs(events: readonly Event[]): void {
  if (typeof window === "undefined" || events.length === 0) return;
  const blob = new Blob([buildIcs(events)], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `scheduling-${new Date().toISOString().split("T")[0]}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
