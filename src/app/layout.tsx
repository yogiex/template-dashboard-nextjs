import type { Metadata } from "next";
import { Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";

import { ThemeProvider } from "@/components/layout/theme-provider";
import { CookieConsent } from "@/components/custom/cookie-consent";
import { Toaster } from "@/components/ui/sonner";
import { siteConfig } from "@/config/site";
import { ALLOWED_THEME_VARS } from "@/config/appearance";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jakarta",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-mono",
});

const themeColorInitScript = `(function(){try{var w=${JSON.stringify(ALLOWED_THEME_VARS)};var raw=localStorage.getItem("app-settings");if(!raw)return;var s=JSON.parse(raw);var v=s&&s.themeVars;if(!v)return;var r=document.documentElement.style;for(var i=0;i<w.length;i++)r.removeProperty(w[i]);for(var k in v){if(w.indexOf(k)!==-1&&/^oklch\\(|^light-dark\\(/.test(String(v[k])))r.setProperty(k,v[k]);}}catch(e){}})();`;

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  metadataBase: new URL(siteConfig.url),
  icons: { icon: "/favicon-logo.png", shortcut: "/favicon-logo.png", apple: "/favicon-logo.png" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeColorInitScript }} />
      </head>
      <body
        className={`${jakarta.variable} ${geistMono.variable} min-h-full font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <CookieConsent />
          <Toaster position="bottom-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
