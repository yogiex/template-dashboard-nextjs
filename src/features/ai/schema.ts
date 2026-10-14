import { z } from "zod";

import { AI_CONFIG } from "@/config/ai";

export const aiProviderSchema = z.enum(["openai", "anthropic"]);
export type AiProviderId = z.infer<typeof aiProviderSchema>;

export const aiMessageRoleSchema = z.enum(["user", "assistant"]);
export type AiMessageRole = z.infer<typeof aiMessageRoleSchema>;

export const aiMessageSchema = z.object({
  id: z.string().min(1).max(64),
  role: aiMessageRoleSchema,
  content: z.string().min(1).max(AI_CONFIG.limits.promptMaxLength * 4),
  createdAt: z.string().datetime(),
});
export type AiMessage = z.infer<typeof aiMessageSchema>;

const aiModelIds = AI_CONFIG.providers.flatMap((p) => p.models.map((m) => m.id)) as [string, ...string[]];
export const aiModelSchema = z.enum(aiModelIds);
export type AiModelId = z.infer<typeof aiModelSchema>;

export const sendChatSchema = z.object({
  provider: aiProviderSchema,
  model: aiModelSchema,
  apiKey: z.string().trim().min(1, "API key wajib diisi").max(300, "API key terlalu panjang"),
  prompt: z
    .string()
    .trim()
    .min(1, "Prompt wajib diisi")
    .max(AI_CONFIG.limits.promptMaxLength, "Prompt terlalu panjang"),
});
export type SendChatValues = z.infer<typeof sendChatSchema>;

export function isModelForProvider(provider: AiProviderId, model: string): boolean {
  const cfg = AI_CONFIG.providers.find((p) => p.id === provider);
  if (!cfg) return false;
  return cfg.models.some((m) => m.id === model);
}
