"use client";

import { Check } from "lucide-react";

import { cn } from "cn";
import { Skeleton } from "@/components/ui/skeleton";
import { PRESET_COLORS } from "@/config/appearance";
import { useAppearance } from "@/features/settings/hooks/use-appearance";

export function ThemeColorPicker() {
  const { appearance, isLoaded, setPrimaryColor } = useAppearance();

  if (!isLoaded) {
    return <Skeleton className="h-12 w-full max-w-md rounded-lg" />;
  }

  return (
    <fieldset>
      <legend className="sr-only">Pilih warna utama</legend>
      <div role="radiogroup" aria-label="Warna utama" className="flex flex-wrap gap-3">
        {PRESET_COLORS.map((preset) => {
          const isSelected = appearance.primaryColor === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={preset.label}
              onClick={() => setPrimaryColor(preset.id)}
              className={cn(
                "flex size-12 items-center justify-center rounded-lg border-2 transition-colors",
                isSelected
                  ? "border-foreground"
                  : "border-transparent hover:border-muted-foreground/40"
              )}
            >
              <span
                aria-hidden="true"
                className="flex size-8 items-center justify-center rounded-md"
                style={{ backgroundColor: preset.swatch }}
              >
                {isSelected ? <Check className="size-4 text-white drop-shadow" /> : null}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Aktif: {PRESET_COLORS.find((preset) => preset.id === appearance.primaryColor)?.label ?? appearance.primaryColor}
      </p>
    </fieldset>
  );
}
