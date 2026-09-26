import { z } from "zod";

export const LOGIN_ICONS = [
  "shield",
  "zap",
  "bar-chart",
  "users",
  "lock",
  "sparkles",
] as const;

export type LoginIconName = (typeof LOGIN_ICONS)[number];

export const passwordSchema = z
  .string()
  .min(8, "Password minimal 8 karakter")
  .max(72, "Password maksimal 72 karakter")
  .regex(/[a-z]/, "Password harus mengandung huruf kecil")
  .regex(/[A-Z]/, "Password harus mengandung huruf besar")
  .regex(/[0-9]/, "Password harus mengandung angka");

/**
 * Batas 254 mengikuti maksimum panjang path di RFC 5321. Email juga dipakai
 * sebagai key rate limit di `loginAction`, jadi field ini wajib dibatasi di
 * boundary validasi — bukan hanya di dalam rate limiter.
 */
const emailSchema = z
  .string()
  .min(1, "Email wajib diisi")
  .email("Format email tidak valid")
  .max(254, "Email terlalu panjang");

export const loginFormSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(8, "Password minimal 8 karakter")
    .max(72, "Password maksimal 72 karakter"),
  rememberMe: z.boolean().default(false),
});

export const registerFormSchema = z
  .object({
    name: z
      .string()
      .min(2, "Nama minimal 2 karakter")
      .max(100, "Nama maksimal 100 karakter")
      .regex(
        /^[\p{L}\p{M}'.\- ]+$/u,
        "Nama hanya boleh berisi huruf, spasi, tanda petik, dan tanda hubung"
      ),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi"),
    acceptTerms: z.boolean().refine((accepted) => accepted === true, {
      message: "Anda harus menyetujui syarat & ketentuan",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Password dan konfirmasi tidak sama",
    path: ["confirmPassword"],
  });

export const forgotPasswordFormSchema = z.object({
  email: emailSchema,
});

export const resetTokenSchema = z
  .string()
  .length(64, "Token tidak valid")
  .regex(/^[a-f0-9]+$/, "Token tidak valid");

export const resetPasswordFormSchema = z
  .object({
    token: resetTokenSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Password dan konfirmasi tidak sama",
    path: ["confirmPassword"],
  });

export const MFA_METHODS = ["totp", "email"] as const;

export type MfaMethod = (typeof MFA_METHODS)[number];

export const otpCodeSchema = z
  .string()
  .regex(/^\d{6}$/, "Kode verifikasi harus 6 digit angka.");

export const backupCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/, "Format backup code: XXXX-XXXX.");

export const verifyMfaFormSchema = z.object({
  code: otpCodeSchema,
});

export const verifyBackupCodeFormSchema = z.object({
  code: backupCodeSchema,
});

export const confirmTotpEnrollmentFormSchema = z.object({
  enrollmentId: z.string().min(1, "Sesi enrolment tidak valid"),
  code: otpCodeSchema,
});

export const confirmEmailEnrollmentFormSchema = z.object({
  enrollmentId: z.string().min(1, "Sesi enrolment tidak valid"),
  code: otpCodeSchema,
});

export const disableMfaFormSchema = z.object({
  password: z
    .string()
    .min(1, "Kata sandi wajib diisi")
    .max(72, "Kata sandi maksimal 72 karakter"),
});

const loginHighlightSchema = z.object({
  icon: z.enum(LOGIN_ICONS),
  title: z.string().min(1).max(60),
  description: z.string().min(1).max(200),
});

export const authBrandingSchema = z.object({
  appName: z.string().min(1).max(40),
  tagline: z.string().max(120),
  highlights: z.array(loginHighlightSchema).min(1).max(4),
});

export const authFooterSchema = z.object({
  copyright: z.string().max(120),
  links: z
    .array(
      z.object({
        label: z.string().min(1).max(30),
        href: z.string().min(1).max(200),
      })
    )
    .max(4),
});

export const authPageConfigSchema = z.object({
  branding: authBrandingSchema,
  footer: authFooterSchema,
});

export const loginPageFormSchema = z.object({
  title: z.string().min(1).max(60),
  description: z.string().max(120),
  submitLabel: z.string().min(1).max(30),
  emailLabel: z.string().min(1).max(30),
  emailPlaceholder: z.string().max(60),
  passwordLabel: z.string().min(1).max(30),
  passwordPlaceholder: z.string().max(60),
  showRememberMe: z.boolean(),
  rememberMeLabel: z.string().max(30),
  showForgotPassword: z.boolean(),
  forgotPasswordLabel: z.string().max(40),
  forgotPasswordHref: z.string().min(1).max(200),
  footerText: z.string().max(120),
  signUpLabel: z.string().max(60).nullable(),
  signUpHref: z.string().max(200).nullable(),
});

export const registerPageFormSchema = z.object({
  title: z.string().min(1).max(60),
  description: z.string().max(120),
  submitLabel: z.string().min(1).max(30),
  signInLabel: z.string().min(1).max(60),
  nameLabel: z.string().min(1).max(30),
  namePlaceholder: z.string().max(60),
  emailLabel: z.string().min(1).max(30),
  emailPlaceholder: z.string().max(60),
  passwordLabel: z.string().min(1).max(30),
  passwordPlaceholder: z.string().max(60),
  confirmPasswordLabel: z.string().min(1).max(30),
  termsLabel: z.string().min(1).max(160),
  termsHref: z.string().min(1).max(200),
  privacyHref: z.string().min(1).max(200),
  termsLinkLabel: z.string().min(1).max(40),
  privacyLinkLabel: z.string().min(1).max(40),
});

export type LoginFormValues = z.infer<typeof loginFormSchema>;
export type RegisterFormValues = z.infer<typeof registerFormSchema>;
export type ForgotPasswordFormValues = z.infer<
  typeof forgotPasswordFormSchema
>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>;
export type VerifyMfaFormValues = z.infer<typeof verifyMfaFormSchema>;
export type VerifyBackupCodeFormValues = z.infer<
  typeof verifyBackupCodeFormSchema
>;
export type ConfirmTotpEnrollmentFormValues = z.infer<
  typeof confirmTotpEnrollmentFormSchema
>;
export type ConfirmEmailEnrollmentFormValues = z.infer<
  typeof confirmEmailEnrollmentFormSchema
>;
export type DisableMfaFormValues = z.infer<typeof disableMfaFormSchema>;
export type AuthPageConfig = z.infer<typeof authPageConfigSchema>;
export type LoginPageFormConfig = z.infer<typeof loginPageFormSchema>;
export type RegisterPageFormConfig = z.infer<typeof registerPageFormSchema>;
