import type { Metadata } from "next";

import { REGISTER_PAGE_CONFIG } from "@/config/register-page";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { RegisterForm } from "@/features/auth/components/register-form";
import { getAuthPageConfig } from "@/features/auth/service";

export const metadata: Metadata = {
  title: "Daftar",
  description: "Buat akun baru untuk mulai mengelola dashboard Anda.",
  alternates: { canonical: "/register" },
};

export default async function RegisterPage() {
  const config = await getAuthPageConfig();

  return (
    <AuthShell config={config}>
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            {REGISTER_PAGE_CONFIG.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {REGISTER_PAGE_CONFIG.description}
          </p>
        </header>
        <RegisterForm config={REGISTER_PAGE_CONFIG} />
      </div>
    </AuthShell>
  );
}
