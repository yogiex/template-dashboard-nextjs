"use client";

import { useEffect, useState } from "react";
import { Camera, CheckCircle2, KeyRound, Shield } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MFA_SETTINGS_CONFIG } from "@/config/mfa-settings";
import { generateBackupCodes, generateBase32Secret, totpVerifySchema } from "@/features/mfa/schema";
import { loadMfaState, saveMfaState, verifyTotp } from "@/features/mfa/service";

const C = MFA_SETTINGS_CONFIG;

type Phase = "idle" | "enrolling" | "backup";

export function MfaEnrollCard() {
  const [state, setState] = useState(loadMfaState);
  const [phase, setPhase] = useState<Phase>(state.enrolled ? "idle" : "idle");
  useEffect(() => {
    if (state.enrolled) {
      setPhase("backup");
    } else {
      setPhase("idle");
    }
  }, [state.enrolled]);

  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const startEnroll = () => {
    setSecret(generateBase32Secret());
    setCode("");
    setError(null);
    setPhase("enrolling");
  };

  const cancelEnroll = () => {
    setSecret(null);
    setCode("");
    setError(null);
    setPhase(state.enrolled ? "backup" : "idle");
  };

  const handleVerify = () => {
    const parsed = totpVerifySchema.safeParse({ code });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Kode tidak valid");
      return;
    }
    setPending(true);
    const ok = verifyTotp(parsed.data.code);
    setPending(false);
    if (!ok) {
      setError("Kode tidak valid. Coba lagi.");
      return;
    }
    const backupCodes = generateBackupCodes();
    const nextState = {
      enrolled: true,
      secret: null,
      backupCodes,
      deviceTrust: state.deviceTrust,
      enrolledAt: new Date().toISOString(),
    };
    setState(nextState);
    saveMfaState(nextState);
    setSecret(null);
    setCode("");
    setError(null);
    setPhase("backup");
    toast.success(C.enroll.verifiedLabel);
  };

  const disable = () => {
    if (!window.confirm(`Ketik ${C.disable.confirmWord} untuk menonaktifkan?`)) return;
    const next = { enrolled: false, secret: null, backupCodes: [], deviceTrust: false, enrolledAt: null };
    setState(next);
    saveMfaState(next);
    setPhase("idle");
    toast.success(C.disable.disabledLabel);
  };

  if (phase === "idle") {
    return (
      <div className="space-y-4 rounded-lg border p-4">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" aria-hidden="true" />
          <div>
            <p className="font-medium">
              {state.enrolled ? C.status.enrolled : C.status.notEnrolled}
            </p>
            {state.enrolled && state.enrolledAt ? (
              <p className="text-xs text-muted-foreground">
                Aktif sejak {new Date(state.enrolledAt).toLocaleDateString("id-ID")}
              </p>
            ) : null}
          </div>
        </div>
        {!state.enrolled ? (
          <Button onClick={startEnroll} className="h-10">
            {C.enroll.startLabel}
          </Button>
        ) : (
          <Button variant="destructive" onClick={disable} className="h-10">
            {C.disable.buttonLabel}
          </Button>
        )}
        <Alert>
          <AlertDescription>{C.infoAlert}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (phase === "enrolling" && secret) {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=otpauth://totp/Dashboard:${encodeURIComponent(state?.enrolled ? "user" : "user")}?secret=${secret}&issuer=Dashboard`;
    return (
      <div className="space-y-4 rounded-lg border p-4">
        <p className="font-medium">{C.enroll.qrTitle}</p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <img
            src={qrUrl}
            alt="QR code MFA"
            width={160}
            height={160}
            className="rounded border"
          />
          <div className="text-sm">
            <p className="text-muted-foreground">{C.enroll.manualLabel}</p>
            <code className="block break-all rounded bg-muted px-2 py-1 font-mono text-xs">
              {secret}
            </code>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="totp-code">
            {C.enroll.codeLabel}
          </label>
          <Input
            id="totp-code"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder={C.enroll.codePlaceholder}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="h-10 max-w-xs"
          />
          <p className="text-xs text-muted-foreground">{C.enroll.mockHint}</p>
        </div>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <div className="flex gap-2">
          <Button onClick={handleVerify} disabled={pending} className="h-10">
            {C.enroll.verifyLabel}
          </Button>
          <Button variant="outline" onClick={cancelEnroll} className="h-10" disabled={pending}>
            {C.enroll.cancelLabel}
          </Button>
        </div>
      </div>
    );
  }

  // backup phase (enrolled)
  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center gap-3">
        <CheckCircle2 className="h-6 w-6 text-success" aria-hidden="true" />
        <div>
          <p className="font-medium">{C.status.enrolled}</p>
          {state.enrolledAt ? (
            <p className="text-xs text-muted-foreground">
              {new Date(state.enrolledAt).toLocaleString("id-ID")}
            </p>
          ) : null}
        </div>
      </div>
      <BackupCodesBlock
        codes={state.backupCodes}
        onRegenerate={() => {
          const codes = generateBackupCodes();
          const next = { ...state, backupCodes: codes };
          setState(next);
          saveMfaState(next);
          toast.success(C.backup.regenerateNote);
        }}
      />      <Alert>
        <AlertDescription>{C.infoAlertProduction}</AlertDescription>
      </Alert>
    </div>
  );
}

function BackupCodesBlock({
  codes,
  onRegenerate,
}: {
  codes: string[];
  onRegenerate: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      setCopied(true);
      toast.success(C.backup.copyLabelSuccess);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      void (error as unknown);
      toast.error("Gagal menyalin kode backup.");
    }
  };
  const download = () => {
    try {
      const blob = new Blob([codes.join("\n")], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "backup-codes.txt";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      void (error as unknown);
      toast.error("Gagal mengunduh kode backup.");
    }
  };
  const regenerate = () => {
    onRegenerate();
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{C.backup.title}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {codes.map((c) => (
          <code
            key={c}
            className="rounded bg-muted px-2 py-1 text-center font-mono text-xs"
          >
            {c}
          </code>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 pt-2">
        <Button variant="outline" size="sm" onClick={copy}>
          {copied ? C.backup.copyLabelSuccess : C.backup.copyLabel}
        </Button>
        <Button variant="outline" size="sm" onClick={download}>
          {C.backup.downloadLabel}
        </Button>
        <Button variant="ghost" size="sm" onClick={regenerate}>
          {C.backup.regenerateLabel}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{C.backup.regenerateNote}</p>
    </div>
  );
}


