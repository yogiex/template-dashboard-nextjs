import type { AuthPageConfig } from "@/features/auth/schema";

export const AUTH_PAGE_CONFIG: AuthPageConfig = {
  branding: {
    appName: "Dashboard",
    tagline: "Template admin modern untuk tim yang bergerak cepat.",
    highlights: [
      {
        icon: "shield",
        title: "Aman by design",
        description: "Validasi input dan kontrol akses di setiap boundary.",
      },
      {
        icon: "zap",
        title: "Cepat & ringan",
        description: "Server Component default, client boundary sekecil mungkin.",
      },
      {
        icon: "sparkles",
        title: "Siap dikembangkan",
        description: "Struktur feature-first dengan konvensi yang jelas.",
      },
    ],
  },
  footer: {
    copyright: `© ${new Date().getFullYear()} Dashboard`,
    links: [
      { href: "/privacy", label: "Privasi" },
      { href: "/terms", label: "Ketentuan" },
    ],
  },
};
