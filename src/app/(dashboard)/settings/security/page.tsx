import type { Metadata } from "next";

import { MfaSecuritySettings } from "@/features/auth/components/mfa-security-settings";
import { SECURITY_SETTINGS_CONFIG } from "@/config/mfa-pages";
import { requirePageSession } from "@/features/auth/require-page-session";
import { getMfaStatus } from "@/features/auth/service";

export const metadata: Metadata = {
  title: "Keamanan",
  description: "Kelola autentikasi dua faktor dan backup code akun.",
};

export default async function SecuritySettingsPage() {
  // Layout sudah menutup route ini, tapi halaman ini tetap mengambil sesinya
  // sendiri: `getMfaStatus()` butuh id pemilik data, dan pemanggil yang bodoh
  // soal guard hanyalah satu refactor jauhnya dari halaman tanpa guard.
  const session = await requirePageSession();
  const status = await getMfaStatus(session.id);

  return (
    <MfaSecuritySettings
      config={SECURITY_SETTINGS_CONFIG}
      initialStatus={status}
      isDemoMode={process.env.NODE_ENV !== "production"}
    />
  );
}
