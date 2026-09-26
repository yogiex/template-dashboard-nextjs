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
    swatch: "oklch(0.596 0.145 163.225)",
    vars: {
      primary: "oklch(0.596 0.145 163.225)",
      primaryForeground: "oklch(0.979 0.021 166.113)",
      ring: "oklch(0.596 0.145 163.225)",
      sidebarPrimary: "oklch(0.596 0.145 163.225)",
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

export const DEFAULT_PRESET_ID = "emerald";

export function getPreset(id: string): ColorPreset | undefined {
  return PRESET_COLORS.find((preset) => preset.id === id);
}

export const ALLOWED_THEME_VARS = [
  "--primary", "--primary-foreground", "--ring", "--sidebar-primary", "--secondary", "--accent",
  "--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5",
] as const

export type ThemeVarName = (typeof ALLOWED_THEME_VARS)[number]
export type ThemeVars = Partial<Record<ThemeVarName, string>>
export const CUSTOM_PRESET_ID = "custom"

export function presetToThemeVars(id: string): ThemeVars {
  const preset = getPreset(id)
  if (!preset) return {}
  const mapping: Array<[keyof ColorPreset["vars"], ThemeVarName]> = [
    ["primary", "--primary"],
    ["primaryForeground", "--primary-foreground"],
    ["ring", "--ring"],
    ["sidebarPrimary", "--sidebar-primary"],
  ]
  const vars: ThemeVars = {}
  for (const [key, cssVar] of mapping) {
    const value = preset.vars[key]
    if (value !== null) vars[cssVar] = value
  }
  return vars
}