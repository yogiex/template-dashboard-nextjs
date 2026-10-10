import type { Metadata } from "next";
import Link from "next/link";

import { MFA_BACKUP_CODE_PAGE_CONFIG } from "@/config/mfa-pages";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { MfaBackupCodeForm } from "@/features/auth/components/mfa-backup-code-form";
import { getAuthPageConfig } from "@/features/auth/service";

export const metadata: Metadata = {
  title: "Gunakan Backup Code",
  description: "Masukkan backup code untuk melanjutkan login.",
};

export default async function MfaBackupCodePage() {
  const config = await getAuthPageConfig();

  return (
    <AuthShell config={config}>
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            {MFA_BACKUP_CODE_PAGE_CONFIG.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {MFA_BACKUP_CODE_PAGE_CONFIG.description}
          </p>
        </header>

        <MfaBackupCodeForm
          config={MFA_BACKUP_CODE_PAGE_CONFIG}
          isDemoMode={process.env.NODE_ENV !== "production"}
        />

        <p className="text-center text-sm text-muted-foreground">
          <Link
            href={MFA_BACKUP_CODE_PAGE_CONFIG.backToChallengeHref}
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            {MFA_BACKUP_CODE_PAGE_CONFIG.backToChallengeLabel}
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
