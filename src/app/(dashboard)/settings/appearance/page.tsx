import type { Metadata } from "next";

import { ThemeColorPicker } from "@/components/custom/theme-color-picker";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ModeToggleSection } from "@/features/settings/components/mode-toggle-section";

export const metadata: Metadata = { title: "Tampilan" };

export default function AppearanceSettingsPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Warna Brand</CardTitle>
          <CardDescription>Warna utama seluruh aplikasi — tersimpan di perangkat ini.</CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeColorPicker />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tema</CardTitle>
          <CardDescription>Mode terang, gelap, atau ikut sistem.</CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          <ModeToggleSection />
        </CardContent>
      </Card>
    </div>
  );
}
