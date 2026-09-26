import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { getAuthPageConfig } from "@/features/auth/service";

const invitationTokenSchema = z
  .string()
  .length(64, "Token tidak valid")
  .regex(/^[a-f0-9]+$/, "Token tidak valid");

export const metadata: Metadata = {
  title: "Undangan",
};

type InvitePageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function InvitePage({ params }: InvitePageProps) {
  const [{ token }, config] = await Promise.all([params, getAuthPageConfig()]);
  const isValidToken = invitationTokenSchema.safeParse(token).success;

  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1">
          <p className="text-lg font-semibold">{config.branding.appName}</p>
          <p className="text-sm text-muted-foreground">
            {config.branding.tagline}
          </p>
        </div>

        {isValidToken ? (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Undangan belum aktif
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Fitur undangan belum tersedia. Silakan kembali nanti atau hubungi
                administrator.
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
        ) : (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Tautan undangan tidak valid
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Periksa kembali tautan undangan yang Anda gunakan.
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
        )}
      </div>
    </main>
  );
}
