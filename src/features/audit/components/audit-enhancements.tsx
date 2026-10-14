"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { AuditEvent } from "@/features/audit/schema";
import type { IntegrityReport } from "@/features/audit/types";
import { AUDIT_PAGE_CONFIG } from "@/config/audit-page";

type Props = {
  events: readonly AuditEvent[];
  report: IntegrityReport;
};

const C = AUDIT_PAGE_CONFIG;

function toLocalDate(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function AuditEnhancements({ events, report }: Props) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [tailActive, setTailActive] = useState(false);
  const [tailMessage, setTailMessage] = useState("");

  const filtered = useMemo(() => {
    const fromD = toLocalDate(from);
    const toD = toLocalDate(to);
    return events.filter((e) => {
      const t = new Date(e.timestamp).getTime();
      if (fromD && t < fromD.getTime()) return false;
      if (toD) {
        const end = new Date(toD);
        end.setHours(23, 59, 59, 999);
        if (t > end.getTime()) return false;
      }
      return true;
    });
  }, [events, from, to]);

  const exportCsv = useCallback(() => {
    const headers = ["timestamp", "category", "severity", "result", "actor", "action", "resource"];
    const rows = filtered.map((e) =>
      headers
        .map((h) => {
          const value =
            h === "actor"
              ? e.actor?.id ?? ""
              : (e as Record<string, unknown>)[h];
          const text = value == null ? "" : String(value);
          return `"${text.replace(/"/g, '""')}"`;
        })
        .join(","),
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-report-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("Export CSV berhasil.");
  }, [filtered]);

  useEffect(() => {
    if (!tailActive) return;
    const id = setInterval(() => {
      setTailMessage(`Tail aktif • ${new Date().toLocaleTimeString("id-ID")} — menampilkan ${filtered.length} event`);
    }, 5000);
    return () => clearInterval(id);
  }, [tailActive, filtered.length]);

  return (
    <section className="space-y-4 rounded-lg border p-4">
      <h3 className="text-base font-semibold">Peningkatan Audit</h3>
      <Alert>
        <AlertDescription>
          Mode demo — filter tanggal berjalan di data build-time; verify hash chain mungkin false-positive setelah overflow.
        </AlertDescription>
      </Alert>

      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <div className="space-y-1">
          <label className="text-xs font-medium">Dari Tanggal</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium">Sampai Tanggal</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="flex items-end gap-2">
          <Button variant="outline" onClick={exportCsv}>
            Export CSV ({filtered.length})
          </Button>
          <Button
            variant={tailActive ? "default" : "outline"}
            onClick={() => setTailActive((prev) => !prev)}
          >
            {tailActive ? "Tail: ON" : "Tail: OFF"}
          </Button>
        </div>
      </div>

      {tailActive && tailMessage ? (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {tailMessage}
        </p>
      ) : null}

      <div className="rounded-md border bg-muted/30 p-3 text-sm">
        <p className="font-medium">Integritas Hash Chain</p>
        <p className="text-muted-foreground">
          {report.brokenAtIndex === -1
            ? "Rantai valid."
            : `Rantai bermasalah di indeks ${report.brokenAtIndex ?? "?"}.`}
        </p>
        <p className="text-xs text-muted-foreground">
          Total entry: {report.checkedEntries} • Diverifikasi: {new Date(report.verifiedAt).toLocaleString("id-ID")}
        </p>
      </div>
    </section>
  );
}

void C;
