"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { cn } from "cn";
import { SETUP_WIZARD_CONFIG } from "@/config/setup-wizard";
import { useSetupWizard } from "@/features/setup-wizard/hooks/use-setup-wizard";
import { saveWizardState } from "@/features/setup-wizard/service";
import {
  setupWizardSchema,
  type SetupWizardConfig,
  type SetupWizardValues,
} from "@/features/setup-wizard/schema";

interface SetupWizardShellProps {
  config: SetupWizardConfig;
}

async function completeWizardAction(
  _values: SetupWizardValues,
): Promise<{ success: true }> {
  return { success: true };
}

export function SetupWizardShell({ config }: SetupWizardShellProps) {
  const router = useRouter();
  const totalSteps = config.steps.length;
  const wizard = useSetupWizard(totalSteps);
  const [showSuccess, setShowSuccess] = useState(false);
  const [invitedMembers, setInvitedMembers] = useState<
    Array<{ email: string; role: string }>
  >([]);

  const form = useForm<SetupWizardValues>({
    resolver: zodResolver(setupWizardSchema),
    defaultValues: {
      name: "",
      email: "",
      bio: "",
      emailNotifications: false,
      pushNotifications: false,
      weeklyDigest: false,
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  const handleNext = () => {
    const values = form.getValues();
    saveWizardState(values);
    wizard.goNext();
  };

  const handleBack = () => {
    wizard.goBack();
  };

  const handleFinish = async () => {
    setShowSuccess(false);
    const values = form.getValues();

    try {
      await completeWizardAction(values);
      saveWizardState(values);
      setShowSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    } catch (error) {
      console.error("[setup-wizard] finish failed", error);
    }
  };

  const handleSkip = () => {
    router.push("/dashboard");
  };

  const handleInvite = (email: string, role: string) => {
    setInvitedMembers((prev) => [...prev, { email, role }]);
  };

  const step = config.steps[wizard.currentStep];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {showSuccess ? (
        <Alert>
          <AlertDescription>{config.successLabel}</AlertDescription>
        </Alert>
      ) : null}

      <Alert>
        <AlertDescription>{config.infoAlert}</AlertDescription>
      </Alert>

      {/* Stepper */}
      <div className="flex items-center gap-2" aria-hidden="true">
        {config.steps.map((s, index) => (
          <button
            key={s.id}
            type="button"
            onClick={() => wizard.goToStep(index)}
            className={cn(
              "h-2 flex-1 rounded-full transition-colors",
              index <= wizard.currentStep ? "bg-primary" : "bg-muted",
            )}
            aria-label={`Langkah ${index + 1}: ${s.title}`}
          />
        ))}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Langkah {wizard.currentStep + 1} dari {totalSteps}
          </p>
          <h2 className="text-lg font-semibold">{step.title}</h2>
          <p className="text-sm text-muted-foreground">{step.description}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSkip}
          className="shrink-0"
        >
          {config.skipLabel}
        </Button>
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>
            {step.id === "profile"
              ? config.profileStepTitle
              : step.id === "team"
                ? config.teamStepTitle
                : step.id === "preferences"
                  ? config.preferencesStepTitle
                  : config.reviewStepTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="space-y-5" noValidate autoComplete="off">
              {step.id === "profile" ? (
                <>
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="space-y-2">
                        <FormLabel>{config.nameLabel}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={config.namePlaceholder}
                            className="h-10"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              ) : null}

              {step.id === "team" ? (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto]">
                    <FormItem className="space-y-2">
                      <FormLabel>{config.inviteEmailLabel}</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder={config.inviteEmailPlaceholder}
                          className="h-10"
                          id="invite-email"
                          name="inviteEmail"
                        />
                      </FormControl>
                    </FormItem>
                    <FormItem className="space-y-2">
                      <FormLabel>{config.inviteRoleLabel}</FormLabel>
                      <FormControl>
                        <select className="h-10 rounded-lg border border-input bg-transparent px-2.5 text-sm">
                          <option value="editor">Editor</option>
                          <option value="viewer">Viewer</option>
                          <option value="admin">Admin</option>
                        </select>
                      </FormControl>
                    </FormItem>
                    <Button
                      type="button"
                      className="h-10 self-end"
                      onClick={() => {
                        const emailInput = document.getElementById(
                          "invite-email",
                        ) as HTMLInputElement | null;
                        if (emailInput?.value) {
                          handleInvite(emailInput.value, "editor");
                          emailInput.value = "";
                        }
                      }}
                    >
                      {config.inviteButtonLabel}
                    </Button>
                  </div>

                  {invitedMembers.length > 0 ? (
                    <ul className="space-y-2">
                      {invitedMembers.map((member, index) => (
                        <li
                          key={`${member.email}-${index}`}
                          className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                        >
                          <span className="truncate">{member.email}</span>
                          <span className="text-xs text-muted-foreground capitalize">
                            {member.role}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}

              {step.id === "preferences" ? (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="emailNotifications"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center gap-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value ?? false}
                            onCheckedChange={(checked) =>
                              field.onChange(checked === true)
                            }
                          />
                        </FormControl>
                        <FormLabel className="!mt-0 text-sm font-normal">
                          {config.emailNotificationsLabel}
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pushNotifications"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center gap-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value ?? false}
                            onCheckedChange={(checked) =>
                              field.onChange(checked === true)
                            }
                          />
                        </FormControl>
                        <FormLabel className="!mt-0 text-sm font-normal">
                          {config.pushNotificationsLabel}
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="weeklyDigest"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center gap-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value ?? false}
                            onCheckedChange={(checked) =>
                              field.onChange(checked === true)
                            }
                          />
                        </FormControl>
                        <FormLabel className="!mt-0 text-sm font-normal">
                          {config.weeklyDigestLabel}
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                </div>
              ) : null}

              {step.id === "review" ? (
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">
                      {config.nameLabel}
                    </dt>
                    <dd className="mt-0.5 text-sm">
                      {form.getValues("name") || "-"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">
                      Notifikasi
                    </dt>
                    <dd className="mt-0.5 text-sm">
                      {[
                        form.getValues("emailNotifications")
                          ? "Email"
                          : null,
                        form.getValues("pushNotifications") ? "Push" : null,
                        form.getValues("weeklyDigest") ? "Mingguan" : null,
                      ]
                        .filter(Boolean)
                        .join(", ") || "Tidak ada"}
                    </dd>
                  </div>
                  {invitedMembers.length > 0 ? (
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">
                        Undangan
                      </dt>
                      <dd className="mt-0.5 text-sm">
                        {invitedMembers.length} anggota
                      </dd>
                    </div>
                  ) : null}
                </dl>
              ) : null}
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={wizard.isFirstStep || isSubmitting}
          className="h-10"
        >
          {config.backLabel}
        </Button>
        {wizard.isLastStep ? (
          <Button
            onClick={handleFinish}
            disabled={isSubmitting}
            className="h-10"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            {config.finishLabel}
          </Button>
        ) : (
          <Button onClick={handleNext} className="h-10">
            {config.nextLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
