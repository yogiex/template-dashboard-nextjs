"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { runDisposalSweepAction } from "@/features/log-management/actions";
import { LOG_MANAGEMENT_PAGE_CONFIG } from "@/config/log-management";

/**
 * Klien leaf: tombol sweep disposal. Identitas approver tetap dari server
 * (`requireSession()`), tidak pernah dari payload client.
 */
export function DisposalControls() {
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
      const result = await runDisposalSweepAction({});

      if (result.success) {
        setMessage(
          result.data.reason === "production"
            ? config.productionDisabled
            : `${result.data.processed} diproses, ${result.data.skipped} dilewati.`,
        );
        router.refresh();
      } else {
        setMessage(result.error.message);
      }
    } catch (error) {
      console.error("[disposal-controls] sweep failed", error);
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
        {isRunning ? config.sweepRunning : config.sweepLabel}
      </Button>
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
    </div>
  );
}
