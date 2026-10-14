import { z } from "zod";

export const ACTIVITY_CATEGORIES = [
  "auth",
  "data",
  "config",
  "security",
  "system",
] as const;

export const activityCategorySchema = z.enum(ACTIVITY_CATEGORIES);
export type ActivityCategory = z.infer<typeof activityCategorySchema>;

const internalHrefSchema = z
  .string()
  .max(200, "URL terlalu panjang")
  .regex(/^\/[^\s]*$/, "href harus path internal")
  .refine((v) => !v.includes("//"), "URL protokol-relatif ditolak");

export const activitySchema = z.object({
  id: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/, "ID aktivitas tidak valid"),
  category: activityCategorySchema,
  actor: z.string().min(1).max(100),
  action: z.string().min(1).max(60),
  target: z.string().min(1).max(100),
  href: internalHrefSchema.optional(),
  createdAt: z.date(),
});

export const activitySchemaArray = z.array(activitySchema).max(50);

export type Activity = z.infer<typeof activitySchema>;

export const activityQuerySchema = z.object({
  category: activityCategorySchema.optional(),
  page: z.number().int().min(1).catch(1).optional(),
  pageSize: z.number().int().min(1).max(100).catch(25).optional(),
});

export type ActivityQuery = z.infer<typeof activityQuerySchema>;

export interface ActivityPage {
  items: Activity[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
