"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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
import { NOTIFICATION_SETTINGS_CONFIG } from "@/config/notification-settings";
import {
  notificationPreferencesSchema,
  type NotificationPreferences,
} from "@/features/notification/schema-preferences";

const STORAGE_KEY = "notification.prefs";

function loadPrefs(): NotificationPreferences {
  const defaults: NotificationPreferences = {
    inApp: true,
    email: true,
    push: false,
    quietHoursEnabled: false,
    quietStart: "22:00",
    quietEnd: "07:00",
  };
  if (typeof window === "undefined") return defaults;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
}

function savePrefs(prefs: NotificationPreferences) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function NotificationPreferencesForm() {
  const [saved, setSaved] = useState(false);
  const form = useForm<NotificationPreferences>({
    resolver: zodResolver(notificationPreferencesSchema),
    defaultValues: loadPrefs(),
  });
  const isSubmitting = form.formState.isSubmitting;

  useEffect(() => {
    form.reset(loadPrefs());
  }, [form]);

  const onSubmit = async (values: NotificationPreferences) => {
    setSaved(false);
    savePrefs(values);
    setSaved(true);
    toast.success(NOTIFICATION_SETTINGS_CONFIG.savedLabel);
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6"
        noValidate
        autoComplete="off"
      >
        {saved ? (
          <Alert role="status">
            <AlertDescription>
              {NOTIFICATION_SETTINGS_CONFIG.savedLabel}
            </AlertDescription>
          </Alert>
        ) : null}

        <Alert>
          <AlertDescription>
            {NOTIFICATION_SETTINGS_CONFIG.infoAlert}
          </AlertDescription>
        </Alert>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">Kanal</h2>
          {(Object.keys(NOTIFICATION_SETTINGS_CONFIG.channels) as Array<
            keyof typeof NOTIFICATION_SETTINGS_CONFIG.channels
          >).map((key) => {
            const fieldKey = key === "inApp" ? "inApp" : key === "email" ? "email" : "push";
            return (
              <FormField
                key={key}
                control={form.control}
                name={fieldKey}
                render={({ field }) => (
                  <FormItem className="flex items-start space-x-3 space-y-0 rounded-md border p-3">
                    <FormControl>
                      <Checkbox
                        checked={field.value as boolean}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="text-sm font-normal">
                        {NOTIFICATION_SETTINGS_CONFIG.channels[key]}
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            );
          })}
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold">
            {NOTIFICATION_SETTINGS_CONFIG.quietHours.label}
          </h2>
          <p className="text-sm text-muted-foreground">
            {NOTIFICATION_SETTINGS_CONFIG.quietHours.description}
          </p>
          <FormField
            control={form.control}
            name="quietHoursEnabled"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value as boolean}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <FormLabel className="text-sm font-normal">
                  Aktifkan jam tenang
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
                  <FormLabel>{NOTIFICATION_SETTINGS_CONFIG.quietHours.start}</FormLabel>
                  <FormControl>
                    <Input className="h-10" {...field} />
                  </FormControl>
                  <FormDescription>Format HH:mm</FormDescription>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="quietEnd"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{NOTIFICATION_SETTINGS_CONFIG.quietHours.end}</FormLabel>
                  <FormControl>
                    <Input className="h-10" {...field} />
                  </FormControl>
                  <FormDescription>Format HH:mm</FormDescription>
                </FormItem>
              )}
            />
          </div>
        </section>

        <Button type="submit" disabled={isSubmitting} className="h-10">
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : null}
          {isSubmitting
            ? NOTIFICATION_SETTINGS_CONFIG.savingLabel
            : NOTIFICATION_SETTINGS_CONFIG.saveLabel}
        </Button>
      </form>
    </Form>
  );
}
