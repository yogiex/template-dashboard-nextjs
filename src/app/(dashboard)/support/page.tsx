import type { Metadata } from "next";

import { PageShell } from "@/components/layout/page-shell";
import { SUPPORT_CONFIG } from "@/config/support";
import { SupportPageClient } from "@/features/support/components/support-page-client";

export const metadata: Metadata = { title: SUPPORT_CONFIG.title };

export default function SupportPage() {
  return (
    <PageShell title={SUPPORT_CONFIG.title} description={SUPPORT_CONFIG.description}>
      <SupportPageClient />
    </PageShell>
  );
}
