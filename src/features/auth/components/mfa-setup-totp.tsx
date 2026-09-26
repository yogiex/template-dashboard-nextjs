"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  confirmTotpEnrollmentAction,
  startTotpEnrollmentAction,
  type MfaActionState,
} from "@/features/auth/actions";
import { OtpInput } from "@/features/auth/components/otp-input";
import type { MfaSetupTotpConfig } from "@/config/mfa-pages";

type TotpSecretState = {
  enrollmentId: string;
  secret: string;
  otpauthUrl: string;
};

interface MfaSetupTotpProps {
  config: MfaSetupTotpConfig;
  isDemoMode: boolean;
  onComplete: (backupCodes: string[]) => void;
  onBack: () => void;
}

export function MfaSetupTotp({
  config,
  isDemoMode,
  onComplete,
  onBack,
}: MfaSetupTotpProps) {
  const [secretState, setSecretState] = useState<TotpSecretState | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [codeErrors, setCodeErrors] = useState<string[]>([]);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      try {
        const result: MfaActionState<TotpSecretState> =
          await startTotpEnrollmentAction();

        if (cancelled) {
          return;
        }

        if (result.success) {
          setSecretState(result.data);
          return;
        }

        setStartError(result.error.message);
      } catch (error) {
        console.error("[mfa-setup-totp] start failed", error);

        if (!cancelled) {
          setStartError("Kode rahasia tidak bisa dibuat. Muat ulang halaman.");
        }
      }
    };

    void start();

    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async (value: string) => {
    if (value.length !== 6 || isSubmitting || !secretState) {
      return;
    }

    setGeneralError(null);
    setCodeErrors([]);
    setIsSubmitting(true);

    try {
      const result = await confirmTotpEnrollmentAction({
        enrollmentId: secretState.enrollmentId,
        code: value,
      });

      if (result.success) {
        onComplete(result.data.backupCodes);
        return;
      }

      setCodeErrors(result.error.fieldErrors?.code ?? []);
      setGeneralError(
        Object.keys(result.error.fieldErrors ?? {}).length > 0
          ? null
          : result.error.message,
      );
      setCode("");
    } catch (submitError) {
      console.error("[mfa-setup-totp] submit failed", submitError);
      setGeneralError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copySecret = async () => {
    if (!secretState) {
      return;
    }

    try {
      await navigator.clipboard.writeText(secretState.secret);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      setGeneralError("Browser menolak akses clipboard. Salin manual dari kode di atas.");
    }
  };

  if (startError) {
    return (
      <Alert variant="destructive" role="alert">
        <AlertDescription>{startError}</AlertDescription>
      </Alert>
    );
  }

  if (!secretState) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-xl font-bold tracking-tight">{config.title}</h2>
        <p className="text-sm text-muted-foreground">{config.description}</p>
      </header>

      <div className="flex justify-center rounded-xl border border-border bg-white p-6 dark:bg-muted">
        <QRCodeSVG
          value={secretState.otpauthUrl}
          size={180}
          role="img"
          aria-label={config.qrLabel}
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">{config.manualEntryLabel}</p>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
          <code className="flex-1 select-all font-mono text-xs break-all">
            {secretState.secret}
          </code>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={() => void copySecret()}
            aria-label={isCopied ? config.copiedLabel : config.copySecretLabel}
          >
            {isCopied ? (
              <Check className="size-3.5 text-primary" aria-hidden="true" />
            ) : (
              <Copy className="size-3.5" aria-hidden="true" />
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{config.codeLabel}</p>

        {isDemoMode ? (
          <Alert>
            <AlertDescription>{config.demoHint}</AlertDescription>
          </Alert>
        ) : null}

        {generalError ? (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{generalError}</AlertDescription>
          </Alert>
        ) : null}

        {codeErrors.length > 0 ? (
          <Alert variant="destructive" role="alert">
            <AlertDescription>
              {codeErrors.map((message) => (
                <span key={message} className="block">
                  {message}
                </span>
              ))}
            </AlertDescription>
          </Alert>
        ) : null}

        <OtpInput
          value={code}
          onChange={setCode}
          onComplete={(value) => void submit(value)}
          disabled={isSubmitting}
          groupLabel={config.codeLabel}
          autoFocus
          invalid={codeErrors.length > 0}
        />

        <Button
          className="h-10 w-full"
          disabled={isSubmitting || code.length !== 6}
          onClick={() => void submit(code)}
        >
          {isSubmitting ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : null}
          {isSubmitting ? config.submittingLabel : config.confirmLabel}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="h-10 w-full"
          disabled={isSubmitting}
          onClick={onBack}
        >
          {config.backLabel}
        </Button>
      </div>
    </div>
  );
}
