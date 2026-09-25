"use client";

import { cn } from "cn";
import { getPasswordStrength } from "@/lib/password-strength";

interface PasswordStrengthMeterProps {
  password: string;
  id?: string;
}

const SEGMENT_CLASS: Record<number, string> = {
  1: "bg-destructive",
  2: "bg-amber-500",
  3: "bg-emerald-500",
  4: "bg-emerald-600",
};

export function PasswordStrengthMeter({ password, id }: PasswordStrengthMeterProps) {
  const { score, label } = getPasswordStrength(password);

  if (password.length === 0) return null;

  return (
    <div id={id} aria-live="polite" className="mt-2 space-y-1">
      <div className="flex gap-1" aria-hidden="true">
        {[1, 2, 3, 4].map((segment) => (
          <span
            key={segment}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              segment <= score ? SEGMENT_CLASS[score] : "bg-muted"
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Kekuatan: <span className="font-medium text-foreground">{label}</span>
      </p>
    </div>
  );
}
