import { clientLogger } from "@/lib/logger-client";
import { deleteAccountConfirmationSchema, profileFormSchema, type ProfileFormValues, type SessionInfo, sessionsSchema } from "@/features/account/schema";

const PROFILE_KEY = "account.profile";
const SESSIONS_KEY = "account.sessions";

const DEFAULT_SESSIONS: SessionInfo[] = [
  {
    id: "ses_current",
    device: "Chrome di Windows",
    os: "Windows 11",
    ipHash: "h_8a3f",
    lastActiveAt: new Date().toISOString(),
    isCurrent: true,
  },
  {
    id: "ses_mobile",
    device: "Safari di iPhone",
    os: "iOS 18",
    ipHash: "h_4b2e",
    lastActiveAt: new Date(Date.now() - 2 * 60 * 60_000).toISOString(),
    isCurrent: false,
  },
];

export function getProfileFallback(): ProfileFormValues {
  return { fullName: "Budi Santoso", email: "budi@acme.co" };
}

export function loadProfile(): ProfileFormValues {
  if (typeof window === "undefined") return getProfileFallback();
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return getProfileFallback();
    const parsed: unknown = JSON.parse(raw);
    const result = profileFormSchema.safeParse(parsed);
    if (result.success) return result.data;
    clientLogger.warn("account.profile.invalid", { issues: result.error.flatten() });
    return getProfileFallback();
  } catch (error) {
    clientLogger.error("account.profile.load_failed", error);
    return getProfileFallback();
  }
}

export function saveProfile(profile: ProfileFormValues): boolean {
  const result = profileFormSchema.safeParse(profile);
  if (!result.success) return false;
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(result.data));
    return true;
  } catch (error) {
    clientLogger.error("account.profile.save_failed", error);
    return false;
  }
}

export type { SessionInfo };

export function loadSessions(): SessionInfo[] {
  if (typeof window === "undefined") return DEFAULT_SESSIONS;
  try {
    const raw = window.localStorage.getItem(SESSIONS_KEY);
    if (!raw) return DEFAULT_SESSIONS;
    const parsed: unknown = JSON.parse(raw);
    const result = sessionsSchema.safeParse(parsed);
    if (result.success) return result.data;
    clientLogger.warn("account.sessions.invalid", { issues: result.error.flatten() });
    return DEFAULT_SESSIONS;
  } catch (error) {
    clientLogger.error("account.sessions.load_failed", error);
    return DEFAULT_SESSIONS;
  }
}

export function revokeSession(id: string): boolean {
  if (typeof window === "undefined" || typeof id !== "string") return false;
  try {
    const next = loadSessions().filter((s) => s.id !== id);
    window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(next));
    return true;
  } catch (error) {
    clientLogger.error("account.session.revoke_failed", { id, error });
    return false;
  }
}

export async function scheduleDeleteAccount(): Promise<boolean> {
  // Mock only: mark a flag locally. No persistence of PII.
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem("account.delete_scheduled", JSON.stringify({ at: new Date().toISOString() }));
    return true;
  } catch (error) {
    clientLogger.error("account.delete.schedule_failed", error);
    return false;
  }
}

export { deleteAccountConfirmationSchema };
