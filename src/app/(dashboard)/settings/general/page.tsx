import type { Metadata } from "next";
import { Info } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = { title: "Pengaturan Umum" };

export default function GeneralSettingsPage() {
  const fields = [
    { label: "Nama aplikasi", value: siteConfig.name },
    { label: "Deskripsi", value: siteConfig.description },
    { label: "URL aplikasi", value: siteConfig.url },
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <Alert>
        <Info aria-hidden="true" />
        <AlertDescription>
          Template frontend-only — identitas dibaca dari <code className="font-mono text-xs">src/config/site.ts</code>. Ubah file tersebut untuk mengganti nilai di bawah.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Identitas Aplikasi</CardTitle>
          <CardDescription>Tampil di sidebar, halaman login, title browser, dan metadata.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.label}>
                {index > 0 ? <Separator className="mb-4" /> : null}
                <dt className="text-sm font-medium text-muted-foreground">{field.label}</dt>
                <dd className="mt-1 text-sm">{field.value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
