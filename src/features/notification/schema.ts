import { z } from "zod"

export const notificationTypeSchema = z.enum(["info", "success", "warning", "error"])
export type NotificationType = z.infer<typeof notificationTypeSchema>

export const notificationIdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9_-]+$/, "ID notifikasi tidak valid")

const internalHrefSchema = z
  .string()
  .max(200)
  .regex(/^\/[^\s]*$/, "href harus path internal")
  .refine((value) => !value.includes("//"), "protocol-relative URL ditolak")

export const notificationSchema = z.object({
  id: notificationIdSchema,
  type: notificationTypeSchema,
  title: z.string().min(1).max(80),
  description: z.string().max(200),
  href: internalHrefSchema.optional(),
  isRead: z.boolean().default(false),
  createdAt: z.date(),
})

export const notificationsResultSchema = z.object({
  notifications: z.array(notificationSchema).max(20),
})

export type Notification = z.infer<typeof notificationSchema>
export type NotificationsResult = z.infer<typeof notificationsResultSchema>
