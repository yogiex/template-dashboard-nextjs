"use client";

import { useState } from "react";
import { Check, Copy, Download } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { MfaBackupCodesConfig } from "@/config/mfa-pages";

interface MfaBackupCodesProps {
  config: MfaBackupCodesConfig;
  codes: string[];
  fileName?: string;
  onDone: () => void;
}

export function MfaBackupCodes({
  config,
  codes,
  fileName = "backup-codes.txt",
  onDone,
}: MfaBackupCodesProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const asText = codes.join("\n");

  const copy = async () => {
    setCopyError(null);

    try {
      await navigator.clipboard.writeText(asText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      setCopyError("Browser menolak akses clipboard. Pilih kode dan salin manual.");
    }
  };

  const download = () => {
    const blob = new Blob([`${asText}\n`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-xl font-bold tracking-tight">{config.title}</h2>
        <p className="text-sm text-muted-foreground">{config.description}</p>
      </header>

      <Alert variant="destructive" role="alert">
        <AlertDescription>{config.warning}</AlertDescription>
      </Alert>

      <ul className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-muted/30 p-4 font-mono text-sm sm:grid-cols-2">
        {codes.map((code) => (
          <li key={code} className="tabular-nums select-all">
            {code}
          </li>
        ))}
      </ul>

      {copyError ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{copyError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          className="h-10 flex-1"
          onClick={() => void copy()}
        >
          {isCopied ? (
            <Check aria-hidden="true" />
          ) : (
            <Copy aria-hidden="true" />
          )}
          {isCopied ? config.copiedLabel : config.copyLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-10 flex-1"
          onClick={download}
        >
          <Download aria-hidden="true" />
          {config.downloadLabel}
        </Button>
      </div>

      <div className="flex items-start gap-2 text-sm">
        <Checkbox
          id="mfa-backup-confirm"
          className="mt-0.5"
          checked={isConfirmed}
          onCheckedChange={(checked) => setIsConfirmed(checked === true)}
        />
        <label htmlFor="mfa-backup-confirm" className="leading-snug">
          {config.confirmLabel}
        </label>
      </div>

      <Button className="h-10 w-full" disabled={!isConfirmed} onClick={onDone}>
        {config.doneLabel}
      </Button>
    </div>
  );
}
