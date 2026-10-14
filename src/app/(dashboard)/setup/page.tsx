import type { Metadata } from "next";

import { PageShell } from "@/components/layout/page-shell";
import { SETUP_WIZARD_CONFIG } from "@/config/setup-wizard";
import { SetupWizardShell } from "@/features/setup-wizard/components/setup-wizard-shell";

export const metadata: Metadata = { title: "Penyiapan Awal" };

export default function SetupWizardPage() {
  return (
    <PageShell
      title={SETUP_WIZARD_CONFIG.title}
      description={SETUP_WIZARD_CONFIG.description}
    >
      <SetupWizardShell config={SETUP_WIZARD_CONFIG} />
    </PageShell>
  );
}
