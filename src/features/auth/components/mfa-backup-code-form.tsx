"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  verifyBackupCodeFormSchema,
  type VerifyBackupCodeFormValues,
} from "@/features/auth/schema";
import type { MfaBackupCodePageConfig } from "@/config/mfa-pages";

interface MfaBackupCodeFormProps {
  config: MfaBackupCodePageConfig;
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

async function verifyBackupCodeAction(
  _values: unknown
): Promise<ActionState> {
  return { success: true, message: "Demo mode - backend not connected" };
}

function isCodeField(field: string): field is keyof VerifyBackupCodeFormValues {
  return field === "code";
}

export function MfaBackupCodeForm({ config, isDemoMode }: MfaBackupCodeFormProps) {
  const router = useRouter();
  const form = useForm<VerifyBackupCodeFormValues>({
    resolver: zodResolver(verifyBackupCodeFormSchema),
    defaultValues: { code: "" },
  });
  const [actionError, setActionError] = useState<ActionState | null>(null);
  const error = actionError && !actionError.success ? actionError.error : null;
  const hasFieldErrors = Object.keys(error?.fieldErrors ?? {}).length > 0;
  const showGeneralError = error !== null && !hasFieldErrors;
  const isSubmitting = form.formState.isSubmitting;
  const codeValue = useWatch({ control: form.control, name: "code" });

  const onSubmit = async (values: VerifyBackupCodeFormValues) => {
    setActionError(null);

    try {
      const result = await verifyBackupCodeAction(values);

      if (result.success) {
        router.push("/dashboard");
        router.refresh();
        return;
      }

      setActionError(result);

      for (const [field, messages] of Object.entries(
        result.error?.fieldErrors ?? {},
      )) {
        const message = messages?.[0];

        if (message && isCodeField(field)) {
          form.setError(field, { message });
        }
      }
    } catch (submitError) {
      console.error("[mfa-backup-code-form] submit failed", submitError);
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
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-5"
        noValidate
        aria-busy={isSubmitting}
      >
        {showGeneralError ? (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{error?.message}</AlertDescription>
          </Alert>
        ) : null}

        {isDemoMode ? (
          <Alert>
            <AlertDescription>{config.demoHint}</AlertDescription>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="code"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>{config.codeLabel}</FormLabel>
              <FormControl>
                <Input
                  autoComplete="one-time-code"
                  autoCapitalize="characters"
                  spellCheck={false}
                  placeholder={config.codePlaceholder}
                  className="h-10 text-center font-mono uppercase tracking-widest"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="h-10 w-full"
          disabled={isSubmitting || codeValue.trim().length === 0}
        >
          {isSubmitting ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : null}
          {isSubmitting ? config.submittingLabel : config.submitLabel}
        </Button>
      </form>
    </Form>
  );
}
