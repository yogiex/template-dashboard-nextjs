import type { Metadata } from "next";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { UEBA_PAGE_CONFIG } from "@/config/observability";
import { UserRiskTable } from "@/features/ueba/components/user-risk-table";
import { listUserRiskProfiles } from "@/features/ueba/service";

export const metadata: Metadata = {
  title: "User Behavior Analytics",
  description: "Deteksi anomali perilaku user berdasarkan baseline historis.",
};

/**
 * Server Component di bawah `(dashboard)/settings/layout.tsx`, jadi TIDAK memakai
 * `PageShell` lagi. `force-dynamic` wajib karena data berasal dari store
 * in-memory yang berubah setiap request.
 */
export const dynamic = "force-dynamic";

export default function UebaSettingsPage() {
  const config = UEBA_PAGE_CONFIG;
  const { items } = listUserRiskProfiles({});

  return (
    <div className="space-y-6">
      <Alert>
        <AlertDescription>{config.description}</AlertDescription>
      </Alert>

      {items.length === 0 ? (
        <div className="rounded-xl border border-border p-12 text-center">
          <p className="text-sm font-medium">{config.emptyTitle}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {config.emptyDescription}
          </p>
        </div>
      ) : (
        <UserRiskTable profiles={items} config={config} />
      )}
    </div>
  );
}
