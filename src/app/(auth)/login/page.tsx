import type { Metadata } from "next";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { LoginForm } from "@/features/auth/components/login-form";
import { getLoginPageConfig } from "@/features/auth/service";

export const metadata: Metadata = {
  title: "Masuk",
};

export default async function LoginPage() {
  const config = await getLoginPageConfig();

  return (
    <AuthShell config={config}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {config.form.title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {config.form.description}
          </p>
        </div>
        <LoginForm config={config} />
      </div>
    </AuthShell>
  );
}
