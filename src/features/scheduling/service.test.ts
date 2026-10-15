import { describe, expect, it } from "vitest";

import { eventSchema, type Event } from "@/features/scheduling/schema";
import {
  expandEvents,
  findRecurrenceConflicts,
  getEventsForRange,
  overlaps,
} from "@/features/scheduling/service";

function makeEvent(overrides: Partial<Event> = {}): Event {
  return eventSchema.parse({
    id: "evt_test_1",
    title: "Test event",
    description: "",
    location: "",
    category: "meeting",
    start: "2026-01-01T00:00:00.000Z",
    end: "2026-01-01T01:00:00.000Z",
    allDay: false,
    recurrence: { frequency: "none", interval: 1, until: null },
    reminders: [],
    attendees: [],
    createdAt: "2025-12-01T00:00:00.000Z",
    updatedAt: "2025-12-01T00:00:00.000Z",
    ...overrides,
  });
}

describe("scheduling overlaps", () => {
  it("mendeteksi tabrakan rentang waktu", () => {
    const a = makeEvent();
    const b = makeEvent({
      id: "evt_test_2",
      start: "2026-01-01T00:30:00.000Z",
      end: "2026-01-01T02:00:00.000Z",
    });
    expect(overlaps(a, b)).toBe(true);
  });

  it("tidak menganggap bersinggungan sebagai tabrakan", () => {
    const a = makeEvent();
    const b = makeEvent({
      id: "evt_test_2",
      start: "2026-01-01T01:00:00.000Z",
      end: "2026-01-01T02:00:00.000Z",
    });
    expect(overlaps(a, b)).toBe(false);
  });
});

describe("scheduling recurrence", () => {
  const recurring = makeEvent({
    id: "evt_daily",
    recurrence: { frequency: "daily", interval: 1, until: null },
  });

  it("memperluas frekuensi harian sampai horizon", () => {
    const occurrences = expandEvents([recurring], "2026-01-04T00:00:00.000Z");
    expect(occurrences).toHaveLength(4);
    expect(occurrences[0]?.start).toBe("2026-01-01T00:00:00.000Z");
    expect(occurrences[3]?.start).toBe("2026-01-04T00:00:00.000Z");
  });

  it("menghormati tanggal until", () => {
    const bounded = makeEvent({
      id: "evt_bounded",
      recurrence: {
        frequency: "daily",
        interval: 1,
        until: "2026-01-03",
      },
    });
    const occurrences = expandEvents([bounded], "2026-01-31T00:00:00.000Z");
    expect(occurrences).toHaveLength(3);
    expect(occurrences.at(-1)?.start).toBe("2026-01-03T00:00:00.000Z");
  });

  it("memfilter occurrence menurut rentang", () => {
    const occurrences = getEventsForRange(
      [recurring],
      "2026-01-02T00:00:00.000Z",
      "2026-01-04T00:00:00.000Z",
    );
    expect(occurrences).toHaveLength(2);
    expect(occurrences[0]?.start).toBe("2026-01-02T00:00:00.000Z");
    expect(occurrences[1]?.start).toBe("2026-01-03T00:00:00.000Z");
  });
});

describe("scheduling recurrence conflict", () => {
  it("mendeteksi konflik antara dua event harian yang saling tumpang tindih", () => {
    const existing = makeEvent({
      id: "evt_existing_daily",
      recurrence: { frequency: "daily", interval: 1, until: null },
    });
    const candidate = makeEvent({
      id: "evt_candidate_daily",
      start: "2026-01-02T00:30:00.000Z",
      end: "2026-01-02T01:30:00.000Z",
      recurrence: { frequency: "daily", interval: 1, until: null },
    });
    expect(findRecurrenceConflicts([existing], candidate).length).toBeGreaterThan(0);
  });

  it("tidak konflik bila jam harian terpisah", () => {
    const existing = makeEvent({
      id: "evt_existing_morning",
      start: "2026-01-01T00:00:00.000Z",
      end: "2026-01-01T01:00:00.000Z",
      recurrence: { frequency: "daily", interval: 1, until: null },
    });
    const candidate = makeEvent({
      id: "evt_candidate_evening",
      start: "2026-01-02T10:00:00.000Z",
      end: "2026-01-02T11:00:00.000Z",
      recurrence: { frequency: "daily", interval: 1, until: null },
    });
    expect(findRecurrenceConflicts([existing], candidate)).toHaveLength(0);
  });
});

describe("scheduling schema", () => {
  it("menolak waktu selesai sebelum mulai", () => {
    const parsed = eventSchema.safeParse({
      ...makeEvent(),
      end: "2025-12-31T23:00:00.000Z",
    });
    expect(parsed.success).toBe(false);
  });

  it("menolak durasi kurang dari 1 menit untuk event non all-day", () => {
    const parsed = eventSchema.safeParse({
      ...makeEvent(),
      end: "2026-01-01T00:00:30.000Z",
    });
    expect(parsed.success).toBe(false);
  });
});
