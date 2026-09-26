import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function ThemePreview() {
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Preview</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2"><Button size="sm">Primary</Button><Button size="sm" variant="secondary">Secondary</Button><Badge>Badge</Badge></div>
        <div className="flex h-24 items-end gap-1.5 rounded-md border p-2" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((index) => <div key={index} className="flex-1 rounded-sm" style={{ height: `${40 + index * 14}%`, backgroundColor: `var(--chart-${index + 1})` }} />)}
        </div>
        <p className="sr-only">Pratinjau warna chart dan tombol dengan tema aktif.</p>
      </CardContent>
    </Card>
  )
}
