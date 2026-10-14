import { z } from "zod";

export const wizardStepSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
});

export const setupWizardSchema = z.object({
  name: z
    .string()
    .min(2, "Nama minimal 2 karakter")
    .max(100, "Nama maksimal 100 karakter"),
  email: z
    .string()
    .min(1, "Email wajib diisi")
    .email("Format email tidak valid")
    .max(254, "Email terlalu panjang"),
  bio: z.string().max(200, "Bio maksimal 200 karakter").optional(),
  inviteEmail: z
    .string()
    .min(1, "Email wajib diisi")
    .email("Format email tidak valid")
    .max(254, "Email terlalu panjang")
    .optional(),
  inviteRole: z.enum(["admin", "editor", "viewer"]).optional(),
  emailNotifications: z.boolean().default(false),
  pushNotifications: z.boolean().default(false),
  weeklyDigest: z.boolean().default(false),
});

export const setupWizardConfigSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  steps: z.array(wizardStepSchema).min(1).max(6),
  nextLabel: z.string().min(1),
  backLabel: z.string().min(1),
  finishLabel: z.string().min(1),
  skipLabel: z.string().min(1),
  successLabel: z.string().min(1),
  profileStepTitle: z.string().min(1),
  profileStepDesc: z.string().min(1),
  nameLabel: z.string().min(1),
  namePlaceholder: z.string().min(1),
  teamStepTitle: z.string().min(1),
  teamStepDesc: z.string().min(1),
  inviteEmailLabel: z.string().min(1),
  inviteEmailPlaceholder: z.string().min(1),
  inviteRoleLabel: z.string().min(1),
  inviteButtonLabel: z.string().min(1),
  preferencesStepTitle: z.string().min(1),
  preferencesStepDesc: z.string().min(1),
  emailNotificationsLabel: z.string().min(1),
  pushNotificationsLabel: z.string().min(1),
  weeklyDigestLabel: z.string().min(1),
  reviewStepTitle: z.string().min(1),
  reviewStepDesc: z.string().min(1),
  infoAlert: z.string().min(1),
});

export type SetupWizardValues = z.infer<typeof setupWizardSchema>;
export type SetupWizardConfig = z.infer<typeof setupWizardConfigSchema>;
