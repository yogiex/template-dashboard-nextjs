import type { Metadata } from "next";

import { AuthShell } from "@/features/auth/components/auth-shell";
import { RegisterForm } from "@/features/auth/components/register-form";
import { getLoginPageConfig } from "@/features/auth/service";

export const metadata: Metadata = {
  title: "Daftar",
};

export default async function RegisterPage() {
  const config = await getLoginPageConfig();

  return (
    <AuthShell config={config}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Buat akun</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Isi data berikut untuk memulai. Email harus unik.
          </p>
        </div>
        <RegisterForm submitLabel="Daftar" signInLabel="Sudah punya akun? Masuk" />
      </div>
    </AuthShell>
  );
}
