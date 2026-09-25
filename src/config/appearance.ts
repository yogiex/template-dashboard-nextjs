export interface ColorPreset {
  id: string;
  label: string;
  swatch: string;
  vars: {
    primary: string | null;
    primaryForeground: string | null;
    ring: string | null;
    sidebarPrimary: string | null;
  };
}

export const PRESET_COLORS: ColorPreset[] = [
  {
    id: "default",
    label: "Default",
    swatch: "oklch(0.205 0 0)",
    vars: { primary: null, primaryForeground: null, ring: null, sidebarPrimary: null },
  },
  {
    id: "blue",
    label: "Biru",
    swatch: "oklch(0.55 0.18 255)",
    vars: {
      primary: "oklch(0.55 0.18 255)",
      primaryForeground: "oklch(0.985 0 0)",
      ring: "oklch(0.55 0.18 255)",
      sidebarPrimary: "oklch(0.55 0.18 255)",
    },
  },
  {
    id: "violet",
    label: "Violet",
    swatch: "oklch(0.55 0.22 300)",
    vars: {
      primary: "oklch(0.55 0.22 300)",
      primaryForeground: "oklch(0.985 0 0)",
      ring: "oklch(0.55 0.22 300)",
      sidebarPrimary: "oklch(0.55 0.22 300)",
    },
  },
  {
    id: "emerald",
    label: "Emerald",
    swatch: "oklch(0.6 0.13 165)",
    vars: {
      primary: "oklch(0.6 0.13 165)",
      primaryForeground: "oklch(0.985 0 0)",
      ring: "oklch(0.6 0.13 165)",
      sidebarPrimary: "oklch(0.6 0.13 165)",
    },
  },
  {
    id: "orange",
    label: "Oranye",
    swatch: "oklch(0.65 0.19 45)",
    vars: {
      primary: "oklch(0.65 0.19 45)",
      primaryForeground: "oklch(0.985 0 0)",
      ring: "oklch(0.65 0.19 45)",
      sidebarPrimary: "oklch(0.65 0.19 45)",
    },
  },
  {
    id: "rose",
    label: "Rose",
    swatch: "oklch(0.6 0.2 15)",
    vars: {
      primary: "oklch(0.6 0.2 15)",
      primaryForeground: "oklch(0.985 0 0)",
      ring: "oklch(0.6 0.2 15)",
      sidebarPrimary: "oklch(0.6 0.2 15)",
    },
  },
] as const;

export const DEFAULT_PRESET_ID = "default";

export function getPreset(id: string): ColorPreset | undefined {
  return PRESET_COLORS.find((preset) => preset.id === id);
}
