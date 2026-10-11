"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { OtpInput } from "@/features/auth/components/otp-input";
import type { MfaMethod } from "@/features/auth/schema";
import type { MfaChallengePageConfig } from "@/config/mfa-pages";

interface MfaLoginFormProps {
  config: MfaChallengePageConfig;
  method: MfaMethod;
  maskedEmail: string;
  isDemoMode: boolean;
}

type ActionState = {
  success: boolean;
  message?: string;
  error?: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
  };
};

async function verifyMfaAction(
  _values: unknown
): Promise<ActionState> {
  return { success: true, message: "Demo mode - backend not connected" };
}

async function resendMfaCodeAction(): Promise<ActionState> {
  return { success: true, message: "Demo mode - backend not connected" };
}

export function MfaLoginForm({
  config,
  method,
  maskedEmail,
  isDemoMode,
}: MfaLoginFormProps) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [actionError, setActionError] = useState<ActionState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const error = actionError && !actionError.success ? actionError.error : null;
  const fieldErrors = error?.fieldErrors ?? {};
  const codeErrors = fieldErrors.code ?? [];
  const hasFieldErrors = Object.keys(fieldErrors).length > 0;
  const showGeneralError = error !== null && !hasFieldErrors;
  const canResend = method === "email";

  const submit = async (value: string) => {
    if (value.length !== 6 || isSubmitting) {
      return;
    }

    setActionError(null);
    setResendMessage(null);
    setIsSubmitting(true);

    try {
      const result = await verifyMfaAction({ code: value });

      if (result.success) {
        router.push("/dashboard");
        router.refresh();
        return;
      }

      setActionError(result);
      setCode("");
    } catch (submitError) {
      console.error("[mfa-login-form] submit failed", submitError);
      setActionError({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Terjadi kesalahan. Silakan coba lagi.",
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resend = async () => {
    if (isResending) {
      return;
    }

    setResendMessage(null);
    setActionError(null);
    setIsResending(true);

    try {
      const result = await resendMfaCodeAction();

      if (result.success) {
        setResendMessage(config.resendSentLabel);
        return;
      }

      setActionError(result);
    } catch (resendError) {
      console.error("[mfa-login-form] resend failed", resendError);
      setActionError({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Kode tidak bisa dikirim ulang. Coba lagi nanti.",
        },
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <form
      className="space-y-6"
      noValidate
      autoComplete="off"
      aria-busy={isSubmitting}
      onSubmit={(event) => {
        event.preventDefault();
        void submit(code);
      }}
    >
      <header className="space-y-4 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
          <ShieldCheck className="size-6 text-primary" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">{config.title}</h1>
          <p className="text-sm text-muted-foreground">
            {config.descriptionTemplate.replace("{email}", maskedEmail)}
          </p>
        </div>
      </header>

      {showGeneralError ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error?.message}</AlertDescription>
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

      {isDemoMode ? (
        <Alert>
          <AlertDescription>{config.demoHint}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-4">
        <OtpInput
          value={code}
          onChange={setCode}
          onComplete={(value) => void submit(value)}
          disabled={isSubmitting}
          groupLabel={config.otpGroupLabel}
          autoFocus
          invalid={codeErrors.length > 0}
        />

        <Button
          type="submit"
          className="h-10 w-full"
          disabled={isSubmitting || code.length !== 6}
        >
          {isSubmitting ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : null}
          {isSubmitting ? config.submittingLabel : config.submitLabel}
        </Button>
      </div>

      {resendMessage ? (
        <Alert role="status">
          <AlertDescription>{resendMessage}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2 text-center text-sm text-muted-foreground">
        {canResend ? (
          <p>
            <Button
              type="button"
              variant="link"
              className="h-auto p-0"
              disabled={isResending}
              onClick={() => void resend()}
            >
              {config.resendLabel}
            </Button>
          </p>
        ) : null}
        <p>
          {config.backupCodePrompt}{" "}
          <Link
            href={config.backupCodeHref}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            {config.backupCodeLabel}
          </Link>
        </p>
        <p>
          <Link
            href="/login"
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            {config.backToLoginLabel}
          </Link>
        </p>
      </div>
    </form>
  );
}
