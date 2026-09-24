"use client";

import { useState } from "react";
import { Check, Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

const themes = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Laptop },
] as const;

export function ThemeToggle() {
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  return (
    <div className="relative">
      <button
        type="button"
        className="inline-flex size-9 items-center justify-center rounded-md border border-transparent text-foreground transition-colors hover:bg-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50"
        onClick={() => setOpen((value) => !value)}
        aria-label="Choose theme"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Sun className="size-4 dark:hidden" aria-hidden="true" />
        <Moon className="hidden size-4 dark:block" aria-hidden="true" />
      </button>
      {open ? (
        <div
          className="absolute right-0 top-11 z-50 min-w-36 rounded-md border border-border bg-background p-1 shadow-md"
          role="menu"
        >
          {themes.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm text-foreground hover:bg-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50"
              onClick={() => {
                setTheme(value);
                setOpen(false);
              }}
            >
              <Icon className="size-4" aria-hidden="true" />
              <span>{label}</span>
              {theme === value ? <Check className="ml-auto size-4" aria-hidden="true" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
