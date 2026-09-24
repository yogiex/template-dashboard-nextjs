import { z } from "zod";

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),
});

const clientEnvSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});

function parseEnv<T extends z.ZodTypeAny>(schema: T, env: unknown): z.infer<T> {
  const parsed = schema.safeParse(env);

  if (!parsed.success) {
    const fields = Object.keys(parsed.error.flatten().fieldErrors).join(", ");
    throw new Error(
      `Environment variable tidak valid: ${fields}. Cek .env.example dan bandingkan dengan .env.local.`,
    );
  }

  return parsed.data;
}

export const env = parseEnv(
  serverEnvSchema.merge(clientEnvSchema),
  process.env,
);
