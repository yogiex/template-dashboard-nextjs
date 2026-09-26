"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LOG_MANAGEMENT_PAGE_CONFIG } from "@/config/log-management";
import { verifyIntegrityAction } from "@/features/log-management/actions";

/**
 * Klien leaf: tombol verifikasi hash chain. Hasil verifikasi tetap dihitung di
 * server dan dirender ulang lewat `router.refresh()`.
 */
export function IntegrityActions() {
  const config = LOG_MANAGEMENT_PAGE_CONFIG;
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const run = async () => {
    if (isRunning) {
      return;
    }

    setIsRunning(true);
    setMessage(null);

    try {
      const result = await verifyIntegrityAction();

      if (result.success) {
        router.refresh();
      } else {
        setMessage(result.error.message);
      }
    } catch (error) {
      console.error("[integrity-actions] verify failed", error);
      setMessage(config.actionFeedback);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="h-9"
        disabled={isRunning}
        onClick={() => void run()}
      >
        {isRunning ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : null}
        {isRunning ? config.verifyRunning : config.verifyLabel}
      </Button>
      {message ? <p className="text-xs text-destructive">{message}</p> : null}
    </div>
  );
}
