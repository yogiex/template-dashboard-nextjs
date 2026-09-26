import { z } from "zod";

export const contactFormSchema = z.object({
  name: z
    .string()
    .min(2, "Nama minimal 2 karakter")
    .max(100, "Nama maksimal 100 karakter"),
  email: z
    .string()
    .min(1, "Email wajib diisi")
    .email("Format email tidak valid")
    .max(254, "Email terlalu panjang"),
  subject: z
    .string()
    .min(3, "Subjek minimal 3 karakter")
    .max(120, "Subjek maksimal 120 karakter"),
  message: z
    .string()
    .min(20, "Pesan minimal 20 karakter")
    .max(2000, "Pesan maksimal 2000 karakter"),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;
