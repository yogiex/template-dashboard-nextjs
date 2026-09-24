import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Halaman Tidak Ditemukan",
};

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-6 text-center">
      <div className="max-w-md space-y-4">
        <p className="font-mono text-sm text-muted-foreground">404</p>
        <h1 className="text-2xl font-bold tracking-tight">
          Halaman tidak ditemukan
        </h1>
        <p className="text-sm text-muted-foreground">
          Halaman yang Anda cari tidak tersedia atau telah dipindahkan.
        </p>
        <Button render={<Link href="/" />}>Kembali ke beranda</Button>
      </div>
    </main>
  );
}
