"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { INTEGRATIONS_CONFIG } from "@/config/integrations";
import type { Integration } from "@/features/integration/schema";

const C = INTEGRATIONS_CONFIG;

export function IntegrationDetailSheet({
  item,
  open,
  onOpenChange,
}: {
  item: Integration | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Disalin.");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Gagal menyalin.");
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item.name}</DialogTitle>
          <DialogDescription>{item.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <p className="text-sm font-medium">{C.fields.webhookUrl}</p>
            <div className="flex gap-2">
              <Input
                readOnly
                value={item.webhookUrl ?? "https://hooks.example.com/..."}
                className="h-10 font-mono text-xs"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copy(item.webhookUrl ?? "")}
              >
                {copied ? "Disalin." : "Salin"}
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-medium">{C.fields.secret}</p>
            <Input
              readOnly
              type="password"
              value={item.secretHint ?? "••••••••"}
              className="h-10 font-mono text-xs"
            />
          </div>
          {item.connectedAt ? (
            <p className="text-xs text-muted-foreground">
              Terhubung sejak{" "}
              {new Date(item.connectedAt).toLocaleDateString("id-ID")}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Belum terhubung.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
