"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FEEDBACK_PAGE_CONFIG } from "@/config/feedback-page";
import { StarRating } from "@/features/feedback/components/star-rating";
import {
  feedbackFormSchema,
  type FeedbackFormValues,
} from "@/features/feedback/schema";

async function submitFeedbackAction(
  values: FeedbackFormValues,
): Promise<{ success: true }> {
  if (typeof window !== "undefined") {
    const raw = window.localStorage.getItem("feedback.draft");
    const existing = raw ? (JSON.parse(raw) as FeedbackFormValues[]) : [];
    existing.push(values);
    window.localStorage.setItem("feedback.draft", JSON.stringify(existing));
  }
  return { success: true };
}

export function FeedbackForm() {
  const [showSuccess, setShowSuccess] = useState(false);

  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackFormSchema),
    defaultValues: {
      subject: "",
      category: "general",
      rating: 0,
      message: "",
      email: "",
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = async (values: FeedbackFormValues) => {
    setShowSuccess(false);

    try {
      await submitFeedbackAction(values);
      setShowSuccess(true);
      toast.success(FEEDBACK_PAGE_CONFIG.successLabel);
      form.reset({
        subject: "",
        category: "general",
        rating: 0,
        message: "",
        email: "",
      });
    } catch (submitError) {
      console.error("[feedback-form] submit failed", submitError);
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
        {showSuccess ? (
          <Alert role="status">
            <AlertDescription>{FEEDBACK_PAGE_CONFIG.successLabel}</AlertDescription>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>{FEEDBACK_PAGE_CONFIG.subjectLabel}</FormLabel>
              <FormControl>
                <Input
                  placeholder={FEEDBACK_PAGE_CONFIG.subjectPlaceholder}
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
          name="category"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>{FEEDBACK_PAGE_CONFIG.categoryLabel}</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {FEEDBACK_PAGE_CONFIG.categoryOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="rating"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>{FEEDBACK_PAGE_CONFIG.ratingLabel}</FormLabel>
              <FormControl>
                <StarRating
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">
                {FEEDBACK_PAGE_CONFIG.ratingHint}
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>{FEEDBACK_PAGE_CONFIG.messageLabel}</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={FEEDBACK_PAGE_CONFIG.messagePlaceholder}
                  rows={5}
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
              <FormLabel>{FEEDBACK_PAGE_CONFIG.emailLabel}</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder={FEEDBACK_PAGE_CONFIG.emailPlaceholder}
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
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : null}
          {isSubmitting
            ? FEEDBACK_PAGE_CONFIG.submittingLabel
            : FEEDBACK_PAGE_CONFIG.submitLabel}
        </Button>
      </form>
    </Form>
  );
}
