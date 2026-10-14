"use client";

import { EmptyState } from "@/components/custom/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { History } from "lucide-react";
import { ActivityItem } from "@/features/activity/components/activity-item";
import type { Activity } from "@/features/activity/schema";

export type ActivityListProps = {
  activities: readonly Activity[];
  isLoaded: boolean;
};

export function ActivityList({ activities, isLoaded }: ActivityListProps) {
  if (!isLoaded) {
    return (
      <section aria-busy className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        <div role="status" aria-label="Memuat aktivitas">
          <span className="sr-only">Memuat aktivitas</span>
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="m-3 h-14 w-[calc(100%-1.5rem)]" />
          ))}
        </div>
      </section>
    );
  }

  if (activities.length === 0) {
    return (
      <EmptyState
        title="Tidak ada aktivitas"
        description="Aktivitas akan tampil di sini."
        icon={History}
      />
    );
  }

  return (
    <section
      aria-label="Linimasa aktivitas"
      className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10"
    >
      <ul className="max-h-[32rem] overflow-y-auto" aria-label="Daftar aktivitas">
        {activities.map((activity) => (
          <ActivityItem key={activity.id} activity={activity} />
        ))}
      </ul>
    </section>
  );
}
