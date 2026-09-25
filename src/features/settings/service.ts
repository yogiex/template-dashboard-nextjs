import {
  DEFAULT_SETTINGS,
  settingsSchema,
  type Settings,
} from "@/features/settings/schema";
import { logger } from "@/lib/logger";

const STORAGE_KEY = "app-settings";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function loadSettings(): Settings {
  if (!isBrowser()) return DEFAULT_SETTINGS;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;

    const parsed = settingsSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      logger.info("settings.load.invalid", { issue: parsed.error.issues[0]?.path });
      return DEFAULT_SETTINGS;
    }
    return parsed.data;
  } catch (error) {
    logger.info("settings.load.failed", { err: error });
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: Settings): boolean {
  if (!isBrowser()) return false;

  const parsed = settingsSchema.safeParse(settings);
  if (!parsed.success) {
    logger.warn("settings.save.invalid", { issue: parsed.error.issues[0]?.path });
    return false;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed.data));
    return true;
  } catch (error) {
    logger.warn("settings.save.failed", { err: error });
    return false;
  }
}
