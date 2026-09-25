"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { DEFAULT_PRESET_ID, getPreset } from "@/config/appearance";
import { loadSettings, saveSettings } from "@/features/settings/service";
import type { Appearance } from "@/features/settings/schema";

function applyPresetToDom(primaryColorId: string): void {
  const preset = getPreset(primaryColorId);
  if (!preset) return;

  const root = document.documentElement;
  const entries: Array<[string, string | null]> = [
    ["--primary", preset.vars.primary],
    ["--primary-foreground", preset.vars.primaryForeground],
    ["--ring", preset.vars.ring],
    ["--sidebar-primary", preset.vars.sidebarPrimary],
  ];

  for (const [cssVar, value] of entries) {
    if (value === null) root.style.removeProperty(cssVar);
    else root.style.setProperty(cssVar, value);
  }
}

export function useAppearance() {
  const [, setVersion] = useState(0);
  const isLoaded = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );
  const currentAppearance = isLoaded
    ? loadSettings().appearance
    : { primaryColor: DEFAULT_PRESET_ID };

  useEffect(() => {
    applyPresetToDom(currentAppearance.primaryColor);
  }, [currentAppearance.primaryColor]);

  const setPrimaryColor = useCallback((primaryColor: string) => {
    const next: Appearance = { primaryColor };
    applyPresetToDom(primaryColor);
    saveSettings({ appearance: next });
    setVersion((value) => value + 1);
  }, []);

  return { appearance: currentAppearance, isLoaded, setPrimaryColor };
}
