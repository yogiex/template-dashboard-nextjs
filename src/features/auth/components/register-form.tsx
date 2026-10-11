"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { PasswordInput } from "@/features/auth/components/password-input";
import { PasswordStrengthMeter } from "@/features/auth/components/password-strength-meter";
import {
  registerFormSchema,
  type RegisterFormValues,
  type RegisterPageFormConfig,
} from "@/features/auth/schema";

interface RegisterFormProps {
  config: RegisterPageFormConfig;
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

async function registerAction(
  _values: unknown
): Promise<ActionState> {
  return { success: true, message: "Demo mode - backend not connected" };
}

export function RegisterForm({ config }: RegisterFormProps) {
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
    },
  });
  const [actionError, setActionError] = useState<ActionState | null>(null);
  const router = useRouter();
  const isSubmitting = form.formState.isSubmitting;
  const passwordValue = useWatch({ control: form.control, name: "password" });
  const { submitLabel, signInLabel } = config;
  const error = actionError && !actionError.success ? actionError.error : null;
  const hasFieldErrors = Object.keys(error?.fieldErrors ?? {}).length > 0;
  const showGeneralError = error !== null && !hasFieldErrors;

  const onSubmit = async (values: RegisterFormValues) => {
    setActionError(null);

    try {
      const result = await registerAction(values);

      if (result.success) {
        router.push("/check-email");
        return;
      }

      setActionError(result);
      for (const [field, messages] of Object.entries(
        result.error?.fieldErrors ?? {}
      )) {
        const message = messages?.[0];
        if (message) {
          form.setError(field as keyof RegisterFormValues, { message });
        }
      }
    } catch {
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
          name="name"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>{config.nameLabel}</FormLabel>
              <FormControl>
                <Input
                  autoFocus
                  placeholder={config.namePlaceholder}
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
          name="email"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>{config.emailLabel}</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder={config.emailPlaceholder}
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
              <FormLabel>{config.passwordLabel}</FormLabel>
              <FormControl>
                <div>
                  <PasswordInput
                    placeholder={config.passwordPlaceholder}
                    className="h-10"
                    strengthMeterId="password-strength"
                    {...field}
                  />
                  <PasswordStrengthMeter
                    id="password-strength"
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
              <FormLabel>{config.confirmPasswordLabel}</FormLabel>
              <FormControl>
                <PasswordInput
                  placeholder={config.passwordPlaceholder}
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
          name="acceptTerms"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <div className="flex items-start gap-2 pt-1">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                    aria-describedby="accept-terms-description"
                  />
                </FormControl>
                <div
                  id="accept-terms-description"
                  className="space-y-1 text-sm leading-snug"
                >
                  <FormLabel className="!mt-0 cursor-pointer font-normal">
                    {config.termsLabel}
                  </FormLabel>
                  <div className="flex flex-wrap gap-2 text-muted-foreground">
                    <Link
                      href={config.termsHref}
                      className="underline underline-offset-4 hover:text-foreground"
                    >
                      {config.termsLinkLabel}
                    </Link>
                    <span aria-hidden="true">·</span>
                    <Link
                      href={config.privacyHref}
                      className="underline underline-offset-4 hover:text-foreground"
                    >
                      {config.privacyLinkLabel}
                    </Link>
                  </div>
                </div>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="h-10 w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {isSubmitting ? "Memproses..." : submitLabel}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="underline-offset-4 hover:underline">
            {signInLabel}
          </Link>
        </p>
      </form>
    </Form>
  );
}
