import { z } from "zod";
import type { IntegrationCategory } from "@/config/integrations";

export const integrationCategories = [
  "communication",
  "commerce",
  "devtool",
  "analytics",
] as const;

export const integrationCategorySchema = z.enum(integrationCategories);
export type IntegrationCategoryEnum = z.infer<typeof integrationCategorySchema>;

const internalHrefSchema = z
  .string()
  .max(200)
  .regex(/^\/[^\s]*$/)
  .refine((v) => !v.includes("//"), "protocol-relative URL ditolak");

export const integrationSchema = z.object({
  id: z.string().min(1).max(64).regex(/^[a-z0-9][a-z0-9-]*$/),
  name: z.string().min(1).max(40),
  description: z.string().max(120),
  category: integrationCategorySchema,
  icon: z.string().min(1).max(40),
  connected: z.boolean(),
  connectedAt: z.string().datetime().nullable(),
  webhookUrl: z.string().url().max(300).nullable().optional(),
  secretHint: z.string().max(64).nullable().optional(),
  docHref: internalHrefSchema.optional(),
});

export type Integration = z.infer<typeof integrationSchema>;

export const integrationListSchema = z.array(integrationSchema).max(80).readonly();
export type IntegrationList = z.infer<typeof integrationListSchema>;
