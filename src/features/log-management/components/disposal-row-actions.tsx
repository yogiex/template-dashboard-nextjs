"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LOG_MANAGEMENT_PAGE_CONFIG } from "@/config/log-management";
import {
  approveDisposalAction,
  completeDisposalAction,
} from "@/features/log-management/actions";
import type { DisposalStatus } from "@/features/log-management/schema";

/**
 * Klien leaf untuk satu baris antrian disposal. Identitas approver tetap
 * diambil dari server (`requireSession()`), bukan dari payload.
 */
export function DisposalRowActions({
  disposalId,
  status,
}: {
  disposalId: string;
  status: DisposalStatus;
}) {
  const config = LOG_MANAGEMENT_PAGE_CONFIG;
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const run = async (action: "approve" | "complete") => {
    if (isRunning) {
      return;
    }

    setIsRunning(true);
    setMessage(null);

    try {
      const result =
        action === "approve"
          ? await approveDisposalAction({ disposalId, decision: "approve" })
          : await completeDisposalAction({ disposalId });

      if (result.success) {
        router.refresh();
      } else {
        setMessage(result.error.message);
      }
    } catch (error) {
      console.error("[disposal-row-actions] action failed", error);
      setMessage(config.actionFeedback);
    } finally {
      setIsRunning(false);
    }
  };

  if (status === "completed" || status === "rejected") {
    return null;
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {status === "scheduled" ? (
          <Button
            type="button"
            size="xs"
            variant="outline"
            disabled={isRunning}
            onClick={() => void run("approve")}
          >
            {isRunning ? (
              <Loader2 className="size-3 animate-spin" aria-hidden="true" />
            ) : null}
            {isRunning ? config.approveRunning : config.approveLabel}
          </Button>
        ) : null}
        {status === "approved" ? (
          <Button
            type="button"
            size="xs"
            variant="outline"
            disabled={isRunning}
            onClick={() => void run("complete")}
          >
            {isRunning ? (
              <Loader2 className="size-3 animate-spin" aria-hidden="true" />
            ) : null}
            {isRunning ? config.completeRunning : config.completeLabel}
          </Button>
        ) : null}
      </div>
      {message ? (
        <p className="text-xs text-destructive">{message}</p>
      ) : null}
    </div>
  );
}
