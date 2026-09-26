import type { LucideIcon } from "lucide-react";
import { cn } from "cn";

import type { MfaMethodCardConfig } from "@/config/mfa-pages";

interface MfaMethodCardProps {
  config: MfaMethodCardConfig;
  icon: LucideIcon;
  selected: boolean;
  onSelect: (method: MfaMethodCardConfig["method"]) => void;
}

export function MfaMethodCard({
  config,
  icon: Icon,
  selected,
  onSelect,
}: MfaMethodCardProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onSelect(config.method)}
      className={cn(
        "flex w-full items-start gap-4 rounded-xl border p-4 text-left transition-colors",
        "outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        selected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/40 hover:bg-muted/40",
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg",
          selected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-5" aria-hidden="true" />
      </span>

      <span className="flex-1 space-y-1">
        <span className="flex items-center gap-2">
          <span className="text-sm font-semibold">{config.title}</span>
          {config.badge ? (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-primary">
              {config.badge}
            </span>
          ) : null}
        </span>
        <span className="block text-sm text-muted-foreground">
          {config.description}
        </span>
      </span>
    </button>
  );
}
