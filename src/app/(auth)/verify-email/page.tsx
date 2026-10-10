import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { getAuthPageConfig } from "@/features/auth/service";

export const metadata: Metadata = {
  title: "Verifikasi Email",
};

function VerifyEmailFallback() {
  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailFallback />}>
      <VerifyEmailContent />
    </Suspense>
  );
}

async function VerifyEmailContent() {
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

        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Verifikasi email
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Verifikasi email belum tersedia. Silakan gunakan tautan verifikasi yang dikirim ke email Anda.
            </p>
          </div>

          <Button
            className="w-full"
            variant="outline"
            render={<Link href="/login" />}
          >
            Kembali ke halaman masuk
          </Button>
        </div>
      </div>
    </main>
  );
}
