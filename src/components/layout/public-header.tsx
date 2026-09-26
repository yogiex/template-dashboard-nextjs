import Link from "next/link";

import { ThemeToggle } from "@/components/custom/theme-toggle";
import { Button } from "@/components/ui/button";
import { publicNavConfig, publicHeaderConfig, siteConfig } from "@/config/site";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link
          href={publicHeaderConfig.homeHref}
          className="text-lg font-semibold tracking-tight"
          aria-label={`${siteConfig.name} — beranda`}
        >
          {siteConfig.name}
        </Link>

        <div className="flex items-center gap-2">
          <nav
            aria-label="Navigasi utama"
            className="hidden items-center gap-6 md:flex"
          >
            {publicNavConfig.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                {link.title}
              </Link>
            ))}
          </nav>
          <ThemeToggle />
          <nav aria-label="Navigasi akun" className="flex items-center gap-2">
            {publicHeaderConfig.accountLinks.map((link) => (
              <Button
                key={link.href}
                variant={link.variant}
                size="sm"
                render={<Link href={link.href} />}
              >
                {link.title}
              </Button>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
