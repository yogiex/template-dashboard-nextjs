"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AUDIT_PAGE_CONFIG } from "@/config/audit-page";
import { codeGraphConfig } from "@/config/code-graph";
import { LOG_MANAGEMENT_PAGE_CONFIG } from "@/config/log-management";
import { cn } from "cn";

export const SETTINGS_TABS = [
  { title: "General", href: "/settings/general" },
  { title: "Appearance", href: "/settings/appearance" },
  { title: "Security", href: "/settings/security" },
  { title: AUDIT_PAGE_CONFIG.tabTitle, href: AUDIT_PAGE_CONFIG.basePath },
  { title: "Observability", href: "/settings/observability" },
  { title: "UEBA", href: "/settings/ueba" },
  { title: codeGraphConfig.title, href: "/settings/code-graph" },
  { title: LOG_MANAGEMENT_PAGE_CONFIG.title, href: LOG_MANAGEMENT_PAGE_CONFIG.sections.forecast.href },
] as const;

export function SettingsNav() {
  const pathname = usePathname();

  // Boundary-anchored, copy dari `nav-main.tsx`: tanpa boundary,
  // `/settings/logs-access` akan ikut menyalakan tab Log Management, dan
  // `/settings/logs` sendiri tidak pernah cocok dengan tab mana pun sehingga
  // seluruh strip tampil tidak aktif.
  const isTabActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav aria-label="Pengaturan" className="flex gap-1 overflow-x-auto border-b">
      {SETTINGS_TABS.map((tab) => {
        const isActive = isTabActive(tab.href);
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
