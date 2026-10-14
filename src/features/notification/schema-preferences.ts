import { z } from "zod";

export const notificationPreferencesSchema = z.object({
  inApp: z.boolean(),
  email: z.boolean(),
  push: z.boolean(),
  quietHoursEnabled: z.boolean(),
  quietStart: z
    .string()
    .regex(/^\\d{2}:\\d{2}$/, "Format HH:mm")
    .optional()
    .or(z.literal("")),
  quietEnd: z
    .string()
    .regex(/^\\d{2}:\\d{2}$/, "Format HH:mm")
    .optional()
    .or(z.literal("")),
});

export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;
