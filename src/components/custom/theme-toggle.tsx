"use client";

import { Menu } from "@base-ui/react/menu";
import { Check, Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { cn } from "cn";

const themes = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Laptop },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="Choose theme"
        className={cn(
          "inline-flex size-9 items-center justify-center rounded-md text-foreground",
          "transition-colors hover:bg-muted data-popup-open:bg-muted",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50",
        )}
      >
        <Sun className="size-4 dark:hidden" aria-hidden="true" />
        <Moon className="hidden size-4 dark:block" aria-hidden="true" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end">
          <Menu.Popup className="z-50 min-w-36 rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
            <Menu.RadioGroup
              value={theme}
              onValueChange={(value: string) => setTheme(value)}
            >
              {themes.map(({ value, label, icon: Icon }) => (
                <Menu.RadioItem
                  key={value}
                  value={value}
                  closeOnClick
                  className="flex w-full cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-2 text-left text-sm outline-none data-highlighted:bg-foreground/10"
                >
                  <Icon className="size-4" aria-hidden="true" />
                  <span>{label}</span>
                  <Menu.RadioItemIndicator className="ml-auto flex items-center">
                    <Check className="size-4" aria-hidden="true" />
                  </Menu.RadioItemIndicator>
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
