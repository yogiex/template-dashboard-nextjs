import { z } from "zod";

export const profileFormSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Nama minimal 2 karakter")
    .max(100, "Nama maksimal 100 karakter"),
  email: z
    .string()
    .trim()
    .email("Format email tidak valid")
    .max(254, "Email terlalu panjang"),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(8, "Kata sandi minimal 8 karakter")
      .max(128, "Kata sandi terlalu panjang"),
    newPassword: z
      .string()
      .min(8, "Kata sandi baru minimal 8 karakter")
      .max(128, "Kata sandi baru terlalu panjang"),
    confirmPassword: z
      .string()
      .min(8, "Konfirmasi minimal 8 karakter")
      .max(128, "Konfirmasi terlalu panjang"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Konfirmasi tidak cocok",
    path: ["confirmPassword"],
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    message: "Kata sandi baru tidak boleh sama dengan yang lama",
    path: ["newPassword"],
  });

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export const deleteAccountConfirmationSchema = z.object({
  confirmText: z.literal("DELETE", {
    errorMap: () => ({ message: 'Ketik "DELETE" untuk konfirmasi' }),
  }),
});

export type DeleteAccountConfirmationValues = z.infer<
  typeof deleteAccountConfirmationSchema
>;

const internalHrefSchema = z
  .string()
  .max(200, "URL terlalu panjang")
  .regex(/^\/[^\s]*$/, "href harus path internal")
  .refine((v) => !v.includes("//"), "protocol-relative URL ditolak");

export const sessionSchema = z.object({
  id: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/, "ID sesi tidak valid"),
  device: z.string().min(1).max(60),
  os: z.string().min(1).max(60),
  ipHash: z.string().min(1).max(64),
  lastActiveAt: z.string().datetime({ message: "Timestamp sesi tidak valid" }),
  isCurrent: z.boolean().default(false),
});

export type SessionInfo = z.infer<typeof sessionSchema>;

export const sessionsSchema = z.array(sessionSchema).max(20);
