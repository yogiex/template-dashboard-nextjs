import type { RegisterPageFormConfig } from "@/features/auth/schema";

export const REGISTER_PAGE_CONFIG: RegisterPageFormConfig = {
  title: "Buat akun",
  description: "Isi data berikut untuk membuat akun Anda.",
  submitLabel: "Daftar",
  signInLabel: "Sudah punya akun? Masuk",
  nameLabel: "Nama lengkap",
  namePlaceholder: "Nama Anda",
  emailLabel: "Email",
  emailPlaceholder: "nama@email.com",
  passwordLabel: "Kata Sandi",
  passwordPlaceholder: "••••••••",
  confirmPasswordLabel: "Konfirmasi kata sandi",
  termsLabel:
    "Saya menyetujui syarat dan ketentuan serta kebijakan privasi",
  termsHref: "/terms",
  privacyHref: "/privacy",
  termsLinkLabel: "Syarat & Ketentuan",
  privacyLinkLabel: "Kebijakan Privasi",
};
