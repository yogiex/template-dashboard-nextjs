import type { Metadata } from "next";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { LOGIN_PAGE_FORM_CONFIG } from "@/config/login-page";
import { AuthShell } from "@/features/auth/components/auth-shell";
import { LoginForm } from "@/features/auth/components/login-form";
import { getAuthPageConfig } from "@/features/auth/service";

export const metadata: Metadata = {
  title: "Masuk",
  description: "Masuk ke dashboard untuk melanjutkan.",
};

type LoginPageProps = {
  searchParams: Promise<{ reset?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [config, query] = await Promise.all([
    getAuthPageConfig(),
    searchParams,
  ]);
  const formConfig = LOGIN_PAGE_FORM_CONFIG;
  const passwordWasReset = query.reset === "success";

  return (
    <AuthShell config={config}>
      <div className="space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">{formConfig.title}</h1>
          <p className="text-sm text-muted-foreground">
            {formConfig.description}
          </p>
        </header>
        {passwordWasReset ? (
          <Alert role="status">
            <AlertDescription>
              Password berhasil diperbarui. Silakan masuk dengan password baru.
            </AlertDescription>
          </Alert>
        ) : null}
        <LoginForm config={formConfig} />
      </div>
    </AuthShell>
  );
}
