import type { NextConfig } from "next";

// `output: "export"` dan `images.unoptimized` (dulu dipasang untuk GitHub Pages)
// dibuang bersama-sama: keduanya hanya masuk akal untuk output statis, sedangkan
// autentikasi mock butuh runtime server. Server Action dan cookie session tidak
// bisa berjalan di static export, jadi target deploy-nya bukan lagi hosting
// statis — `npm run build` tidak lagi menghasilkan folder `out/`.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
};

export default nextConfig;
