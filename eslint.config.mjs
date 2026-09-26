import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Node CLI scripts di `scripts/` sengaja ditulis CommonJS karena
    // package.json tidak punya `"type": "module"`, dan keduanya dijalankan
    // langsung lewat `node scripts/*.js` (bukan lewat bundler Next).
    files: ["scripts/**/*.js"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    // Laporan coverage dari `npm run test:coverage`; bukan source.
    "coverage/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
