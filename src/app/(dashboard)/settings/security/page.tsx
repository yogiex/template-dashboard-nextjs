import type { Metadata } from "next";

import { MfaSecuritySettings } from "@/features/auth/components/mfa-security-settings";
import { SECURITY_SETTINGS_CONFIG } from "@/config/mfa-pages";
import { requirePageSessionForDev } from "@/features/auth/require-page-session";
import { getMfaStatus } from "@/features/auth/service";

export const metadata: Metadata = {
  title: "Keamanan",
  description: "Kelola autentikasi dua faktor dan backup code akun.",
};

export default async function SecuritySettingsPage() {
  // Status MFA milik akun yang sedang login, dan `getMfaStatus()` butuh id
  // pemilik data. Di static export tidak ada sesi, jadi affordance dev yang
  // sama dipakai: lokal (`DEV_AUTH_BYPASS=1`) halaman terbuka dengan sesi
  // placeholder, sementara situs Pages gagal tertutup ke `/login`. Guard
  // produksi (`requirePageSession`) akan kembali bersama host Node.
  const session = await requirePageSessionForDev();
  const status = await getMfaStatus(session.id);

  return (
    <MfaSecuritySettings
      config={SECURITY_SETTINGS_CONFIG}
      initialStatus={status}
      isDemoMode={process.env.NODE_ENV !== "production"}
    />
  );
}
