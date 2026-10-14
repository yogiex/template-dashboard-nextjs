"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { clientLogger } from "@/lib/logger-client";
import {
  NOTIFICATION_SETTINGS_CONFIG,
} from "@/config/notification-settings";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  notificationPreferencesSchema,
  type NotificationPreferences,
} from "@/features/notification/schema-preferences";

const STORAGE_KEY = "notification.prefs";

const DEFAULT_PREFS: NotificationPreferences = {
  inApp: true,
  email: true,
  push: false,
  quietHoursEnabled: false,
  quietStart: "22:00",
  quietEnd: "07:00",
};

function loadPrefs(): NotificationPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsedJson: unknown = JSON.parse(raw);
    const merged =
      typeof parsedJson === "object" && parsedJson !== null
        ? { ...DEFAULT_PREFS, ...parsedJson }
        : DEFAULT_PREFS;
    const result = notificationPreferencesSchema.safeParse(merged);
    if (!result.success) {
      clientLogger.warn("notification.prefs.invalid", {
        issues: result.error.flatten(),
      });
      return DEFAULT_PREFS;
    }
    return result.data;
  } catch (error) {
    clientLogger.error("notification.prefs.load_failed", error);
    return DEFAULT_PREFS;
  }
}

function savePrefs(prefs: NotificationPreferences) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (error) {
    clientLogger.error("notification.prefs.save_failed", error);
    throw error;
  }
}

const channelKeys = ["inApp", "email", "push"] as const;
type ChannelKey = (typeof channelKeys)[number];

function channelFieldKey(key: ChannelKey): "inApp" | "email" | "push" {
  return key;
}

export function NotificationPreferencesForm() {
  const form = useForm<NotificationPreferences>({
    resolver: zodResolver(notificationPreferencesSchema),
    defaultValues: loadPrefs(),
  });

  useEffect(() => {
    form.reset(loadPrefs());
    // intentional mount-only sync; `form` reference is stable across renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (values: NotificationPreferences) => {
    try {
      savePrefs(values);
      toast.success(NOTIFICATION_SETTINGS_CONFIG.savedLabel);
    } catch {
      toast.error("Gagal menyimpan preferensi notifikasi.");
    }
  };

  const C = NOTIFICATION_SETTINGS_CONFIG;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6"
        noValidate
        autoComplete="off"
      >
        <Alert>
          <AlertDescription>{C.infoAlert}</AlertDescription>
        </Alert>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">
            {C.channelsSectionTitle}
          </h2>
          {channelKeys.map((key) => (
            <FormField
              key={key}
              control={form.control}
              name={channelFieldKey(key)}
              render={({ field }) => (
                <FormItem className="flex items-start space-x-3 space-y-0 rounded-md border p-3">
                  <FormControl>
                    <Checkbox
                      checked={Boolean(field.value)}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm font-normal">
                      {C.channels[key]}
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />
          ))}
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">{C.quietHours.label}</h2>
          <p className="text-sm text-muted-foreground">
            {C.quietHours.description}
          </p>
          <FormField
            control={form.control}
            name="quietHoursEnabled"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={Boolean(field.value)}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="text-sm font-normal">
                  {C.quietToggleLabel}
                </FormLabel>
              </FormItem>
            )}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="quietStart"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{C.quietHours.start}</FormLabel>
                  <FormControl>
                    <Input type="time" className="h-10" {...field} />
                  </FormControl>
                  <FormDescription>{C.timeFormatHint}</FormDescription>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="quietEnd"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{C.quietHours.end}</FormLabel>
                  <FormControl>
                    <Input type="time" className="h-10" {...field} />
                  </FormControl>
                  <FormDescription>{C.timeFormatHint}</FormDescription>
                </FormItem>
              )}
            />
          </div>
        </section>

        <Button type="submit" className="h-10">
          {C.saveLabel}
        </Button>
      </form>
    </Form>
  );
}