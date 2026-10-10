import type { Metadata } from "next";
import { Suspense } from "react";

import { LOGIN_PAGE_FORM_CONFIG } from "@/config/login-page";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { LoginForm } from "@/features/auth/components/login-form";
import { getAuthPageConfig } from "@/features/auth/service";

export const metadata: Metadata = {
  title: "Masuk",
  description: "Masuk ke dashboard untuk melanjutkan.",
};

function LoginFallback() {
  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginContent />
    </Suspense>
  );
}

async function LoginContent() {
  const config = await getAuthPageConfig();
  const formConfig = LOGIN_PAGE_FORM_CONFIG;

  return (
    <AuthShell config={config}>
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">{formConfig.title}</h1>
          <p className="text-sm text-muted-foreground">
            {formConfig.description}
          </p>
        </header>
        <LoginForm config={formConfig} />
      </div>
    </AuthShell>
  );
}
