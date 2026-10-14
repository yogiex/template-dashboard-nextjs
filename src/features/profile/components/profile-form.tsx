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
import { PROFILE_PAGE_CONFIG } from "@/config/profile-page";
import {
  profileFormSchema,
  type ProfileFormValues,
} from "@/features/profile/schema";

interface ProfileFormProps {
  defaultValues: {
    name: string;
    email: string;
    bio?: string;
  };
}

/**
 * Stub update profile klien: tidak mengirim data ke server. Deployment saat
 * ini static export (GitHub Pages), tempat Server Action tidak didukung.
 * Simpan nilai ke localStorage agar perubahan terlihat setelah refresh.
 */
async function updateProfileAction(
  values: ProfileFormValues,
): Promise<{ success: true }> {
  if (typeof window !== "undefined") {
    localStorage.setItem("profile.draft", JSON.stringify(values));
  }
  return { success: true };
}

export function ProfileForm({ defaultValues }: ProfileFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: defaultValues.name,
      email: defaultValues.email,
      bio: defaultValues.bio ?? "",
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = async (values: ProfileFormValues) => {
    setShowSuccess(false);

    try {
      await updateProfileAction(values);
      setIsEditing(false);
      setShowSuccess(true);
    } catch (submitError) {
      console.error("[profile-form] submit failed", submitError);
    }
  };

  const onCancel = () => {
    form.reset({
      name: defaultValues.name,
      email: defaultValues.email,
      bio: defaultValues.bio ?? "",
    });
    setIsEditing(false);
    setShowSuccess(false);
  };

  if (!isEditing) {
    return (
      <div className="space-y-4">
        {showSuccess ? (
          <Alert>
            <AlertDescription>{PROFILE_PAGE_CONFIG.successLabel}</AlertDescription>
          </Alert>
        ) : null}
        <Button onClick={() => setIsEditing(true)} className="h-10">
          {PROFILE_PAGE_CONFIG.editLabel}
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
        autoComplete="off"
        aria-busy={isSubmitting}
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>{PROFILE_PAGE_CONFIG.nameLabel}</FormLabel>
              <FormControl>
                <Input
                  placeholder={PROFILE_PAGE_CONFIG.namePlaceholder}
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
              <FormLabel>{PROFILE_PAGE_CONFIG.emailLabel}</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder={PROFILE_PAGE_CONFIG.emailPlaceholder}
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
          name="bio"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>{PROFILE_PAGE_CONFIG.bioLabel}</FormLabel>
              <FormControl>
                <textarea
                  placeholder={PROFILE_PAGE_CONFIG.bioPlaceholder}
                  className="min-h-20 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center gap-2">
          <Button type="submit" className="h-10" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            {isSubmitting
              ? PROFILE_PAGE_CONFIG.savingLabel
              : PROFILE_PAGE_CONFIG.saveLabel}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {PROFILE_PAGE_CONFIG.cancelLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
