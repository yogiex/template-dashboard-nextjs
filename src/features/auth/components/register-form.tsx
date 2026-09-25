"use client";

import Link from "next/link";
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
import { registerAction, type ActionState } from "@/features/auth/actions";
import { PasswordInput } from "@/features/auth/components/password-input";
import { PasswordStrengthMeter } from "@/features/auth/components/password-strength-meter";
import {
  registerFormSchema,
  type RegisterFormValues,
} from "@/features/auth/schema";

interface RegisterFormProps {
  submitLabel: string;
  signInLabel: string;
}


export function RegisterForm({ submitLabel, signInLabel }: RegisterFormProps) {
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false as true,
    },
  });
  const [actionError, setActionError] = useState<ActionState | null>(null);
  const isSubmitting = form.formState.isSubmitting;
  const passwordValue = useWatch({ control: form.control, name: "password" });

  const onSubmit = async (values: RegisterFormValues) => {
    setActionError(null);
    const result = await registerAction(values);

    if (!result.success) {
      setActionError(result);
      for (const [field, messages] of Object.entries(
        result.error.fieldErrors ?? {}
      )) {
        if (messages[0]) {
          form.setError(field as keyof RegisterFormValues, {
            message: messages[0],
          });
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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nama lengkap</FormLabel>
              <FormControl>
                <Input
                  autoComplete="name"
                  autoFocus
                  placeholder="Nama Anda"
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
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="nama@perusahaan.com"
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
              <FormLabel>Password</FormLabel>
              <FormControl>
                <div>
                  <PasswordInput
                    autoComplete="new-password"
                    placeholder="••••••••"
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
            <FormItem>
              <FormLabel>Konfirmasi password</FormLabel>
              <FormControl>
                <PasswordInput
                  autoComplete="new-password"
                  placeholder="••••••••"
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
            <FormItem>
              <div className="flex items-start gap-2">
                <FormControl>
                  <Checkbox
                    checked={Boolean(field.value)}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                  />
                </FormControl>
                <div className="space-y-1 text-sm leading-snug">
                  <FormLabel className="!mt-0 font-normal">
                    Saya menyetujui syarat dan ketentuan serta kebijakan privasi
                  </FormLabel>
                  <div className="flex flex-wrap gap-2 text-muted-foreground">
                    <Link href="/terms" className="underline underline-offset-4">
                      Syarat &amp; Ketentuan
                    </Link>
                    <span aria-hidden="true">·</span>
                    <Link href="/privacy" className="underline underline-offset-4">
                      Kebijakan Privasi
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
