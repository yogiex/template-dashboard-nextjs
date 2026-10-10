import type { Metadata } from "next";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { LOG_MANAGEMENT_PAGE_CONFIG } from "@/config/log-management";
import {
  DisposalControlsPanel,
  DisposalPolicyTable,
  DisposalQueueTable,
} from "@/features/log-management/components/disposal-policy-table";
import { LogSectionNav } from "@/features/log-management/components/log-section-nav";
import { getDisposalInventory } from "@/features/log-management/service";

export const metadata: Metadata = {
  title: "Disposal log",
  description: "Kebijakan penghapusan log, verifikasi, dan antrian disposal.",
};

export default function LogDisposalPage() {
  const config = LOG_MANAGEMENT_PAGE_CONFIG;
  const inventory = getDisposalInventory();

  return (
    <div className="space-y-6">
      <LogSectionNav current={config.sections.disposal.href} />

      <Alert>
        <AlertDescription>{config.mockAlert}</AlertDescription>
      </Alert>

      <DisposalPolicyTable policies={inventory.policies} />

      <DisposalControlsPanel
        prevention={inventory.prevention}
        verificationSteps={inventory.verificationSteps}
      />

      <DisposalQueueTable items={inventory.queue} />
    </div>
  );
}
