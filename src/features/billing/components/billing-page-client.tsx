"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BILLING_CONFIG } from "@/config/billing";
import { getInvoices, downloadInvoice, loadBillingState, upgradePlan } from "@/features/billing/service";
import type { BillingState, Invoice } from "@/features/billing/schema";
import { UPGRADE_CONFIRM_WORD } from "@/features/billing/schema";

const C = BILLING_CONFIG;
const PLANS = [C.plans.free, C.plans.pro] as const;

export function BillingPageClient() {
  const [state, setState] = useState<BillingState>(() => loadBillingState());
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const invoices = getInvoices();

  const plan = PLANS.find((p) => p.id === state.planId) ?? PLANS[0];
  const nextPlan = state.planId === "free" ? C.plans.pro : C.plans.pro;

  const handleUpgrade = async () => {
    setPending(true);
    try {
      const next = upgradePlan("pro");
      setState(next);
      setConfirmOpen(false);
      toast.success(C.plan.upgradeSuccess);
    } catch {
      toast.error("Gagal mengubah paket.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      <Alert>
        <AlertDescription>{C.infoAlert}</AlertDescription>
      </Alert>

      <section className="rounded-lg border p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{C.plan.currentLabel}</p>
            <h2 className="text-xl font-semibold">{plan.name}</h2>
            <p className="text-sm text-muted-foreground">
              {plan.priceMonthly === 0
                ? "Gratis"
                : `$${plan.priceMonthly}/bulan`}
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              {plan.features.map((f) => (
                <li key={f}>• {f}</li>
              ))}
            </ul>
          </div>
          {state.planId !== "pro" ? (
            <Button onClick={() => setConfirmOpen(true)} className="h-10">
              {C.plan.upgradeLabel}
            </Button>
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-semibold">{C.usage.title}</h3>
        <Meter label={C.usage.cpuLabel} value={state.usage.cpuPercent} max={100} unit="%" />
        <Meter label={C.usage.storageLabel} value={state.usage.storageGB} max={state.usage.storageLimitGB} unit="GB" />
        <Meter
          label={C.usage.apiLabel}
          value={state.usage.apiRequests}
          max={state.usage.apiLimit}
          unit=""
        />
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-semibold">{C.invoices.title}</h3>
        {invoices.length === 0 ? (
          <div className="rounded-lg border p-6 text-center text-sm">
            {C.invoices.empty}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-3 py-2 text-left font-medium">{C.invoices.columns.id}</th>
                  <th className="px-3 py-2 text-left font-medium">{C.invoices.columns.date}</th>
                  <th className="px-3 py-2 text-left font-medium">{C.invoices.columns.plan}</th>
                  <th className="px-3 py-2 text-left font-medium">{C.invoices.columns.amount}</th>
                  <th className="px-3 py-2 text-left font-medium">{C.invoices.columns.status}</th>
                  <th className="px-3 py-2 text-right font-medium">
                    {C.invoices.downloadLabel}
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b last:border-b-0">
                    <td className="px-3 py-2 font-mono text-xs">{inv.id}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {new Date(inv.date).toLocaleDateString("id-ID")}
                    </td>
                    <td className="px-3 py-2">{inv.planId}</td>
                    <td className="px-3 py-2">
                      ${inv.amount.toFixed(2)} {inv.currency}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => downloadInvoice(inv)}
                        className="text-xs text-primary hover:underline"
                      >
                        {C.invoices.downloadLabel}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{C.plan.upgradeLabel}</AlertDialogTitle>
            <AlertDialogDescription>
              Ketik {UPGRADE_CONFIRM_WORD} untuk konfirmasi upgrade ke Pro.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={handleUpgrade}
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
              {C.plan.upgradeLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <span className="hidden">{nextPlan.name}</span>
    </div>
  );
}

function Meter({
  label,
  value,
  max,
  unit,
}: {
  label: string;
  value: number;
  max: number;
  unit: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {value.toLocaleString("id-ID")}
          {unit ? ` ${unit}` : ""} / {max.toLocaleString("id-ID")}
          {unit ? ` ${unit}` : ""}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
        />
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Invoice["status"] }) {
  const map: Record<Invoice["status"], string> = {
    paid: C.invoices.status.paid,
    pending: C.invoices.status.pending,
    failed: C.invoices.status.failed,
  };
  const variant =
    status === "paid" ? "secondary" : status === "pending" ? "outline" : "destructive";
  return <Badge variant={variant as "secondary" | "outline" | "destructive"}>{map[status]}</Badge>;
}
