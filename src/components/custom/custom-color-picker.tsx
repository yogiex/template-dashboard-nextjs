"use client"

import { useState } from "react"
import { Pipette, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CUSTOM_PRESET_ID } from "@/config/appearance"
import { useAppearance } from "@/features/settings/hooks/use-appearance"

const HEX_PATTERN = /^#[0-9a-f]{6}$/i

export function CustomColorPicker() {
  const { appearance, setCustomColor, resetToDefault } = useAppearance()
  const [hexInput, setHexInput] = useState(appearance.customColor ?? "#2563eb")

  const isValid = HEX_PATTERN.test(hexInput)
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative flex size-9 cursor-pointer items-center justify-center rounded-md border" style={{ backgroundColor: isValid ? hexInput : undefined }} aria-label="Pilih warna dengan picker">
          <Pipette className="size-4 mix-blend-difference text-white" aria-hidden="true" />
          <input type="color" value={isValid ? hexInput : "#2563eb"} onChange={(event) => { setHexInput(event.target.value); setCustomColor(event.target.value) }} className="absolute inset-0 cursor-pointer opacity-0" tabIndex={-1} />
        </label>
        <Input value={hexInput} onChange={(event) => setHexInput(event.target.value)} placeholder="#2563eb" maxLength={7} className="w-28 font-mono text-sm" aria-label="Kode warna hex" aria-invalid={!isValid} />
        <Button size="sm" disabled={!isValid} onClick={() => setCustomColor(hexInput)}>Terapkan</Button>
        {appearance.primaryColor === CUSTOM_PRESET_ID ? <Button size="sm" variant="ghost" onClick={resetToDefault}><RotateCcw aria-hidden="true" />Reset</Button> : null}
      </div>
      {!isValid ? <p className="text-xs text-destructive" role="alert">Gunakan format hex 6 digit, misal #2563eb.</p> : null}
    </div>
  )
}
