"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { REPORTS_CONFIG } from "@/config/reports";
import { generateReport, toCsv } from "@/features/reports/service";
import { reportRequestSchema, type ReportDataset, type ReportFormat } from "@/features/reports/schema";

const C = REPORTS_CONFIG;

export function ReportsBuilder() {
  const [dataset, setDataset] = useState<ReportDataset>("users");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ columns: string[]; rows: unknown[] } | null>(null);

  const submit = async () => {
    setPending(true);
    setTimeout(() => {
      const parsed = reportRequestSchema.safeParse({
        dataset,
        from: from || undefined,
        to: to || undefined,
        format: "csv" as ReportFormat,
      });
      if (!parsed.success) {
        toast.error("Parameter laporan tidak valid.");
        setPending(false);
        return;
      }
      const report = generateReport(parsed.data);
      setResult(report);
      toast.success(C.builder.generatedLabel);
      setPending(false);
    }, 200);
  };

  const download = () => {
    if (!result) return;
    const csv = toCsv(result.columns, result.rows as Record<string, string | number>[]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${dataset}-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Alert>
        <AlertDescription>{C.infoAlert}</AlertDescription>
      </Alert>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label>{C.builder.datasetLabel}</Label>
          <Select value={dataset} onValueChange={(v) => setDataset(v as ReportDataset)}>
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="users">{C.datasets.users}</SelectItem>
              <SelectItem value="invoices">{C.datasets.invoices}</SelectItem>
              <SelectItem value="audit">{C.datasets.audit}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="report-from">{C.builder.fromLabel}</Label>
          <Input id="report-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="report-to">{C.builder.toLabel}</Label>
          <Input id="report-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10" />
        </div>
        <div className="space-y-2">
          <Label>{C.builder.formatLabel}</Label>
          <Select value="csv" disabled>
            <SelectTrigger className="h-10">
              <SelectValue placeholder={C.formats.csv} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">{C.formats.csv}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button onClick={submit} disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        {pending ? C.builder.generatingLabel : C.builder.generateLabel}
      </Button>

      {result ? (
        <section className="space-y-3 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">{C.builder.previewTitle}</h3>
            <Button variant="outline" size="sm" onClick={download}>
              {C.columns.downloadLabel}
            </Button>
          </div>
          <div className="overflow-x-auto rounded border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  {result.columns.map((c) => (
                    <th key={c} className="px-3 py-2 text-left font-medium">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.length === 0 ? (
                  <tr>
                    <td colSpan={result.columns.length} className="px-3 py-4 text-center text-muted-foreground">
                      {C.builder.emptyPreview}
                    </td>
                  </tr>
                ) : (
                  result.rows.map((r, i) => (
                    <tr key={i} className="border-b last:border-b-0">
                      {result.columns.map((c) => (
                        <td key={c} className="px-3 py-2">
                          {String((r as Record<string, unknown>)[c] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">{C.builder.emptyPreview}</p>
      )}
    </div>
  );
}
