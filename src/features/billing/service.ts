import { clientLogger } from "@/lib/logger-client";
import {
  billingStateSchema,
  type BillingState,
  type Invoice,
  usageSchema,
} from "@/features/billing/schema";
import { BILLING_CONFIG } from "@/config/billing";

const STORAGE_KEY = "billing.state";

const INVOICES: Invoice[] = [
  { id: "inv_2026_09", date: "2026-09-01T00:00:00.000Z", planId: "free", amount: 0, currency: "USD", status: "paid" },
  { id: "inv_2026_08", date: "2026-08-01T00:00:00.000Z", planId: "free", amount: 0, currency: "USD", status: "paid" },
  { id: "inv_2026_07", date: "2026-07-01T00:00:00.000Z", planId: "pro", amount: 29, currency: "USD", status: "paid" },
  { id: "inv_2026_06", date: "2026-06-01T00:00:00.000Z", planId: "pro", amount: 29, currency: "USD", status: "paid" },
  { id: "inv_2026_05", date: "2026-05-01T00:00:00.000Z", planId: "pro", amount: 29, currency: "USD", status: "pending" },
];

function defaultState(): BillingState {
  return {
    planId: "free",
    usage: {
      cpuPercent: 34,
      storageGB: 0.4,
      storageLimitGB: 1,
      apiRequests: 312,
      apiLimit: 1000,
    },
    upgradedAt: null,
  };
}

export function loadBillingState(): BillingState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    const result = billingStateSchema.safeParse(parsed);
    if (result.success) return result.data;
    clientLogger.warn("billing.state.invalid");
    return defaultState();
  } catch (error) {
    clientLogger.error("billing.state.load_failed", error);
    return defaultState();
  }
}

export function saveBillingState(state: BillingState): boolean {
  if (typeof window === "undefined") return false;
  const result = billingStateSchema.safeParse(state);
  if (!result.success) return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(result.data));
    return true;
  } catch (error) {
    clientLogger.error("billing.state.save_failed", error);
    return false;
  }
}

export function upgradePlan(planId: string): BillingState {
  const state = loadBillingState();
  const next: BillingState = {
    ...state,
    planId,
    upgradedAt: new Date().toISOString(),
  };
  if (planId === "pro") {
    next.usage = {
      ...next.usage,
      storageLimitGB: 50,
      apiLimit: 100000,
    };
  } else {
    next.usage = {
      ...next.usage,
      storageLimitGB: 1,
      apiLimit: 1000,
    };
  }
  // Validate usage schema
  const u = usageSchema.safeParse(next.usage);
  if (!u.success) return state;
  if (!saveBillingState(next)) return state;
  return next;
}

export function getInvoices(): Invoice[] {
  return [...INVOICES];
}

export function downloadInvoice(inv: Invoice): void {
  if (typeof window === "undefined") return;
  const text = [`Invoice: ${inv.id}`, `Date: ${inv.date}`, `Plan: ${inv.planId}`, `Amount: ${inv.amount} ${inv.currency}`, `Status: ${inv.status}`].join("\n");
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${inv.id}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
}