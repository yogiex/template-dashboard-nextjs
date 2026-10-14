import type { Metadata } from "next";

import { NOTIFICATION_SETTINGS_CONFIG } from "@/config/notification-settings";
import { NotificationPreferencesForm } from "@/features/notification/components/notification-preferences-form";

export const metadata: Metadata = {
  title: NOTIFICATION_SETTINGS_CONFIG.title,
};

export default function NotificationSettingsPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">
          {NOTIFICATION_SETTINGS_CONFIG.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          {NOTIFICATION_SETTINGS_CONFIG.description}
        </p>
      </div>
      <NotificationPreferencesForm />
    </div>
  );
}
