"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "cn";

export const SETTINGS_TABS = [
  { title: "General", href: "/settings/general" },
  { title: "Appearance", href: "/settings/appearance" },
] as const;

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Pengaturan" className="flex gap-1 border-b">
      {SETTINGS_TABS.map((tab) => {
        const isActive = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "border-b-2 px-3 pb-2 pt-1 text-sm font-medium transition-colors",
              isActive
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.title}
          </Link>
        );
      })}
    </nav>
  );
}
