"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
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
import { Input } from "@/components/ui/input";
import {
  forgotPasswordFormSchema,
  type ForgotPasswordFormValues,
} from "@/features/auth/schema";

interface ForgotPasswordFormProps {
  submitLabel: string;
  backToLoginLabel: string;
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

async function forgotPasswordAction(
  _values: unknown
): Promise<ActionState> {
  return { success: true, message: "Demo mode - backend not connected" };
}

export function ForgotPasswordForm({
  submitLabel,
  backToLoginLabel,
}: ForgotPasswordFormProps) {
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordFormSchema),
    defaultValues: { email: "" },
  });
  const [isSent, setIsSent] = useState(false);
  const [actionError, setActionError] = useState<ActionState | null>(null);

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setActionError(null);

    try {
      const result = await forgotPasswordAction(values);

      if (!result.success) {
        setActionError(result);
        return;
      }

      setIsSent(true);
    } catch (submitError) {
      console.error("[forgot-password-form] submit failed", submitError);
      setActionError({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Terjadi kesalahan. Silakan coba lagi.",
        },
      });
    }
  };

  if (isSent) {
    return (
      <div className="space-y-4" role="status">
        <Alert>
          <AlertDescription>
            Jika email tersebut terdaftar, tautan untuk mengatur ulang password
            telah dikirim. Periksa kotak masuk dan folder spam.
          </AlertDescription>
        </Alert>
        <Button
          variant="outline"
          className="w-full"
          render={<Link href="/login" />}
        >
          {backToLoginLabel}
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-5"
        noValidate
        aria-busy={form.formState.isSubmitting}
      >
        {actionError && !actionError.success ? (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{actionError.error?.message}</AlertDescription>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="nama@perusahaan.com"
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
          className="h-10 w-full"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? "Memproses..." : submitLabel}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="underline-offset-4 hover:underline">
            {backToLoginLabel}
          </Link>
        </p>
      </form>
    </Form>
  );
}
