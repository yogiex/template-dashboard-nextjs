import type { Metadata } from "next";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { LOG_MANAGEMENT_PAGE_CONFIG } from "@/config/log-management";
import { LogSectionNav } from "@/features/log-management/components/log-section-nav";
import {
  RetentionMatrix,
  StorageCapacityCard,
  StorageOperationsPanel,
} from "@/features/log-management/components/retention-matrix";
import { getStorageInventory } from "@/features/log-management/service";

export const metadata: Metadata = {
  title: "Retensi log",
  description:
    "Kebijakan retensi per kategori, transfer antar tier, dan kapasitas store.",
};

export default function LogRetentionPage() {
  const config = LOG_MANAGEMENT_PAGE_CONFIG;
  const inventory = getStorageInventory();

  return (
    <div className="space-y-6">
      <LogSectionNav current={config.sections.retention.href} />

      <Alert>
        <AlertDescription>{config.mockAlert}</AlertDescription>
      </Alert>

      <RetentionMatrix policies={inventory.retention} />

      <StorageCapacityCard capacity={inventory.capacity} />

      <StorageOperationsPanel
        transfers={inventory.transfers}
        transferMethods={inventory.transferMethods}
        correlationRules={inventory.correlationRules}
        dataReduction={inventory.dataReduction}
        formats={inventory.formats}
        protection={inventory.protection}
      />
    </div>
  );
}
