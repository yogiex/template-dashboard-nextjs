import { clientLogger } from "@/lib/logger-client";
import { mfaStateSchema, type MfaState, MOCK_TOTP } from "@/features/mfa/schema";

const STORAGE_KEY = "mfa.state";

const DEFAULT_STATE: MfaState = {
  enrolled: false,
  secret: null,
  backupCodes: [],
  deviceTrust: false,
  enrolledAt: null,
};

export function loadMfaState(): MfaState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed: unknown = JSON.parse(raw);
    const merged =
      typeof parsed === "object" && parsed !== null
        ? { ...DEFAULT_STATE, ...parsed }
        : DEFAULT_STATE;
    const result = mfaStateSchema.safeParse(merged);
    if (result.success) return result.data;
    clientLogger.warn("mfa.state.invalid", { issues: result.error.flatten() });
    return DEFAULT_STATE;
  } catch (error) {
    clientLogger.error("mfa.state.load_failed", error);
    return DEFAULT_STATE;
  }
}

export function saveMfaState(state: MfaState): boolean {
  const result = mfaStateSchema.safeParse(state);
  if (!result.success) return false;
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(result.data));
    return true;
  } catch (error) {
    clientLogger.error("mfa.state.save_failed", error);
    return false;
  }
}

export function clearMfaState(): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    clientLogger.error("mfa.state.clear_failed", error);
    return false;
  }
}

export function verifyTotp(code: string): boolean {
  return code.trim() === MOCK_TOTP;
}
