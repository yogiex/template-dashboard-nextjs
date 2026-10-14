import {
  setupWizardSchema,
  type SetupWizardValues,
} from "./schema";

const STORAGE_KEY = "setup-wizard";

export function loadWizardState(): Partial<SetupWizardValues> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = setupWizardSchema.partial().safeParse(JSON.parse(raw));
    if (!parsed.success) return {};
    return parsed.data;
  } catch {
    return {};
  }
}

export function saveWizardState(state: Partial<SetupWizardValues>): boolean {
  if (typeof window === "undefined") return false;
  try {
    const merged = { ...loadWizardState(), ...state };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return true;
  } catch {
    return false;
  }
}

export function clearWizardState(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
