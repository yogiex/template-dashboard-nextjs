import Link from "next/link";

import { publicNav, siteConfig } from "@/config/site";

export function PublicFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
        <p>
          © {new Date().getFullYear()} {siteConfig.name}. Semua hak dilindungi.
        </p>
        <nav aria-label="Footer" className="flex gap-4">
          {publicNav.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="underline-offset-4 hover:underline"
            >
              {link.title}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
