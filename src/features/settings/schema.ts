import { z } from "zod"

import { ALLOWED_THEME_VARS, CUSTOM_PRESET_ID, DEFAULT_PRESET_ID, PRESET_COLORS, type ThemeVarName, type ThemeVars } from "@/config/appearance"

const presetIds = [...PRESET_COLORS.map((preset) => preset.id), CUSTOM_PRESET_ID] as unknown as [string, ...string[]]
const oklchPattern = String.raw`oklch\(\s*[0-9.]+\s+[0-9.]+\s+[0-9.]+\s*\)`
const themeVarValueSchema = z.string().max(150).regex(new RegExp(`^(?:${oklchPattern}|light-dark\\(\\s*${oklchPattern}\\s*,\\s*${oklchPattern}\\s*\\))$`), "Nilai harus oklch() atau light-dark(oklch(), oklch())")

export const themeVarsSchema = z.record(z.string().max(30), themeVarValueSchema).refine((vars) => Object.keys(vars).every((key) => (ALLOWED_THEME_VARS as readonly string[]).includes(key)), "CSS var di luar whitelist")

export const appearanceSchema = z.object({
  primaryColor: z.enum(presetIds).catch(DEFAULT_PRESET_ID).default(DEFAULT_PRESET_ID),
  customColor: z.string().regex(/^#[0-9a-f]{6}$/i, "Harus hex 6 digit").optional(),
})

export type Appearance = z.infer<typeof appearanceSchema>
export type ValidatedThemeVars = z.infer<typeof themeVarsSchema>

export const settingsSchema = z.object({
  appearance: appearanceSchema.default({}),
  themeVars: themeVarsSchema.default({}),
})

export type Settings = z.infer<typeof settingsSchema>

export const DEFAULT_SETTINGS: Settings = {
  appearance: { primaryColor: DEFAULT_PRESET_ID },
  themeVars: {},
}

export type { ThemeVarName, ThemeVars }
