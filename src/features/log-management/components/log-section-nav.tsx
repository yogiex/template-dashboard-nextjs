import Link from "next/link";

import { cn } from "cn";

import {
  LOG_MANAGEMENT_PAGE_CONFIG,
  type LogNavItem,
} from "@/config/log-management";

/**
 * Sub-navigasi horizontal antar sub-page Log Management. Server Component:
 * hanya `Link`, tanpa interaksi client.
 */
export function LogSectionNav({ current }: { current: string }) {
  const config = LOG_MANAGEMENT_PAGE_CONFIG;
  const items: LogNavItem[] = [
    config.sections.forecast,
    config.sections.sources,
    config.sections.retention,
    config.sections.access,
    config.sections.disposal,
  ];

  return (
    <nav
      aria-label={config.navLabel}
      className="flex gap-1 overflow-x-auto border-b"
    >
      {items.map((item) => {
        const isActive = item.href === current;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "border-b-2 px-3 pb-2 pt-1 text-sm font-medium whitespace-nowrap transition-colors",
              isActive
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
