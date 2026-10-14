import { z } from "zod";
import { clientLogger } from "@/lib/logger-client";
import { integrationListSchema, type Integration, type IntegrationList } from "@/features/integration/schema";

export type { Integration, IntegrationList };

const STORAGE_KEY = "integration.records";

const baseIntegrationList = (now = new Date()): readonly Integration[] => [
  { id: "slack", name: "Slack", description: "Kirim notifikasi event ke channel Slack.", category: "communication", icon: "slack", connected: true, connectedAt: new Date(now.getTime() - 3 * 24 * 60 * 60_000).toISOString(), webhookUrl: "https://hooks.slack.com/services/•••", docHref: "/help" },
  { id: "discord", name: "Discord", description: "Posting update ke Discord webhook.", category: "communication", icon: "discord", connected: false, connectedAt: null, docHref: "/help" },
  { id: "stripe", name: "Stripe", description: "Sinkronkan pembayaran & invoice.", category: "commerce", icon: "stripe", connected: true, connectedAt: new Date(now.getTime() - 12 * 24 * 60 * 60_000).toISOString(), secretHint: "sk_live_••••", docHref: "/help" },
  { id: "github", name: "GitHub", description: "Trigger workflow dari event aplikasi.", category: "devtool", icon: "github", connected: false, connectedAt: null, docHref: "/help" },
  { id: "google-analytics", name: "Google Analytics", description: "Kirim event tracking ke GA4.", category: "analytics", icon: "chart", connected: false, connectedAt: null, docHref: "/help" },
  { id: "sentry", name: "Sentry", description: "Kirim error dan metrik ke Sentry.", category: "devtool", icon: "sentry", connected: true, connectedAt: new Date(now.getTime() - 1 * 24 * 60 * 60_000).toISOString(), secretHint: "sntry••••", docHref: "/help" },
];

const DEFAULT_INTEGRATIONS: IntegrationList = baseIntegrationList();

function parseList(input: unknown): IntegrationList | null {
  const r = integrationListSchema.safeParse(input);
  return r.success ? r.data : null;
}

export function loadIntegrations(): IntegrationList {
  if (typeof window === "undefined") return [...DEFAULT_INTEGRATIONS];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_INTEGRATIONS];
    const parsed = JSON.parse(raw);
    const validated = parseList(parsed);
    if (validated) return validated;
    clientLogger.warn("integration.list.invalid");
    return [...DEFAULT_INTEGRATIONS];
  } catch (error) {
    clientLogger.error("integration.list.load_failed", error);
    return [...DEFAULT_INTEGRATIONS];
  }
}

export function saveIntegrations(list: IntegrationList): boolean {
  if (typeof window === "undefined") return false;
  const validated = parseList(list);
  if (!validated) return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(validated));
    return true;
  } catch (error) {
    clientLogger.error("integration.list.save_failed", error);
    return false;
  }
}

export function toggleIntegration(id: string): IntegrationList {
  const list = loadIntegrations();
  const next: IntegrationList = list.map((item) =>
    item.id === id
      ? {
          ...item,
          connected: !item.connected,
          connectedAt: !item.connected ? new Date().toISOString() : null,
        }
      : item,
  );
  saveIntegrations(next);
  return next;
}

export const FALLBACK_INTEGRATIONS: readonly Integration[] = DEFAULT_INTEGRATIONS;
