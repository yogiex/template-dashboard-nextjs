import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";

/**
 * Disallow route privat. Awalan suffice: `/settings` otomatis menutup
 * `/settings/security`, `/settings/observability`, `/settings/ueba`, dan
 * `/settings/logs`. `/login` otomatis menutup `/login/mfa` dan
 * `/login/mfa/backup`.
 */
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // Auth (termasuk step MFA dan invite/verify)
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
          "/check-email",
          "/verify-email",
          "/invite",
          // Dashboard & admin
          "/dashboard",
          "/users",
          "/roles",
          "/settings",
          "/maintenance",
          // Metadata intern
          "/api",
        ],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
