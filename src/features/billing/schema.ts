import { z } from "zod";
import { BILLING_CONFIG } from "@/config/billing";

export const billingStatusSchema = z.enum(["paid", "pending", "failed"]);
export type BillingStatus = z.infer<typeof billingStatusSchema>;

export const invoiceSchema = z.object({
  id: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/),
  date: z.string().datetime(),
  planId: z.string().min(1).max(64),
  amount: z.number().min(0).max(100000),
  currency: z.string().length(3).regex(/^[A-Z]+$/),
  status: billingStatusSchema,
});

export type Invoice = z.infer<typeof invoiceSchema>;

export const usageSchema = z.object({
  cpuPercent: z.number().min(0).max(100),
  storageGB: z.number().min(0).max(100000),
  storageLimitGB: z.number().min(1).max(100000),
  apiRequests: z.number().min(0).max(10000000),
  apiLimit: z.number().min(1).max(10000000),
});

export type Usage = z.infer<typeof usageSchema>;

export const billingStateSchema = z.object({
  planId: z.string().min(1).max(64),
  usage: usageSchema,
  upgradedAt: z.string().datetime().nullable(),
});

export type BillingState = z.infer<typeof billingStateSchema>;

export const upgradePlanSchema = z.object({
  confirm: z.literal("UPGRADE"),
});

export type UpgradePlanInput = z.infer<typeof upgradePlanSchema>;

export const UPGRADE_CONFIRM_WORD = "UPGRADE";
