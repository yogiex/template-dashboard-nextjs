import { PageShell } from "@/components/layout/page-shell";
import { SettingsNav } from "@/components/layout/settings-nav";

export default function SettingsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <PageShell title="Settings" description="Konfigurasi tampilan dan identitas aplikasi.">
      <SettingsNav />
      <div className="pt-2">{children}</div>
    </PageShell>
  );
}
