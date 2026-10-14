"use client";

import { useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { ACCOUNT_SETTINGS_CONFIG } from "@/config/account-settings";
import { AccountProfileForm } from "@/features/account/components/account-profile-form";
import { ChangePasswordForm } from "@/features/account/components/change-password-form";
import { DeleteAccountButton } from "@/features/account/components/delete-account-dialog";
import { SessionTable } from "@/features/account/components/session-table";
import { loadSessions, type SessionInfo as LoadedSession } from "@/features/account/service";

const C = ACCOUNT_SETTINGS_CONFIG;

export function AccountPageClient() {
  const [sessions, setSessions] = useState<LoadedSession[]>([]);

  useEffect(() => {
    setSessions(loadSessions());
  }, []);

  return (
    <div className="max-w-3xl space-y-8">
      <Alert>
        <AlertDescription>{C.infoAlert}</AlertDescription>
      </Alert>
      <AccountProfileForm />
      <ChangePasswordForm />
      <SessionTable sessions={sessions} />
      <section className="space-y-2 rounded-lg border border-destructive/30 p-4">
        <h2 className="text-base font-semibold text-destructive">
          {C.delete.title}
        </h2>
        <p className="text-sm text-muted-foreground">
          {C.delete.description}
        </p>
        <DeleteAccountButton />
      </section>
    </div>
  );
}
