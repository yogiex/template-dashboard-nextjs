import type { Metadata } from "next"

import { CustomColorPicker } from "@/components/custom/custom-color-picker"
import { ThemeColorPicker } from "@/components/custom/theme-color-picker"
import { ThemeIO } from "@/components/custom/theme-io"
import { ThemePreview } from "@/components/custom/theme-preview"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ModeToggleSection } from "@/features/settings/components/mode-toggle-section"

export const metadata: Metadata = { title: "Tampilan" }

export default function AppearanceSettingsPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader><CardTitle>Warna Brand</CardTitle><CardDescription>Pilih preset atau tentukan warna kustom — diterapkan langsung ke seluruh aplikasi.</CardDescription></CardHeader>
        <CardContent className="space-y-6"><ThemeColorPicker /><Separator /><div><p className="mb-3 text-sm font-medium">Warna Kustom</p><CustomColorPicker /></div></CardContent>
      </Card>
      <ThemePreview />
      <Card>
        <CardHeader><CardTitle>Tema</CardTitle><CardDescription>Mode terang, gelap, atau ikut sistem.</CardDescription></CardHeader>
        <Separator />
        <CardContent className="flex items-center justify-between pt-6"><ModeToggleSection /><ThemeIO /></CardContent>
      </Card>
    </div>
  )
}
