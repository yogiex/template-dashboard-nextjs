"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ObservabilityRefreshButtonProps {
  label: string;
  pendingLabel: string;
  ariaLabel: string;
}

/**
 * Tombol refresh kecil untuk layer UI observability.
 *
 * Halaman ini `force-dynamic` dan membaca store in-memory, jadi satu-satunya
 * cara memperbarui angka adalah memuat ulang Server Component. `router.refresh()`
 * melakukan itu tanpa navigasi dan tanpa membuang state client. Tidak ada
 * Server Action di sini: refresh adalah operasi baca, bukan perubahan data.
 */
export function ObservabilityRefreshButton({
  label,
  pendingLabel,
  ariaLabel,
}: ObservabilityRefreshButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      aria-label={ariaLabel}
      disabled={isPending}
      onClick={() => {
        startTransition(() => {
          router.refresh();
        });
      }}
    >
      <RefreshCw
        className={isPending ? "size-4 animate-spin" : "size-4"}
        aria-hidden="true"
      />
      {isPending ? pendingLabel : label}
    </Button>
  );
}
