import { z } from "zod";

import { DEFAULT_PRESET_ID, PRESET_COLORS } from "@/config/appearance";

const presetIds = PRESET_COLORS.map((preset) => preset.id) as [string, ...string[]];

export const appearanceSchema = z.object({
  primaryColor: z.enum(presetIds).default(DEFAULT_PRESET_ID),
});

export type Appearance = z.infer<typeof appearanceSchema>;

export const settingsSchema = z.object({
  appearance: appearanceSchema.default({ primaryColor: DEFAULT_PRESET_ID }),
});

export type Settings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: Settings = {
  appearance: { primaryColor: DEFAULT_PRESET_ID },
};
