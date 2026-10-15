import type { Metadata } from "next";

import { PageShell } from "@/components/layout/page-shell";
import { SCHEDULING_CONFIG } from "@/config/scheduling";
import { SchedulingPageClient } from "@/features/scheduling/components/scheduling-page-client";

export const metadata: Metadata = {
  title: SCHEDULING_CONFIG.title,
  description: SCHEDULING_CONFIG.description,
};

export default function SchedulingPage() {
  return (
    <PageShell
      title={SCHEDULING_CONFIG.title}
      description={SCHEDULING_CONFIG.description}
    >
      <SchedulingPageClient />
    </PageShell>
  );
}
