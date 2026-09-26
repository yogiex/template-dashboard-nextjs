import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getAuthPageConfig } from "@/features/auth/service";

export const metadata: Metadata = {
  title: "Verifikasi Email",
};

type VerifyEmailPageProps = {
  searchParams: Promise<{
    token?: string | string[];
  }>;
};

function hasTokenQuery(value: string | string[] | undefined): boolean {
  return typeof value === "string" && value.length > 0 && value.length <= 4096;
}

export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const [config, query] = await Promise.all([
    getAuthPageConfig(),
    searchParams,
  ]);
  const tokenReceived = hasTokenQuery(query.token);

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
              {tokenReceived
                ? "Token diterima dan sedang menunggu verifikasi. Email belum dapat diverifikasi."
                : "Verifikasi email belum tersedia. Silakan gunakan tautan verifikasi yang dikirim ke email Anda."}
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
