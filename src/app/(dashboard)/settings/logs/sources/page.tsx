import type { Metadata } from "next";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { LOG_MANAGEMENT_PAGE_CONFIG } from "@/config/log-management";
import { LogGenerationPanel } from "@/features/log-management/components/log-generation-panel";
import { LogSectionNav } from "@/features/log-management/components/log-section-nav";
import { getGenerationInventory } from "@/features/log-management/service";

export const metadata: Metadata = {
  title: "Sumber log",
  description: "Klasifikasi source, event type, dan karakter data wajib.",
};

export const dynamic = "force-dynamic";

export default function LogSourcesPage() {
  const config = LOG_MANAGEMENT_PAGE_CONFIG;
  const inventory = getGenerationInventory();

  return (
    <div className="space-y-6">
      <LogSectionNav current={config.sections.sources.href} />

      <Alert>
        <AlertDescription>{config.mockAlert}</AlertDescription>
      </Alert>

      <LogGenerationPanel
        classifications={inventory.classifications}
        allowed={inventory.allowed}
        prohibited={inventory.prohibited}
        policy={inventory.policy}
      />
    </div>
  );
}
