"use client";

import { MFA_SETTINGS_CONFIG } from "@/config/mfa-settings";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MfaEnrollCard } from "@/features/mfa/components/mfa-enroll-card";
import { DeviceTrustToggle } from "@/features/mfa/components/device-trust-toggle";

const C = MFA_SETTINGS_CONFIG;

export function MfaPageClient() {
  return (
    <div className="max-w-3xl space-y-6">
      <Alert>
        <AlertDescription>{C.infoAlert}</AlertDescription>
      </Alert>
      <MfaEnrollCard />
      <DeviceTrustToggle />
    </div>
  );
}
