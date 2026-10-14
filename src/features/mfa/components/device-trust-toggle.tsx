"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { MFA_SETTINGS_CONFIG } from "@/config/mfa-settings";
import { loadMfaState, saveMfaState } from "@/features/mfa/service";

const C = MFA_SETTINGS_CONFIG;

export function DeviceTrustToggle() {
  const [state, setState] = useState(loadMfaState);
  useEffect(() => {
    setState(loadMfaState());
  }, []);

  const toggle = (checked: boolean) => {
    setState((prev) => {
      const next = { ...prev, deviceTrust: checked };
      saveMfaState(next);
      toast.success(C.trust.savedLabel);
      return next;
    });
  };

  return (
    <div className="space-y-2 rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <Checkbox
          id="device-trust"
          checked={state.deviceTrust}
          onCheckedChange={(checked) => toggle(checked === true)}
        />
        <div className="space-y-1">
          <Label htmlFor="device-trust">{C.trust.label}</Label>
          <p className="text-xs text-muted-foreground">
            {C.trust.description}
          </p>
        </div>
      </div>
      <Alert>
        <AlertDescription>{C.infoAlert}</AlertDescription>
      </Alert>
    </div>
  );
}
