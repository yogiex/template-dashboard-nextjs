"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
type ContactActionState = {
  success: boolean;
  message?: string;
  error?: {
    code?: string;
    message: string;
    fieldErrors?: Record<string, string[]>;
  };
};
import {
  contactFormSchema,
  type ContactFormValues,
} from "@/features/contact/schema";

const FIELDS = ["name", "email", "subject", "message"] as const;

type ContactField = (typeof FIELDS)[number];

function isContactField(field: string): field is ContactField {
  return (FIELDS as readonly string[]).includes(field);
}

export function ContactForm() {
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: { name: "", email: "", subject: "", message: "" },
  });
  const [actionError, setActionError] = useState<ContactActionState | null>(
    null
  );
  const [sent, setSent] = useState(false);
  const isSubmitting = form.formState.isSubmitting;
  const error = actionError && !actionError.success ? actionError.error : null;
  const hasFieldErrors = Object.keys(error?.fieldErrors ?? {}).length > 0;
  const showGeneralError = error !== null && !hasFieldErrors;

  const onSubmit = async (_values: ContactFormValues) => {
    setActionError(null);
    setSent(false);

    try {
      const result: ContactActionState = {
        success: true,
        message: "Demo mode - backend not connected",
      };

      if (result.success) {
        setSent(true);
        form.reset();
        return;
      }

      setActionError(result);
      for (const [field, messages] of Object.entries(
        result.error?.fieldErrors ?? {}
      )) {
        const message = messages?.[0];
        if (message && isContactField(field)) {
          form.setError(field, { message });
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

        {sent ? (
          <Alert role="status">
            <AlertDescription>
              Terima kasih! Pesan Anda sudah kami terima. Kami membalas dalam
              1×24 jam kerja.
            </AlertDescription>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>Nama</FormLabel>
              <FormControl>
                <Input
                  placeholder="Nama Anda"
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
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="nama@email.com"
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
          name="subject"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>Subjek</FormLabel>
              <FormControl>
                <Input
                  placeholder="Apa yang ingin Anda tanyakan?"
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
          name="message"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>Pesan</FormLabel>
              <FormControl>
                <Textarea rows={6} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="h-10 w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : null}
          {isSubmitting ? "Mengirim..." : "Kirim pesan"}
        </Button>
      </form>
    </Form>
  );
}
