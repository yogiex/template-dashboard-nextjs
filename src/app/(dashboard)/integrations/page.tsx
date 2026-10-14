import type { Metadata } from "next";

import { PageShell } from "@/components/layout/page-shell";
import { INTEGRATIONS_CONFIG } from "@/config/integrations";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { IntegrationGrid } from "@/features/integration/components/integration-grid";

export const metadata: Metadata = { title: INTEGRATIONS_CONFIG.title };

export default function IntegrationsPage() {
  return (
    <PageShell
      title={INTEGRATIONS_CONFIG.title}
      description={INTEGRATIONS_CONFIG.description}
    >
      <div className="max-w-6xl space-y-6">
        <Alert>
          <AlertDescription>{INTEGRATIONS_CONFIG.infoAlert}</AlertDescription>
        </Alert>
        <IntegrationGrid />
      </div>
    </PageShell>
  );
}
