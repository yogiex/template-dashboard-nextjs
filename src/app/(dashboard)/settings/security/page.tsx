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
  // Status MFA milik akun yang sedang login. Guard di layout sudah menutup route
  // ini, tapi halaman ini juga memanggil DAL, jadi pemanggilnya butuh id
  // session-nya sendiri; affordance dev yang sama dipakai supaya
  // `DEV_AUTH_BYPASS=1` tetap cukup untuk membuka halaman.
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
