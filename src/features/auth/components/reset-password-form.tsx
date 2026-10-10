"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

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
import { PasswordInput } from "@/features/auth/components/password-input";
import { PasswordStrengthMeter } from "@/features/auth/components/password-strength-meter";
import {
  resetPasswordFormSchema,
  type ResetPasswordFormValues,
} from "@/features/auth/schema";

interface ResetPasswordFormProps {
  token: string;
  submitLabel: string;
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

async function resetPasswordAction(
  _values: unknown
): Promise<ActionState> {
  return { success: true, message: "Demo mode - backend not connected" };
}

export function ResetPasswordForm({
  token,
  submitLabel,
}: ResetPasswordFormProps) {
  const router = useRouter();
  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: { token, password: "", confirmPassword: "" },
  });
  const [actionError, setActionError] = useState<ActionState | null>(null);
  const passwordValue = useWatch({ control: form.control, name: "password" });
  const error = actionError && !actionError.success ? actionError.error : null;
  const hasFieldErrors = Object.keys(error?.fieldErrors ?? {}).length > 0;
  const showGeneralError = error !== null && !hasFieldErrors;

  const onSubmit = async (values: ResetPasswordFormValues) => {
    setActionError(null);

    try {
      const result = await resetPasswordAction(values);

      if (!result.success) {
        setActionError(result);

        for (const [field, messages] of Object.entries(
          result.error?.fieldErrors ?? {}
        )) {
          const message = messages?.[0];
          if (message) {
            form.setError(field as keyof ResetPasswordFormValues, { message });
          }
        }
        return;
      }

      router.push("/login?reset=success");
    } catch (submitError) {
      console.error("[reset-password-form] submit failed", submitError);
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
        aria-busy={form.formState.isSubmitting}
      >
        <input type="hidden" {...form.register("token")} />

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
              <FormLabel>Password baru</FormLabel>
              <FormControl>
                <div className="space-y-2">
                  <PasswordInput
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className="h-10"
                    strengthMeterId="reset-password-strength"
                    {...field}
                  />
                  <PasswordStrengthMeter
                    id="reset-password-strength"
                    password={passwordValue}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>Konfirmasi password baru</FormLabel>
              <FormControl>
                <div className="space-y-2">
                  <PasswordInput
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className="h-10"
                    strengthMeterId="reset-password-strength"
                    {...field}
                  />
                  <PasswordStrengthMeter
                    id="reset-password-strength"
                    password={passwordValue}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="h-10 w-full"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Memproses..." : submitLabel}
        </Button>
      </form>
    </Form>
  );
}
