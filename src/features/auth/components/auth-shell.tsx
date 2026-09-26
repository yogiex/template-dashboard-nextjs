import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

import { AuthInfoPanel } from "@/features/auth/components/auth-info-panel";
import { LoginFooterLinks } from "@/features/auth/components/login-footer-links";
import type { AuthPageConfig } from "@/features/auth/schema";

interface AuthShellProps {
  config: AuthPageConfig;
  children: ReactNode;
}

export function AuthShell({ config, children }: AuthShellProps) {
  const footerLinks = config.footer?.links ?? [];

  return (
    <main className="grid min-h-svh lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-emerald-950 lg:block">
        <div
          aria-hidden="true"
          className="bg-panel-grid pointer-events-none absolute inset-0"
        />
        <div
          aria-hidden="true"
          className="bg-emerald-500/20 pointer-events-none absolute -top-1/4 -right-1/4 size-[500px] rounded-full blur-[120px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-1/4 -left-1/4 size-[400px] rounded-full bg-lime-400/10 blur-[100px]"
        />
        <AuthInfoPanel config={config} />
      </aside>

      <div className="relative flex flex-col px-6 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Kembali ke beranda
        </Link>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <div className="mb-6 lg:hidden">
            <span className="text-lg font-semibold tracking-tight">
              {config.branding.appName}
            </span>
          </div>
          {children}
        </div>

        <LoginFooterLinks links={footerLinks} />
      </div>
    </main>
  );
}
