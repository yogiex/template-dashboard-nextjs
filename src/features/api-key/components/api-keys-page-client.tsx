"use client";

import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { API_KEYS_CONFIG } from "@/config/api-keys";
import { ApiKeyTable } from "@/features/api-key/components/api-key-table";
import { CreateApiKeyDialog } from "@/features/api-key/components/create-api-key-dialog";
import { loadApiKeys, type ApiKey } from "@/features/api-key/service";

const C = API_KEYS_CONFIG;

export function ApiKeysPageClient() {
  const [keys, setKeys] = useState<ApiKey[]>(() => loadApiKeys());

  const refresh = () => setKeys(loadApiKeys());

  return (
    <div className="space-y-6">
      <Alert>
        <AlertDescription>{C.infoAlert}</AlertDescription>
      </Alert>
      <Alert variant="default">
        <AlertDescription>{C.securityWarning}</AlertDescription>
      </Alert>
      <div className="flex justify-end">
        <CreateApiKeyDialog onCreated={refresh} />
      </div>
      <ApiKeyTable keys={keys} onChanged={refresh} />
    </div>
  );
}
