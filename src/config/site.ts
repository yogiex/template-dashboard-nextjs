import { LayoutDashboard, Network, Settings, ShieldCheck, Users, type LucideIcon } from "lucide-react";

import { env } from "@/lib/env";

export const siteConfig = {
  name: "Dashboard",
  description: "Template dashboard Next.js dengan shadcn/ui",
  url: env.NEXT_PUBLIC_APP_URL,
} as const;

/**
 * Basis data `security.txt` (RFC 9116).
 *
 * File yang benar-benar dilayani scanner adalah statis:
 * `public/.well-known/security.txt`. File statis tidak bisa membaca
 * `NEXT_PUBLIC_APP_URL`, jadi konstanta ini adalah sumber kebenaran yang
 * didokumentasikan: nilainya harus disalin manual ke file tersebut setiap kali
 * domain, kontak, atau tanggal kedaluwarsa berubah.
 *
 * PLACEHOLDER — pemilik repo WAJIB menggantinya sebelum deploy ke domain
 * publik:
 * - `contact`: pakai alamat email tim sendiri. `security@example.com` adalah
 *   domain contoh yang dicadangkan RFC 2606 dan tidak milik siapa pun.
 * - `expires`: tanggal ISO satu tahun ke depan dari tanggal deploy; parser
 *   menandai file sebagai kedaluwarsa setelah tanggal ini lewat.
 * - `canonical`: host sama dengan `siteConfig.url` (dari `NEXT_PUBLIC_APP_URL`).
 */
export const securityTxtConfig = {
  contact: "mailto:security@example.com",
  expires: "2027-09-25",
  preferredLanguages: "id, en",
  policy: "/privacy",
  path: "/.well-known/security.txt",
  /** `true` selama nilai di atas masih placeholder. */
  isPlaceholder: true,
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
      { title: "Team", href: "/team", icon: Users },
      { title: "Organisasi", href: "/organization", icon: Network },
      { title: "Roles", href: "/roles", icon: ShieldCheck },
      { title: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

export const publicNavConfig = [
  { title: "Fitur", href: "/#features" },
  { title: "Tentang", href: "/about" },
  { title: "Kontak", href: "/contact" },
  { title: "Bantuan", href: "/help" },
] as const;

export const publicHeaderConfig = {
  homeHref: "/",
  accountLinks: [
    { title: "Masuk", href: "/login", variant: "ghost" as const },
    { title: "Daftar", href: "/register", variant: "default" as const },
  ],
} as const;
