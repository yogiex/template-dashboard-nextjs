import "server-only";

import { getEvents } from "@/features/observability/lib/store";
import { uebaActorIdSchema } from "@/features/ueba/schema";

export type ActorTimelineEntry = {
  id: string;
  timestamp: string;
  name: string;
  value: number;
};

/** Aktivitas terakhir seorang aktor, untuk halaman detail profil risiko. */
export function getActorTimeline(input: unknown, limit = 20): ActorTimelineEntry[] {
  const actorId = uebaActorIdSchema.safeParse(input);

  if (!actorId.success) {
    return [];
  }

  return getEvents({ actorId: actorId.data })
    .slice(-limit)
    .reverse()
    .map((event) => ({
      id: event.id,
      timestamp: event.timestamp,
      name: event.name,
      value: event.value,
    }));
}
