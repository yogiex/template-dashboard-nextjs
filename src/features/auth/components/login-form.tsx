"use client";

import Link from "next/link";
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
import { loginAction, type ActionState } from "@/features/auth/actions";
import { PasswordInput } from "@/features/auth/components/password-input";
import {
  loginFormSchema,
  type LoginFormValues,
  type LoginPageConfig,
} from "@/features/auth/schema";

interface LoginFormProps {
  config: LoginPageConfig;
}

export function LoginForm({ config }: LoginFormProps) {
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
  const [actionError, setActionError] = useState<ActionState | null>(null);
  const { form: formConfig } = config;
  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = async (values: LoginFormValues) => {
    setActionError(null);
    const result = await loginAction(values);

    if (!result.success) {
      setActionError(result);
      for (const [field, messages] of Object.entries(
        result.error.fieldErrors ?? {}
      )) {
        if (messages[0]) {
          form.setError(field as keyof LoginFormValues, { message: messages[0] });
        }
      }
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
        noValidate
        aria-busy={isSubmitting}
      >
        {actionError && !actionError.success && !actionError.error.fieldErrors ? (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{actionError.error.message}</AlertDescription>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{formConfig.emailLabel}</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder={formConfig.emailPlaceholder}
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
            <FormItem>
              {formConfig.showForgotPassword ? (
                <div className="flex items-center justify-between">
                  <FormLabel>{formConfig.passwordLabel}</FormLabel>
                  <Link
                    href="/forgot-password"
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
                  autoComplete="current-password"
                  placeholder={formConfig.passwordPlaceholder}
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
