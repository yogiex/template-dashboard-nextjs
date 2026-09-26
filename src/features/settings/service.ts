import { DEFAULT_SETTINGS, settingsSchema, type Settings } from "@/features/settings/schema"
import { clientLogger } from "@/lib/logger-client"

const STORAGE_KEY = "app-settings"
function isBrowser() { return typeof window !== "undefined" }
function cloneDefaults(): Settings { return { appearance: { ...DEFAULT_SETTINGS.appearance }, themeVars: { ...DEFAULT_SETTINGS.themeVars } } }

export function loadSettings(): Settings {
  if (!isBrowser()) return cloneDefaults()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return cloneDefaults()
    const parsed = settingsSchema.safeParse(JSON.parse(raw))
    if (!parsed.success) { clientLogger.info("settings.load.invalid", { issue: parsed.error.issues[0]?.path }); return cloneDefaults() }
    return { ...parsed.data, appearance: { ...parsed.data.appearance }, themeVars: { ...parsed.data.themeVars } }
  } catch (error) { clientLogger.info("settings.load.failed", { err: error }); return cloneDefaults() }
}

export function saveSettings(settings: Settings): boolean {
  if (!isBrowser()) return false
  const current = loadSettings()
  const candidate: Settings = { ...current, ...settings, appearance: { ...current.appearance, ...settings.appearance } }
  const parsed = settingsSchema.safeParse(candidate)
  if (!parsed.success) { clientLogger.warn("settings.save.invalid", { issue: parsed.error.issues[0]?.path }); return false }
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed.data)); return true } catch (error) { clientLogger.warn("settings.save.failed", { err: error }); return false }
}
