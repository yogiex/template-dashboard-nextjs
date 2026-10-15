import { z } from "zod";

export const EVENT_CATEGORIES = [
  "meeting",
  "focus",
  "release",
  "personal",
] as const;
export const eventCategorySchema = z.enum(EVENT_CATEGORIES);
export type EventCategory = z.infer<typeof eventCategorySchema>;

export const RECURRENCE_FREQUENCIES = [
  "none",
  "daily",
  "weekly",
  "monthly",
] as const;
export const recurrenceFrequencySchema = z.enum(RECURRENCE_FREQUENCIES);
export type RecurrenceFrequency = z.infer<typeof recurrenceFrequencySchema>;

export const recurrenceSchema = z.object({
  frequency: recurrenceFrequencySchema,
  interval: z.number().int().min(1).max(12),
  until: z.string().date().nullable(),
});
export type Recurrence = z.infer<typeof recurrenceSchema>;

export const REMINDER_OPTIONS = [0, 10, 30, 60, 1440] as const;
export const reminderSchema = z.number().int().min(0).max(1440);
export const reminderListSchema = z.array(reminderSchema).max(5);
export type ReminderMinutes = z.infer<typeof reminderSchema>;

const idSchema = z
  .string()
  .min(1, "ID wajib diisi")
  .max(64, "ID tidak valid")
  .regex(/^[a-zA-Z0-9_-]+$/, "ID tidak valid");

const isoDateTimeSchema = z.string().datetime({ message: "Waktu tidak valid" });

const attendeeSchema = z
  .string()
  .trim()
  .min(1, "Peserta tidak boleh kosong")
  .max(64, "Peserta terlalu panjang")
  .email("Format email tidak valid");

const baseEventShape = {
  title: z
    .string()
    .trim()
    .min(1, "Judul wajib diisi")
    .max(120, "Judul maksimal 120 karakter"),
  description: z
    .string()
    .trim()
    .max(2000, "Deskripsi maksimal 2000 karakter")
    .default(""),
  location: z
    .string()
    .trim()
    .max(120, "Lokasi maksimal 120 karakter")
    .default(""),
  category: eventCategorySchema,
  start: isoDateTimeSchema,
  end: isoDateTimeSchema,
  allDay: z.boolean(),
  recurrence: recurrenceSchema,
  reminders: reminderListSchema,
  attendees: z.array(attendeeSchema).max(50),
} satisfies z.ZodRawShape;

const eventObjectSchema = z.object(baseEventShape);

function refineEventShape(
  value: z.infer<typeof eventObjectSchema>,
  ctx: z.RefinementCtx,
): void {
  const start = Date.parse(value.start);
  const end = Date.parse(value.end);
  if (Number.isNaN(start) || Number.isNaN(end)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["start"],
      message: "Waktu mulai atau selesai tidak valid",
    });
    return;
  }
  if (end <= start) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["end"],
      message: "Waktu selesai harus setelah waktu mulai",
    });
  }
  if (!value.allDay && end - start < 60_000) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["end"],
      message: "Durasi minimal 1 menit",
    });
  }
}

export const eventSchema = eventObjectSchema
  .extend({
    id: idSchema,
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
  })
  .superRefine(refineEventShape);

export type Event = z.infer<typeof eventSchema>;

export const eventListSchema = z.array(eventSchema).max(500);

export const eventFormSchema = eventObjectSchema.superRefine(refineEventShape);
export type EventFormValues = z.infer<typeof eventFormSchema>;
export type EventFormInput = z.input<typeof eventFormSchema>;

export const schedulingViewSchema = z.enum(["month", "week", "day"]);
export type SchedulingView = z.infer<typeof schedulingViewSchema>;

export function createEventId(): string {
  try {
    return `evt_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  } catch {
    return `evt_${Math.random().toString(36).slice(2, 12)}`;
  }
}

export function createEventFromForm(
  values: EventFormValues,
  now = new Date(),
): Event {
  const timestamp = now.toISOString();
  return eventSchema.parse({
    ...values,
    id: createEventId(),
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

export function updateEventFromForm(
  existing: Event,
  values: EventFormValues,
  now = new Date(),
): Event {
  return eventSchema.parse({
    ...values,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: now.toISOString(),
  });
}
