import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { getAuthPageConfig } from "@/features/auth/service";

export const metadata: Metadata = {
  title: "Lupa Password",
};

export default async function ForgotPasswordPage() {
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

        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lupa password?</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Masukkan email Anda dan kami akan mengirim instruksi untuk
            mengatur ulang password.
          </p>
        </div>

        <ForgotPasswordForm
          submitLabel="Kirim tautan reset"
          backToLoginLabel="Kembali ke halaman masuk"
        />
      </div>
    </main>
  );
}
