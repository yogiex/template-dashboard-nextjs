"use client"

import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import { ALLOWED_THEME_VARS, CUSTOM_PRESET_ID, DEFAULT_PRESET_ID, presetToThemeVars, type ThemeVars } from "@/config/appearance"
import { generateThemeVars } from "@/lib/color"
import { DEFAULT_SETTINGS, type Appearance, type Settings } from "@/features/settings/schema"
import { loadSettings, saveSettings } from "@/features/settings/service"

function applyThemeVars(vars: ThemeVars): void {
  const root = document.documentElement
  for (const key of ALLOWED_THEME_VARS) root.style.removeProperty(key)
  for (const [key, value] of Object.entries(vars)) root.style.setProperty(key, value)
}

export function useAppearance() {
  const [appearance, setAppearance] = useState<Appearance>(DEFAULT_SETTINGS.appearance)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const settings = loadSettings()
      setAppearance(settings.appearance)
      applyThemeVars(settings.themeVars)
      setIsLoaded(true)
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [])

  const commit = useCallback((next: Settings) => {
    applyThemeVars(next.themeVars)
    setAppearance(next.appearance)
    if (!saveSettings(next)) toast.warning("Pengaturan tampil untuk sesi ini, tetapi tidak dapat disimpan.")
  }, [])

  const setPrimaryColor = useCallback((presetId: string) => {
    const themeVars = presetId === DEFAULT_PRESET_ID ? {} : presetToThemeVars(presetId)
    commit({ appearance: { primaryColor: presetId }, themeVars })
  }, [commit])

  const setCustomColor = useCallback((hex: string) => {
    const themeVars = generateThemeVars(hex)
    if (!themeVars) {
      toast.error("Format warna tidak valid. Gunakan hex 6 digit, misal #2563eb.")
      return
    }
    const normalized = `#${hex.replace(/^#/, "").toLowerCase()}`
    commit({ appearance: { primaryColor: CUSTOM_PRESET_ID, customColor: normalized }, themeVars })
  }, [commit])

  const resetToDefault = useCallback(() => {
    for (const key of ALLOWED_THEME_VARS) document.documentElement.style.removeProperty(key)
    commit({ appearance: { primaryColor: DEFAULT_PRESET_ID }, themeVars: {} })
  }, [commit])

  return { appearance, isLoaded, setPrimaryColor, setCustomColor, resetToDefault }
}
