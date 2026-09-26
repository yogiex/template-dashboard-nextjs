import { ALLOWED_THEME_VARS } from "@/config/appearance"
import { settingsSchema, type Settings } from "@/features/settings/schema"

export function applySettingsToDom(settings: Settings): boolean {
  if (typeof document === "undefined") return false
  const parsed = settingsSchema.safeParse(settings)
  if (!parsed.success) return false
  const root = document.documentElement
  for (const key of ALLOWED_THEME_VARS) root.style.removeProperty(key)
  for (const [key, value] of Object.entries(parsed.data.themeVars)) root.style.setProperty(key, value)
  return true
}
