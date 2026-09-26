import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * CSP tanpa nonce.
 *
 * Catatan penting: CSP berbasis nonce (`'nonce-…'`) di Next.js App Router
 * memaksa SELURUH halaman menjadi dynamic rendering, yang mematikan static
 * generation untuk landing page publik. Karena template ini memprioritaskan
 * static generation, kami memakai CSP statis dengan `'unsafe-inline'` untuk
 * script/style. Badge `'unsafe-eval'` hanya di development (React memakai eval
 * untuk debugging stack trace di dev).
 *
 * Saat backend siap dan static generation tidak jadi prioritas, ganti dengan
 * pola nonce di `proxy.ts` (lihat docs Next: guides/content-security-policy).
 */
const cspHeader = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "manifest-src 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Content-Security-Policy", value: cspHeader },
];

const nextConfig: NextConfig = {
  output: "standalone",
  // Jangan bocorkan versi Next.js lewat header `X-Powered-By`.
  poweredByHeader: false,
  // Source map browser tidak perlu diekspos ke publik.
  productionBrowserSourceMaps: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
