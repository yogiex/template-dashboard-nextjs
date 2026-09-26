import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { resetTokenSchema } from "@/features/auth/schema";
import {
  getAuthPageConfig,
  verifyResetToken,
} from "@/features/auth/service";

export const metadata: Metadata = {
  title: "Atur Ulang Password",
};

type ResetPasswordPageProps = {
  searchParams: Promise<{
    token?: string | string[];
  }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const [config, query] = await Promise.all([
    getAuthPageConfig(),
    searchParams,
  ]);
  const tokenResult = resetTokenSchema.safeParse(query.token);
  const token = tokenResult.success ? tokenResult.data : null;
  const isValidToken = token ? await verifyResetToken(token) : false;

  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1">
          <p className="text-lg font-semibold">{config.branding.appName}</p>
          <p className="text-sm text-muted-foreground">
            {config.branding.tagline}
          </p>
        </div>

        {isValidToken && token ? (
          <>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Atur password baru
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Gunakan password baru yang kuat dan mudah Anda ingat.
              </p>
            </div>

            <ResetPasswordForm
              token={token}
              submitLabel="Simpan password baru"
            />
          </>
        ) : (
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
        )}
      </div>
    </main>
  );
}
