import type { Metadata } from "next";

import { PageShell } from "@/components/layout/page-shell";
import { API_KEYS_CONFIG } from "@/config/api-keys";
import { ApiKeysPageClient } from "@/features/api-key/components/api-keys-page-client";

export const metadata: Metadata = { title: API_KEYS_CONFIG.title };

export default function ApiKeysPage() {
  return (
    <PageShell
      title={API_KEYS_CONFIG.title}
      description={API_KEYS_CONFIG.description}
    >
      <div className="max-w-6xl">
        <ApiKeysPageClient />
      </div>
    </PageShell>
  );
}
