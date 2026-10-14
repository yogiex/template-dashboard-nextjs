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

export default function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<ActivityFallback />}>
      <ActivityContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ActivityContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query: Record<string, string> = {};
  if (typeof params.category === "string") query.category = params.category;

  const { items } = queryActivityFeed(query as Record<string, unknown>);

  return (
    <div className="space-y-6">
      <ActivityFilters />
      <ActivityList activities={items} isLoaded={true} />
    </div>
  );
}
