"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ACCOUNT_SETTINGS_CONFIG } from "@/config/account-settings";
import { changePasswordSchema, type ChangePasswordValues } from "@/features/account/schema";

const C = ACCOUNT_SETTINGS_CONFIG;

export function ChangePasswordForm() {
  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = async (_values: ChangePasswordValues) => {
    toast.success(C.password.savedLabel);
    form.reset();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate autoComplete="off">
        <h2 className="text-base font-semibold">{C.password.title}</h2>
        <Alert>
          <AlertDescription>{C.infoAlert}</AlertDescription>
        </Alert>
        <FormField
          control={form.control}
          name="currentPassword"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>{C.fields.currentPassword}</FormLabel>
              <FormControl>
                <Input type="password" className="h-10" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>{C.fields.newPassword}</FormLabel>
              <FormControl>
                <Input type="password" className="h-10" {...field} />
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
              <FormLabel>{C.fields.confirmPassword}</FormLabel>
              <FormControl>
                <Input type="password" className="h-10" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="h-10" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {C.password.saveLabel}
        </Button>
      </form>
    </Form>
  );
}
