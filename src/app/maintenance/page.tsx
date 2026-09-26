import type { Metadata } from "next";
import { Wrench } from "lucide-react";

import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Selesai Dalam Pemeliharaan",
  description: `${siteConfig.name} sedang dalam pemeliharaan terjadwal.`,
  robots: {
    index: false,
    follow: false,
  },
};

export default function MaintenancePage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-6 py-16 text-foreground">
      <section
        aria-labelledby="maintenance-title"
        className="w-full max-w-lg text-center"
      >
        <div
          aria-hidden="true"
          className="mx-auto flex size-12 items-center justify-center rounded-full border bg-muted"
        >
          <Wrench className="size-6" />
        </div>
        <p className="mt-6 text-sm font-medium text-muted-foreground">
          {siteConfig.name}
        </p>
        <h1 id="maintenance-title" className="mt-2 text-3xl font-bold tracking-tight">
          Layanan sedang dalam pemeliharaan
        </h1>
        <p className="mx-auto mt-4 max-w-md text-muted-foreground">
          Kami sedang melakukan pembaruan terjadwal agar layanan tetap berjalan
          dengan baik. Silakan kembali lagi nanti.
        </p>
        <p className="mt-8 text-sm text-muted-foreground" role="status">
          Terima kasih atas kesabaran Anda.
        </p>
      </section>
    </main>
  );
}
