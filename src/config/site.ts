import { LayoutDashboard, Settings, Users, type LucideIcon } from "lucide-react";

import { env } from "@/lib/env";

export const siteConfig = {
  name: "Dashboard",
  description: "Template dashboard Next.js dengan shadcn/ui",
  url: env.NEXT_PUBLIC_APP_URL,
} as const;

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  disabled?: boolean;
};

export type NavGroup = {
  title: string;
  items: NavItem[];
};

export const sidebarNav: NavGroup[] = [
  {
    title: "Platform",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Users", href: "/users", icon: Users },
      { title: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

export const publicNav = [
  { title: "Syarat & Ketentuan", href: "/terms" },
  { title: "Kebijakan Privasi", href: "/privacy" },
] as const;
