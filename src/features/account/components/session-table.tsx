"use client";

import { useState } from "react";
import { toast } from "sonner";
import { clientLogger } from "@/lib/logger-client";

import { ACCOUNT_SETTINGS_CONFIG } from "@/config/account-settings";
import { revokeSession } from "@/features/account/service";
import type { SessionInfo as SessionInfoType } from "@/features/account/schema";

const C = ACCOUNT_SETTINGS_CONFIG;

export function SessionTable({
  sessions: initial,
}: {
  sessions: SessionInfoType[];
}) {
  const [sessions, setSessions] = useState<SessionInfoType[]>(() => initial);
  const cols = C.sessions.columns;

  const revoke = (id: string) => {
    try {
      if (!revokeSession(id)) return;
      setSessions((prev) => prev.filter((s) => s.id !== id));
      toast.success(C.sessions.revokedLabel);
    } catch (error) {
      clientLogger.error("account.session.revoke_failed", { id, error });
      toast.error("Gagal mengakhiri sesi.");
    }
  };

  if (sessions.length === 0) {
    return (
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">
        {C.sessions.emptyTitle}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h2 className="text-base font-semibold">{C.sessions.title}</h2>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="px-3 py-2 text-left font-medium">{cols.device}</th>
              <th className="px-3 py-2 text-left font-medium">{cols.os}</th>
              <th className="px-3 py-2 text-left font-medium">{cols.ip}</th>
              <th className="px-3 py-2 text-left font-medium">
                {cols.lastActive}
              </th>
              <th className="px-3 py-2 text-right font-medium">
                {C.sessions.revokeLabel}
              </th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id} className="border-b last:border-b-0">
                <td className="px-3 py-2">
                  {s.device}
                  {s.isCurrent ? (
                    <span className="ml-2 text-xs text-primary">(ini)</span>
                  ) : null}
                </td>
                <td className="px-3 py-2">{s.os}</td>
                <td className="px-3 py-2 font-mono text-xs">{s.ipHash}</td>
                <td className="px-3 py-2">
                  {new Date(s.lastActiveAt).toLocaleString("id-ID")}
                </td>
                <td className="px-3 py-2 text-right">
                  {!s.isCurrent ? (
                    <button
                      onClick={() => revoke(s.id)}
                      className="text-xs text-destructive hover:underline"
                    >
                      {C.sessions.revokeLabel}
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

