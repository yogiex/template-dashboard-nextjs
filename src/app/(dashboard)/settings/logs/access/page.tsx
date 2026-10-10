import type { Metadata } from "next";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { LOG_MANAGEMENT_PAGE_CONFIG } from "@/config/log-management";
import {
  AccessMatrix,
  AccessModePanel,
} from "@/features/log-management/components/access-matrix";
import { LogSectionNav } from "@/features/log-management/components/log-section-nav";
import { getAccessInventory } from "@/features/log-management/service";

export const metadata: Metadata = {
  title: "Akses log",
  description: "Level akses log per role, mode akses, dan pemantauan akses.",
};

export default function LogAccessPage() {
  const config = LOG_MANAGEMENT_PAGE_CONFIG;
  const inventory = getAccessInventory();

  return (
    <div className="space-y-6">
      <LogSectionNav current={config.sections.access.href} />

      <Alert>
        <AlertDescription>{config.mockAlert}</AlertDescription>
      </Alert>

      <AccessMatrix grants={inventory.grants} />

      <AccessModePanel
        modes={inventory.modes}
        protections={inventory.protections}
        loggingRules={inventory.loggingRules}
        preservationOrder={inventory.preservationOrder}
        monitoring={inventory.monitoring}
      />
    </div>
  );
}
