import Link from "next/link";

import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight"
          aria-label={`${siteConfig.name} — beranda`}
        >
          {siteConfig.name}
        </Link>

        <nav aria-label="Navigasi akun" className="flex items-center gap-2">
          <Button variant="ghost" size="sm" render={<Link href="/login" />}>
            Masuk
          </Button>
          <Button size="sm" render={<Link href="/register" />}>
            Daftar
          </Button>
        </nav>
      </div>
    </header>
  );
}
