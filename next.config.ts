import type { NextConfig } from "next";

// Target deploy adalah GitHub Pages (MVP publik), jadi app harus static
// export: Server Action dan cookie session tidak didukung mode ini
// (`node_modules/next/dist/docs/01-app/02-guides/static-exports.md` →
// Unsupported Features). Implementasi auth server-side di
// `src/features/auth/` sengaja diparkir untuk host Node; sampai host itu ada,
// login di situs ini hanya demo tanpa verifikasi kredensial.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  images: { unoptimized: true },
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
};

export default nextConfig;
