import type { Metadata } from "next";

import { PageShell } from "@/components/layout/page-shell";
import { BILLING_CONFIG } from "@/config/billing";
import { BillingPageClient } from "@/features/billing/components/billing-page-client";

export const metadata: Metadata = { title: BILLING_CONFIG.title };

export default function BillingPage() {
  return (
    <PageShell title={BILLING_CONFIG.title} description={BILLING_CONFIG.description}>
      <BillingPageClient />
    </PageShell>
  );
}
