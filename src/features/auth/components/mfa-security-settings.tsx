"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Mail, ShieldCheck } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { PasswordInput } from "@/features/auth/components/password-input";
import { disableMfaAction, type ActionState } from "@/features/auth/actions";
import { MfaBackupCodes } from "@/features/auth/components/mfa-backup-codes";
import { MfaMethodCard } from "@/features/auth/components/mfa-method-card";
import { MfaSetupEmail } from "@/features/auth/components/mfa-setup-email";
import { MfaSetupTotp } from "@/features/auth/components/mfa-setup-totp";
import {
  disableMfaFormSchema,
  type DisableMfaFormValues,
  type MfaMethod,
} from "@/features/auth/schema";
import type { SecuritySettingsConfig } from "@/config/mfa-pages";
import type { MfaStatus } from "@/features/auth/service";

type SetupStep = "choose" | "totp" | "email" | "backup" | "enabled";

const METHOD_ICONS = {
  totp: KeyRound,
  email: Mail,
} as const;

interface MfaSecuritySettingsProps {
  config: SecuritySettingsConfig;
  initialStatus: MfaStatus;
  isDemoMode: boolean;
}

export function MfaSecuritySettings({
  config,
  initialStatus,
  isDemoMode,
}: MfaSecuritySettingsProps) {
  const [step, setStep] = useState<SetupStep>("choose");
  const [status, setStatus] = useState(initialStatus);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [actionError, setActionError] = useState<ActionState | null>(null);
  const [isDisabled, setIsDisabled] = useState(false);

  const form = useForm<DisableMfaFormValues>({
    resolver: zodResolver(disableMfaFormSchema),
    defaultValues: { password: "" },
  });

  const error = actionError && !actionError.success ? actionError.error : null;
  const hasFieldErrors = Object.keys(error?.fieldErrors ?? {}).length > 0;
  const showGeneralError = error !== null && !hasFieldErrors;
  const isSubmitting = form.formState.isSubmitting;

  const handleEnabled = (method: MfaMethod, codes: string[]) => {
    setBackupCodes(codes);
    setStatus({
      enabled: true,
      method,
      enabledAt: Date.now(),
      remainingBackupCodes: codes.length,
    });
    setStep("backup");
  };

  const onDisable = async (values: DisableMfaFormValues) => {
    setActionError(null);

    try {
      const result = await disableMfaAction(values);

      if (result.success) {
        form.reset();
        setIsDisabled(true);
        setStatus({
          enabled: false,
          method: null,
          enabledAt: null,
          remainingBackupCodes: 0,
        });
        setStep("choose");
        return;
      }

      setActionError(result);

      for (const [field, messages] of Object.entries(
        result.error.fieldErrors ?? {},
      )) {
        const message = messages?.[0];

        if (message && field === "password") {
          form.setError("password", { message });
        }
      }
    } catch (submitError) {
      console.error("[mfa-security-settings] disable failed", submitError);
      setActionError({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Terjadi kesalahan. Silakan coba lagi.",
        },
      });
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
            {config.statusCardTitle}
          </CardTitle>
          <CardDescription>
            {status.enabled && status.enabledAt
              ? config.activeStatusTemplate
                  .replace("{date}", new Date(status.enabledAt).toISOString().slice(0, 10))
                  .replace(
                    "{method}",
                    status.method === "email" ? "Email OTP" : "Authenticator app",
                  )
              : config.inactiveStatus}
          </CardDescription>
          {status.enabled ? (
            <p className="text-sm text-muted-foreground">
              {config.activeBackupCodesTemplate.replace(
                "{count}",
                String(status.remainingBackupCodes),
              )}
            </p>
          ) : null}
        </CardHeader>
        {status.enabled ? (
          <CardContent>
            <Alert role="status">
              <AlertDescription>{config.enabledDescription}</AlertDescription>
            </Alert>
          </CardContent>
        ) : null}
      </Card>

      {isDisabled ? (
        <Alert role="status">
          <AlertDescription>{config.disableSuccessMessage}</AlertDescription>
        </Alert>
      ) : null}

      {step === "choose" && !status.enabled ? (
        <Card>
          <CardHeader>
            <CardTitle>{config.setupTitle}</CardTitle>
            <CardDescription>{config.setupDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {config.methods.map((method) => {
              const Icon = METHOD_ICONS[method.method];

              return (
                <MfaMethodCard
                  key={method.method}
                  config={method}
                  icon={Icon}
                  selected={false}
                  onSelect={(selected) => setStep(selected)}
                />
              );
            })}
            {isDemoMode ? (
              <Alert>
                <AlertDescription>{config.totp.demoHint}</AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {step === "totp" ? (
        <Card>
          <CardContent>
            <MfaSetupTotp
              config={config.totp}
              isDemoMode={isDemoMode}
              onComplete={(codes) => handleEnabled("totp", codes)}
              onBack={() => setStep("choose")}
            />
          </CardContent>
        </Card>
      ) : null}

      {step === "email" ? (
        <Card>
          <CardContent>
            <MfaSetupEmail
              config={config.email}
              isDemoMode={isDemoMode}
              onComplete={(codes) => handleEnabled("email", codes)}
              onBack={() => setStep("choose")}
            />
          </CardContent>
        </Card>
      ) : null}

      {step === "backup" && backupCodes.length > 0 ? (
        <Card>
          <CardContent>
            <MfaBackupCodes
              config={config.backupCodes}
              codes={backupCodes}
              onDone={() => setStep("enabled")}
            />
          </CardContent>
        </Card>
      ) : null}

      {step === "enabled" ? (
        <Card>
          <CardContent className="space-y-4 py-6 text-center">
            <ShieldCheck className="mx-auto size-6 text-primary" aria-hidden="true" />
            <div className="space-y-2">
              <h2 className="text-xl font-bold tracking-tight">
                {config.enabledTitle}
              </h2>
              <p className="text-sm text-muted-foreground">
                {config.enabledDescription}
              </p>
            </div>
            <Button variant="outline" className="h-10" onClick={() => setStep("choose")}>
              {config.setupTitle}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {status.enabled && step !== "backup" && step !== "enabled" ? (
        <Card>
          <CardHeader>
            <CardTitle>{config.disableTitle}</CardTitle>
            <CardDescription>{config.disableDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onDisable)}
                className="space-y-5"
                noValidate
                aria-busy={isSubmitting}
              >
                {showGeneralError ? (
                  <Alert variant="destructive" role="alert">
                    <AlertDescription>{error?.message}</AlertDescription>
                  </Alert>
                ) : null}

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>{config.passwordLabel}</FormLabel>
                      <FormControl>
                        <PasswordInput
                          autoComplete="current-password"
                          className="h-10"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  variant="destructive"
                  className="h-10 w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? config.disablingLabel
                    : config.disableLabel}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
