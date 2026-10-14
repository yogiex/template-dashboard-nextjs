import type { Metadata } from "next";
import { Suspense } from "react";
import { ACTIVITY_PAGE_CONFIG } from "@/config/activity-page";
import { queryActivityFeed } from "@/features/activity/service";
import { ActivityList } from "@/features/activity/components/activity-list";
import { ActivityFilters } from "@/features/activity/components/activity-filters";

export const metadata: Metadata = {
  title: ACTIVITY_PAGE_CONFIG.title,
  description: ACTIVITY_PAGE_CONFIG.description,
  robots: { index: false, follow: false },
};

function ActivityFallback() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-full animate-pulse rounded bg-muted" />
    </div>
  );
}

export default function ActivityPage() {
  return (
    <Suspense fallback={<ActivityFallback />}>
      <ActivityContent />
    </Suspense>
  );
}

async function ActivityContent() {
  const query: Record<string, string> = {};

  const { items } = queryActivityFeed(query as Record<string, unknown>);

  return (
    <div className="space-y-6">
      <ActivityFilters />
      <ActivityList activities={items} isLoaded={true} />
    </div>
  );
}
