"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertCircle, CalendarPlus } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SCHEDULING_CONFIG } from "@/config/scheduling";
import {
  eventCategorySchema,
  recurrenceFrequencySchema,
  eventFormSchema,
  type Event,
  type EventFormValues,
} from "@/features/scheduling/schema";

const C = SCHEDULING_CONFIG.form;

type FieldErrors = Partial<Record<keyof EventFormValues, string>>;

type SaveResult = {
  ok: boolean;
  message?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: Event | null;
  onSave: (values: EventFormValues) => SaveResult;
};

function pad(value: number): string {
  return `${value}`.padStart(2, "0");
}

function toDateTimeLocal(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDateTimeLocal(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function toDateOnly(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function emptyValues(): EventFormValues {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  const end = new Date(start.getTime() + 60 * 60_000);
  return {
    title: "",
    description: "",
    location: "",
    category: "meeting",
    start: start.toISOString(),
    end: end.toISOString(),
    allDay: false,
    recurrence: { frequency: "none", interval: 1, until: null },
    reminders: [],
    attendees: [],
  };
}

function toFormValues(event?: Event | null): EventFormValues {
  if (!event) return emptyValues();
  return {
    title: event.title,
    description: event.description,
    location: event.location,
    category: event.category,
    start: event.start,
    end: event.end,
    allDay: event.allDay,
    recurrence: event.recurrence,
    reminders: event.reminders,
    attendees: event.attendees,
  };
}

function toFieldErrors(error: unknown): FieldErrors {
  const fieldErrors: FieldErrors = {};
  if (!error || typeof error !== "object" || !("issues" in error)) {
    return fieldErrors;
  }
  const issues = (
    error as {
      issues?: Array<{ path?: Array<string | number>; message?: string }>;
    }
  ).issues;
  for (const issue of issues ?? []) {
    const key = issue.path?.[0];
    if (typeof key === "string" && !fieldErrors[key as keyof EventFormValues]) {
      fieldErrors[key as keyof EventFormValues] = issue.message ?? C.error.generic;
    }
  }
  return fieldErrors;
}

export function EventFormDialog({
  open,
  onOpenChange,
  event,
  onSave,
}: Props) {
  const [values, setValues] = useState<EventFormValues>(() => toFormValues(event));
  const [attendeeText, setAttendeeText] = useState(() =>
    (event?.attendees ?? []).join(", "),
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const reminderOptions = useMemo(
    () => [
      { value: 0, label: SCHEDULING_CONFIG.reminders.onTime },
      { value: 10, label: SCHEDULING_CONFIG.reminders.tenMinutes },
      { value: 30, label: SCHEDULING_CONFIG.reminders.thirtyMinutes },
      { value: 60, label: SCHEDULING_CONFIG.reminders.oneHour },
      { value: 1440, label: SCHEDULING_CONFIG.reminders.oneDay },
    ],
    [],
  );

  const update = <K extends keyof EventFormValues>(
    key: K,
    value: EventFormValues[K],
  ) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const toggleReminder = (minutes: number) => {
    setValues((prev) => ({
      ...prev,
      reminders: prev.reminders.includes(minutes)
        ? prev.reminders.filter((item) => item !== minutes)
        : [...prev.reminders, minutes].sort((a, b) => a - b),
    }));
  };

  const submit = () => {
    setPending(true);
    const attendees = attendeeText
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const parsed = eventFormSchema.safeParse({ ...values, attendees });
    setPending(false);
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error));
      setFormMessage(parsed.error.issues[0]?.message ?? C.error.generic);
      return;
    }

    const result = onSave(parsed.data);
    if (!result.ok) {
      setFormMessage(result.message ?? C.error.saveFailed);
      return;
    }
    toast.success(event ? C.success.updated : C.success.created);
    onOpenChange(false);
  };

  const startLocal = toDateTimeLocal(values.start);
  const endLocal = toDateTimeLocal(values.end);
  const untilLocal = toDateOnly(values.recurrence.until);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {event ? C.editTitle : C.createTitle}
          </DialogTitle>
          <DialogDescription>{C.description}</DialogDescription>
        </DialogHeader>

        <form
          className="space-y-5"
          autoComplete="off"
          onSubmit={(submitEvent) => {
            submitEvent.preventDefault();
            submit();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="scheduling-title">{C.label.title}</Label>
            <Input
              id="scheduling-title"
              className="h-10"
              placeholder={C.placeholder.title}
              value={values.title}
              onChange={(changeEvent) => update("title", changeEvent.target.value)}
              aria-invalid={errors.title ? true : undefined}
            />
            {errors.title ? (
              <p className="text-xs text-destructive">{errors.title}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="scheduling-description">{C.label.description}</Label>
            <Textarea
              id="scheduling-description"
              rows={3}
              placeholder={C.placeholder.description}
              value={values.description}
              onChange={(changeEvent) =>
                update("description", changeEvent.target.value)
              }
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="scheduling-start">{C.label.start}</Label>
              <Input
                id="scheduling-start"
                type="datetime-local"
                className="h-10"
                value={startLocal}
                onChange={(changeEvent) => {
                  const next = fromDateTimeLocal(changeEvent.target.value);
                  if (next) update("start", next);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scheduling-end">{C.label.end}</Label>
              <Input
                id="scheduling-end"
                type="datetime-local"
                className="h-10"
                value={endLocal}
                onChange={(changeEvent) => {
                  const next = fromDateTimeLocal(changeEvent.target.value);
                  if (next) update("end", next);
                }}
              />
              {errors.end ? (
                <p className="text-xs text-destructive">{errors.end}</p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="scheduling-location">{C.label.location}</Label>
              <Input
                id="scheduling-location"
                className="h-10"
                placeholder={C.placeholder.location}
                value={values.location}
                onChange={(changeEvent) =>
                  update("location", changeEvent.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{C.label.category}</Label>
              <Select
                value={values.category}
                onValueChange={(value) => update("category", eventCategorySchema.parse(value))}
              >
                <SelectTrigger aria-label={C.label.category} className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SCHEDULING_CONFIG.categories) as Array<
                    keyof typeof SCHEDULING_CONFIG.categories
                  >).map((category) => (
                    <SelectItem key={category} value={category}>
                      {SCHEDULING_CONFIG.categories[category]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="scheduling-all-day"
              checked={values.allDay}
              onCheckedChange={(checked) => update("allDay", Boolean(checked))}
            />
            <Label htmlFor="scheduling-all-day">{C.label.allDay}</Label>
          </div>

          <div className="space-y-3 rounded-lg border p-3">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{C.label.recurrence}</Label>
                <Select
                  value={values.recurrence.frequency}
                  onValueChange={(value) =>
                    update("recurrence", {
                      ...values.recurrence,
                      frequency: recurrenceFrequencySchema.parse(value),
                    })
                  }
                >
                  <SelectTrigger aria-label={C.label.recurrence} className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      Object.keys(SCHEDULING_CONFIG.recurrence) as Array<
                        keyof typeof SCHEDULING_CONFIG.recurrence
                      >
                    ).map((frequency) => (
                      <SelectItem key={frequency} value={frequency}>
                        {SCHEDULING_CONFIG.recurrence[frequency]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduling-interval">{C.label.interval}</Label>
                <Input
                  id="scheduling-interval"
                  type="number"
                  min={1}
                  max={12}
                  className="h-10"
                  value={values.recurrence.interval}
                  onChange={(changeEvent) => {
                    const interval = Number(changeEvent.target.value);
                    update("recurrence", {
                      ...values.recurrence,
                      interval: Number.isFinite(interval) && interval > 0 ? interval : 1,
                    });
                  }}
                />
              </div>
            </div>

            {values.recurrence.frequency !== "none" ? (
              <div className="space-y-2">
                <Label htmlFor="scheduling-until">{C.label.until}</Label>
                <Input
                  id="scheduling-until"
                  type="date"
                  className="h-10"
                  value={untilLocal}
                  onChange={(changeEvent) =>
                    update("recurrence", {
                      ...values.recurrence,
                      until: changeEvent.target.value || null,
                    })
                  }
                />
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>{C.label.reminders}</Label>
            <div className="flex flex-wrap gap-2">
              {reminderOptions.map((option) => {
                const active = values.reminders.includes(option.value);
                return (
                  <Button
                    key={option.value}
                    type="button"
                    size="sm"
                    variant={active ? "default" : "outline"}
                    onClick={() => toggleReminder(option.value)}
                  >
                    {option.label}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="scheduling-attendees">{C.label.attendees}</Label>
            <Input
              id="scheduling-attendees"
              className="h-10"
              placeholder={C.placeholder.attendees}
              value={attendeeText}
              onChange={(changeEvent) => setAttendeeText(changeEvent.target.value)}
            />
            {errors.attendees ? (
              <p className="text-xs text-destructive">{errors.attendees}</p>
            ) : null}
          </div>

          {formMessage ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              <AlertDescription>{formMessage}</AlertDescription>
            </Alert>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {C.cancel}
            </Button>
            <Button type="submit" disabled={pending}>
              <CalendarPlus className="h-4 w-4" aria-hidden="true" />
              {event ? C.submitUpdate : C.submitCreate}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
