import type { Metadata } from "next";

import { PageShell } from "@/components/layout/page-shell";
import { NOTIFICATION_PAGE_CONFIG } from "@/config/notification-page";
import { NotificationInbox } from "@/features/notification/components/notification-inbox";

export const metadata: Metadata = { title: "Notifikasi" };

export default function NotificationsPage() {
  return (
    <PageShell
      title={NOTIFICATION_PAGE_CONFIG.title}
      description={NOTIFICATION_PAGE_CONFIG.description}
    >
      <NotificationInbox />
    </PageShell>
  );
}
