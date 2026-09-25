import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { ThemeProvider } from "@/components/layout/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { siteConfig } from "@/config/site";
import { PRESET_COLORS } from "@/config/appearance";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const themeColorInitScript = `(function(){try{var m=${JSON.stringify(
  Object.fromEntries(
    PRESET_COLORS.filter((preset) => preset.vars.primary !== null).map((preset) => [
      preset.id,
      {
        "--primary": preset.vars.primary,
        "--primary-foreground": preset.vars.primaryForeground,
        "--ring": preset.vars.ring,
        "--sidebar-primary": preset.vars.sidebarPrimary,
      },
    ])
  )
)};var raw=localStorage.getItem("app-settings");if(!raw)return;var s=JSON.parse(raw);var id=s&&s.appearance&&s.appearance.primaryColor;var v=m[id];if(!v)return;var r=document.documentElement.style;for(var k in v){if(v[k])r.setProperty(k,v[k]);}}catch(e){}})();`;

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeColorInitScript }} />
      </head>
      <body className={`${inter.variable} min-h-full font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster position="bottom-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
