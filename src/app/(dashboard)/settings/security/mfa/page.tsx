import type { Metadata } from "next";

import { MFA_SETTINGS_CONFIG } from "@/config/mfa-settings";
import { MfaPageClient } from "@/features/mfa/components/mfa-page-client";

export const metadata: Metadata = {
  title: MFA_SETTINGS_CONFIG.title,
};

export default function MfaSettingsPage() {
  return <MfaPageClient />;
}
