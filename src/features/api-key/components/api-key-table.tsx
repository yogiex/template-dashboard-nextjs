"use client";

import { useState } from "react";
import { toast } from "sonner";
import { clientLogger } from "@/lib/logger-client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { API_KEYS_CONFIG } from "@/config/api-keys";
import { maskApiKey, revokeApiKey, type ApiKey } from "@/features/api-key/service";

const C = API_KEYS_CONFIG;

export function ApiKeyTable({
  keys,
  onChanged,
}: {
  keys: ApiKey[];
  onChanged: () => void;
}) {
  const [revoking, setRevoking] = useState<string | null>(null);

  const revoke = async (id: string) => {
    if (!window.confirm(API_KEYS_CONFIG.revokeConfirm)) return;
    setRevoking(id);
    try {
      const ok = revokeApiKey(id);
      if (ok) {
        toast.success(C.revokedLabel);
        onChanged();
      } else {
        toast.error("Gagal mencabut key.");
      }
    } catch (error) {
      clientLogger.error("apikey.revoke_failed", { id, error });
      toast.error("Gagal mencabut key.");
    } finally {
      setRevoking(null);
    }
  };

  if (keys.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="font-medium">{C.empty.title}</p>
        <p className="text-sm text-muted-foreground">{C.empty.description}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
            <th className="px-3 py-2 text-left font-medium">{C.columns.name}</th>
            <th className="px-3 py-2 text-left font-medium">{C.columns.key}</th>
            <th className="px-3 py-2 text-left font-medium">{C.columns.scopes}</th>
            <th className="px-3 py-2 text-left font-medium">{C.columns.createdAt}</th>
            <th className="px-3 py-2 text-left font-medium">{C.columns.status}</th>
            <th className="px-3 py-2 text-right font-medium">{C.revokeLabel}</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((k) => (
            <tr key={k.id} className="border-b last:border-b-0">
              <td className="px-3 py-2 font-medium">{k.name}</td>
              <td className="px-3 py-2 font-mono text-xs">{maskApiKey(k)}</td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap gap-1">
                  {k.scopes.map((s) => (
                    <Badge key={s} variant="outline" className="text-xs">
                      {s}
                    </Badge>
                  ))}
                </div>
              </td>
              <td className="px-3 py-2 text-xs text-muted-foreground">
                {new Date(k.createdAt).toLocaleDateString("id-ID")}
              </td>
              <td className="px-3 py-2">
                {k.revoked ? (
                  <Badge variant="destructive">{C.revokedBadge}</Badge>
                ) : (
                  <Badge variant="secondary">{C.activeBadge}</Badge>
                )}
              </td>
              <td className="px-3 py-2 text-right">
                {!k.revoked ? (
                  <button
                    onClick={() => revoke(k.id)}
                    disabled={revoking === k.id}
                    className="text-xs text-destructive hover:underline disabled:opacity-50"
                  >
                    {revoking === k.id ? "..." : C.revokeLabel}
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
