import type { LoginPageFormConfig } from "@/features/auth/schema";

export const LOGIN_PAGE_FORM_CONFIG: LoginPageFormConfig = {
  title: "Selamat Datang Kembali",
  description: "Masuk untuk melanjutkan ke dashboard.",
  submitLabel: "Masuk",
  emailLabel: "Email",
  emailPlaceholder: "nama@email.com",
  passwordLabel: "Kata Sandi",
  passwordPlaceholder: "••••••••",
  showRememberMe: true,
  rememberMeLabel: "Ingat saya",
  showForgotPassword: true,
  forgotPasswordLabel: "Lupa kata sandi?",
  forgotPasswordHref: "/forgot-password",
  footerText: "Belum punya akun?",
  signUpLabel: "Daftar sekarang",
  signUpHref: "/register",
};
