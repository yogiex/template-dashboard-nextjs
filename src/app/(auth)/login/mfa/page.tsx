import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { MFA_CHALLENGE_PAGE_CONFIG } from "@/config/mfa-pages";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { MfaLoginForm } from "@/features/auth/components/mfa-login-form";
import { readMfaSessionToken } from "@/features/auth/mfa-session";
import { getAuthPageConfig, getMfaChallenge } from "@/features/auth/service";

export const metadata: Metadata = {
  title: "Verifikasi Dua Langkah",
  description: "Masukkan kode verifikasi untuk melanjutkan.",
};

export default async function MfaChallengePage() {
  const [config, token] = await Promise.all([
    getAuthPageConfig(),
    readMfaSessionToken(),
  ]);
  const challenge = token ? await getMfaChallenge(token) : null;

  if (!token || !challenge) {
    return (
      <AuthShell config={config}>
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">
              Sesi verifikasi berakhir
            </h1>
            <p className="text-sm text-muted-foreground">
              {MFA_CHALLENGE_PAGE_CONFIG.invalidSessionMessage} Silakan masuk
              ulang untuk meminta kode baru.
            </p>
          </div>

          <Button className="h-10 w-full" render={<Link href="/login" />}>
            {MFA_CHALLENGE_PAGE_CONFIG.backToLoginLabel}
          </Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell config={config}>
      <MfaLoginForm
        config={MFA_CHALLENGE_PAGE_CONFIG}
        method={challenge.method}
        maskedEmail={challenge.maskedEmail}
        isDemoMode={process.env.NODE_ENV !== "production"}
      />
    </AuthShell>
  );
}
