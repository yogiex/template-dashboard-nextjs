import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

import { AuthInfoPanel } from "@/features/auth/components/auth-info-panel";
import type { LoginPageConfig } from "@/features/auth/schema";

interface AuthShellProps {
  config: LoginPageConfig;
  children: ReactNode;
}

export function AuthShell({ config, children }: AuthShellProps) {
  return (
    <main className="grid min-h-svh lg:grid-cols-2">
      <div className="hidden lg:block">
        <AuthInfoPanel config={config} />
      </div>

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

        <nav
          aria-label="Footer"
          className="flex justify-center gap-4 text-xs text-muted-foreground"
        >
          {config.footer.links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="underline-offset-4 hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </main>
  );
}
