import type { Metadata } from "next";

import { ACCOUNT_SETTINGS_CONFIG } from "@/config/account-settings";
import { AccountPageClient } from "@/features/account/components/account-page-client";

export const metadata: Metadata = {
  title: ACCOUNT_SETTINGS_CONFIG.title,
};

export default function AccountSettingsPage() {
  return <AccountPageClient />;
}
