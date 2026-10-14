"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { clientLogger } from "@/lib/logger-client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ACCOUNT_SETTINGS_CONFIG } from "@/config/account-settings";
import { profileFormSchema, type ProfileFormValues } from "@/features/account/schema";
import { loadProfile, saveProfile } from "@/features/account/service";

const C = ACCOUNT_SETTINGS_CONFIG;

export function AccountProfileForm() {
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: loadProfile(),
  });

  useEffect(() => {
    form.reset(loadProfile());
  }, [form]);

  const onSubmit = async (values: ProfileFormValues) => {
    const ok = saveProfile(values);
    if (ok) {
      toast.success(C.profile.savedLabel);
    } else {
      clientLogger.error("account.profile.save_failed", values);
      toast.error("Gagal menyimpan profil.");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate autoComplete="off">
        <h2 className="text-base font-semibold">{C.profile.title}</h2>
        <FormField
          control={form.control}
          name="fullName"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>{C.fields.fullName}</FormLabel>
              <FormControl>
                <Input className="h-10" {...field} />
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
              <FormLabel>{C.fields.email}</FormLabel>
              <FormControl>
                <Input type="email" className="h-10" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="h-10" disabled={form.formState.isSubmitting}>
          {C.profile.saveLabel}
        </Button>
      </form>
    </Form>
  );
}
