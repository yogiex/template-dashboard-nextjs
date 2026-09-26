import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getAuthPageConfig } from "@/features/auth/service";

export const metadata: Metadata = {
  title: "Periksa Email",
};

export default async function CheckEmailPage() {
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

        <div className="space-y-4 text-center" role="status">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MailCheck className="size-6" aria-hidden="true" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">
              Periksa email Anda
            </h1>
            <p className="text-sm text-muted-foreground">
              Jika alamat email tersebut sesuai, instruksi yang diperlukan
              telah dikirim. Periksa kotak masuk dan folder spam Anda.
            </p>
          </div>
        </div>

        <Button
          className="w-full"
          variant="outline"
          render={<Link href="/login" />}
        >
          Kembali ke halaman masuk
        </Button>
      </div>
    </main>
  );
}
