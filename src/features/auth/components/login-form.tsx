"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { PasswordInput } from "@/features/auth/components/password-input";
import {
  loginFormSchema,
  type LoginFormValues,
  type LoginPageFormConfig,
} from "@/features/auth/schema";

interface LoginFormProps {
  config: LoginPageFormConfig;
}

type LoginActionState = {
  success: boolean;
  message?: string;
  mfaRequired?: boolean;
  nextPath?: string;
  error?: {
    code: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
  };
};

/**
 * Stub login klien: tidak memverifikasi kredensial dan tidak menulis sesi apa
 * pun. Deployment saat ini static export (GitHub Pages), tempat Server Action
 * tidak didukung, jadi tidak ada login sungguhan sampai host Node dipasang.
 * Pass ini hanya state UI — jangan pernah dijadikan "auth berhasil".
 */
async function loginAction(
  _values: unknown
): Promise<LoginActionState> {
  return { success: true, message: "Demo mode - backend not connected" };
}

function isLoginField(field: string): field is keyof LoginFormValues {
  return field === "email" || field === "password" || field === "rememberMe";
}

export function LoginForm({ config }: LoginFormProps) {
  const router = useRouter();
  const form = useForm<
    z.input<typeof loginFormSchema>,
    unknown,
    LoginFormValues
  >({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });
  const [actionError, setActionError] = useState<LoginActionState | null>(null);
  const formConfig = config;
  const isSubmitting = form.formState.isSubmitting;
  const error =
    actionError && !actionError.success && !actionError.mfaRequired
      ? actionError.error
      : null;
  const hasFieldErrors = Object.keys(error?.fieldErrors ?? {}).length > 0;
  const showGeneralError = error !== null && !hasFieldErrors;

  const onSubmit = async (values: LoginFormValues) => {
    setActionError(null);

    try {
      const result = await loginAction(values);

      if (result.success) {
        router.push("/dashboard");
        return;
      }

      if (result.mfaRequired) {
        router.push(result.nextPath ?? "/login");
        return;
      }

      setActionError(result);
      for (const [field, messages] of Object.entries(
        result.error?.fieldErrors ?? {}
      )) {
        const message = messages[0];
        if (message && isLoginField(field)) {
          form.setError(field, { message });
        }
      }
    } catch (submitError) {
      console.error("[login-form] submit failed", submitError);
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
        autoComplete="off"
        aria-busy={isSubmitting}
      >
        {showGeneralError ? (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{error?.message}</AlertDescription>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>{formConfig.emailLabel}</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoFocus
                  placeholder={formConfig.emailPlaceholder}
                  className="h-10"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem className="space-y-2">
              {formConfig.showForgotPassword ? (
                <div className="flex items-center justify-between">
                  <FormLabel>{formConfig.passwordLabel}</FormLabel>
                  <Link
                    href={formConfig.forgotPasswordHref}
                    className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                  >
                    {formConfig.forgotPasswordLabel}
                  </Link>
                </div>
              ) : (
                <FormLabel>{formConfig.passwordLabel}</FormLabel>
              )}
              <FormControl>
                <PasswordInput
                  placeholder={formConfig.passwordPlaceholder}
                  className="h-10"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {formConfig.showRememberMe ? (
          <FormField
            control={form.control}
            name="rememberMe"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center gap-2">
                <FormControl>
                  <Checkbox
                    checked={field.value ?? false}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                  />
                </FormControl>
                <FormLabel className="!mt-0 text-sm font-normal">
                  {formConfig.rememberMeLabel}
                </FormLabel>
              </FormItem>
            )}
          />
        ) : null}

        <Button
          type="submit"
          className="h-10 w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {isSubmitting ? "Memproses..." : formConfig.submitLabel}
        </Button>

        <Separator />

        <div className="text-center text-sm text-muted-foreground">
          <p>{formConfig.footerText}</p>
          {formConfig.signUpLabel && formConfig.signUpHref ? (
            <Link
              href={formConfig.signUpHref}
              className="mt-1 inline-block font-medium text-foreground underline-offset-4 hover:underline"
            >
              {formConfig.signUpLabel}
            </Link>
          ) : null}
        </div>
      </form>
    </Form>
  );
}
