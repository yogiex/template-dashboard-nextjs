import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { getAuthPageConfig } from "@/features/auth/service";

export const metadata: Metadata = {
  title: "Atur Ulang Password",
};

function ResetPasswordFallback() {
  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordContent />
    </Suspense>
  );
}

async function ResetPasswordContent() {
  const config = await getAuthPageConfig();

  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1">
          <p className="text-lg font-semibold">{config.branding.appName}</p>
          <p className="text-sm text-muted-foreground">
            {config.branding.tagline}
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Tautan tidak valid
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Tautan reset password tidak valid atau telah kedaluwarsa.
              Minta tautan baru untuk melanjutkan.
            </p>
          </div>

          <Button
            className="w-full"
            render={<Link href="/forgot-password" />}
          >
            Minta tautan baru
          </Button>
        </div>
      </div>
    </main>
  );
}
