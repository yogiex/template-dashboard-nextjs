"use client"

import { useRef } from "react"
import { Download, Upload } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { applySettingsToDom } from "@/features/settings/lib/apply-settings"
import { loadSettings, saveSettings } from "@/features/settings/service"
import { settingsSchema } from "@/features/settings/schema"

export function ThemeIO() {
  const fileInputRef = useRef<HTMLInputElement>(null)

  function exportTheme() {
    const parsed = settingsSchema.safeParse(loadSettings())
    if (!parsed.success) { toast.error("Pengaturan tema tidak valid."); return }
    const blob = new Blob([JSON.stringify(parsed.data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "theme.json"
    anchor.click()
    URL.revokeObjectURL(url)
  }

  async function importTheme(file: File) {
    try {
      const parsed = settingsSchema.safeParse(JSON.parse(await file.text()) as unknown)
      if (!parsed.success) { toast.error("File tema tidak valid."); return }
      if (!saveSettings(parsed.data) || !applySettingsToDom(parsed.data)) { toast.error("Tema tidak dapat diterapkan."); return }
      toast.success("Tema berhasil diimpor.")
    } catch {
      toast.error("File bukan JSON yang valid.")
    }
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" onClick={exportTheme}><Download aria-hidden="true" />Ekspor</Button>
      <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}><Upload aria-hidden="true" />Impor</Button>
      <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" aria-label="Impor file tema" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importTheme(file); event.target.value = "" }} />
    </div>
  )
}
