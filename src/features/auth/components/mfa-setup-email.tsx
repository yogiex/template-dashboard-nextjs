"use client";

import { useState } from "react";
import { Loader2, MailCheck } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { OtpInput } from "@/features/auth/components/otp-input";
import type { MfaSetupEmailConfig } from "@/config/mfa-pages";

type MfaActionState<T = unknown> = {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
  };
};

type EmailEnrollmentState = {
  enrollmentId: string;
  maskedEmail: string;
};

async function startEmailEnrollmentAction(): Promise<
  MfaActionState<{
    enrollmentId: string;
    maskedEmail: string;
    expiresAt: number;
  }>
> {
  return {
    success: true,
    message: "Demo mode - backend not connected",
    data: {
      enrollmentId: "demo-enrollment",
      maskedEmail: "d***@example.com",
      expiresAt: Date.now() + 600000,
    },
  };
}

async function confirmEmailEnrollmentAction(
  _values: unknown
): Promise<MfaActionState<{ backupCodes: string[] }>> {
  return {
    success: true,
    message: "Demo mode - backend not connected",
    data: { backupCodes: ["demo-code-1", "demo-code-2"] },
  };
}

interface MfaSetupEmailProps {
  config: MfaSetupEmailConfig;
  isDemoMode: boolean;
  onComplete: (backupCodes: string[]) => void;
  onBack: () => void;
}

export function MfaSetupEmail({
  config,
  isDemoMode,
  onComplete,
  onBack,
}: MfaSetupEmailProps) {
  const [enrollment, setEnrollment] = useState<EmailEnrollmentState | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [code, setCode] = useState("");
  const [codeErrors, setCodeErrors] = useState<string[]>([]);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const sendCode = async () => {
    if (isSending) {
      return;
    }

    setGeneralError(null);
    setIsSending(true);

    try {
      const result: MfaActionState<{
        enrollmentId: string;
        maskedEmail: string;
        expiresAt: number;
      }> = await startEmailEnrollmentAction();

      if (result.success) {
        setEnrollment({
          enrollmentId: result.data!.enrollmentId,
          maskedEmail: result.data!.maskedEmail,
        });
        return;
      }

      setGeneralError(result.error?.message ?? "Unknown error");
    } catch (sendError) {
      console.error("[mfa-setup-email] send failed", sendError);
      setGeneralError("Kode tidak bisa dikirim. Coba lagi nanti.");
    } finally {
      setIsSending(false);
    }
  };

  const submit = async (value: string) => {
    if (value.length !== 6 || isSubmitting || !enrollment) {
      return;
    }

    setGeneralError(null);
    setCodeErrors([]);
    setIsSubmitting(true);

    try {
      const result = await confirmEmailEnrollmentAction({
        enrollmentId: enrollment.enrollmentId,
        code: value,
      });

      if (result.success) {
        onComplete(result.data!.backupCodes);
        return;
      }

      setCodeErrors(result.error?.fieldErrors?.code ?? []);
      setGeneralError(
        Object.keys(result.error?.fieldErrors ?? {}).length > 0
          ? null
          : result.error?.message ?? "Terjadi kesalahan. Silakan coba lagi.",
      );
      setCode("");
    } catch (submitError) {
      console.error("[mfa-setup-email] submit failed", submitError);
      setGeneralError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!enrollment) {
    return (
      <div className="space-y-6">
        <header className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight">{config.title}</h2>
          <p className="text-sm text-muted-foreground">
            {config.descriptionTemplate.replace("{email}", "email akun Anda")}
          </p>
        </header>

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

        <Button
          className="h-10 w-full"
          disabled={isSending}
          onClick={() => void sendCode()}
        >
          {isSending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : null}
          {isSending ? config.submittingLabel : config.sendCodeLabel}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="h-10 w-full"
          onClick={onBack}
        >
          {config.backLabel}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="text-xl font-bold tracking-tight">{config.title}</h2>
        <p className="text-sm text-muted-foreground">
          {config.descriptionTemplate.replace("{email}", enrollment.maskedEmail)}
        </p>
      </header>

      <Alert role="status">
        <MailCheck aria-hidden="true" />
        <AlertDescription>{config.sentMessage}</AlertDescription>
      </Alert>

      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{config.codeLabel}</p>

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

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-10 flex-1"
            disabled={isSending || isSubmitting}
            onClick={() => void sendCode()}
          >
            {config.resendLabel}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 flex-1"
            disabled={isSending || isSubmitting}
            onClick={onBack}
          >
            {config.backLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
