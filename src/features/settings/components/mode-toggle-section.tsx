"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { cn } from "cn";

const MODES = [
  { value: "light", label: "Terang" },
  { value: "dark", label: "Gelap" },
  { value: "system", label: "Sistem" },
] as const;

export function ModeToggleSection() {
  const { theme, setTheme } = useTheme();
  const isMounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );

  return (
    <div role="radiogroup" aria-label="Mode tema" className="flex gap-2">
      {MODES.map((mode) => (
        <Button
          key={mode.value}
          type="button"
          role="radio"
          aria-checked={isMounted && theme === mode.value}
          variant={isMounted && theme === mode.value ? "default" : "outline"}
          size="sm"
          onClick={() => setTheme(mode.value)}
          className={cn(!isMounted && "opacity-50")}
        >
          {mode.label}
        </Button>
      ))}
    </div>
  );
}
