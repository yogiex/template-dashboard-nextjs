"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("client_error", { digest: error.digest });
  }, [error]);

  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-6 text-center">
      <div className="max-w-md space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">
          Terjadi kesalahan
        </h1>
        <p className="text-sm text-muted-foreground">
          Maaf, sesuatu tidak berjalan semestinya. Silakan coba lagi.
        </p>
        {error.digest ? (
          <p className="text-xs text-muted-foreground">
            Kode referensi: <code className="font-mono">{error.digest}</code>
          </p>
        ) : null}
        <Button onClick={reset}>Coba lagi</Button>
      </div>
    </main>
  );
}
