import { cn } from "cn";

import type { RiskLevel } from "@/features/ueba/schema";

const LEVEL_CLASS: Record<RiskLevel, string> = {
  low: "bg-risk-low/15 text-risk-low",
  medium: "bg-risk-medium/15 text-risk-medium",
  high: "bg-risk-high/15 text-risk-high",
  critical: "bg-risk-critical/15 text-risk-critical",
};

interface RiskBadgeProps {
  level: RiskLevel;
  score?: number;
  label?: string;
  className?: string;
}

export function RiskBadge({ level, score, label, className }: RiskBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        LEVEL_CLASS[level],
        className,
      )}
    >
      {label ?? level}
      {typeof score === "number" ? ` · ${score}` : ""}
    </span>
  );
}
