"use client";

import { Copy, ExternalLink, Power, PowerOff } from "lucide-react";
import type { Integration } from "@/features/integration/schema";
import { INTEGRATIONS_CONFIG } from "@/config/integrations";

interface IntegrationCardProps {
  item: Integration;
  onToggle: (id: string) => void;
  onOpen: (item: Integration) => void;
}

const C = INTEGRATIONS_CONFIG;

const ICON_MAP: Record<string, string> = {
  slack: "💬",
  discord: "🎮",
  stripe: "💳",
  github: "🐙",
  "google-analytics": "📊",
  sentry: "🐛",
  chart: "📈",
};

export function IntegrationCard({ item, onToggle, onOpen }: IntegrationCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-xl">
          {ICON_MAP[item.icon] ?? "🔌"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{item.name}</p>
          <p className="text-xs text-muted-foreground">
            {C.categories[item.category]}
          </p>
        </div>
        <span
          className={`text-xs font-medium ${
            item.connected ? "text-success" : "text-muted-foreground"
          }`}
        >
          {item.connected ? C.connectedLabel : C.disconnectedLabel}
        </span>
      </div>
      <p className="text-sm text-muted-foreground">{item.description}</p>
      {item.secretHint ? (
        <p className="font-mono text-xs text-muted-foreground">
          {item.secretHint}
        </p>
      ) : null}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={() => onToggle(item.id)}
          className={`inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm transition-colors ${
            item.connected
              ? "hover:bg-destructive/10 hover:text-destructive"
              : "hover:bg-primary/10 hover:text-primary"
          }`}
        >
          {item.connected ? (
            <>
              <PowerOff className="h-3.5 w-3.5" aria-hidden="true" />
              {C.disconnectLabel}
            </>
          ) : (
            <>
              <Power className="h-3.5 w-3.5" aria-hidden="true" />
              {C.connectLabel}
            </>
          )}
        </button>
        <button
          onClick={() => onOpen(item)}
          className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
        >
          Detail
        </button>
        {item.docHref ? (
          <a
            href={item.docHref}
            className="ml-auto inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
            {C.docsLabel}
          </a>
        ) : null}
      </div>
      {item.connected && item.connectedAt ? (
        <p className="text-xs text-muted-foreground">
          Terhubung sejak{" "}
          {new Date(item.connectedAt).toLocaleDateString("id-ID")}
        </p>
      ) : null}
    </div>
  );
}

void Copy;
