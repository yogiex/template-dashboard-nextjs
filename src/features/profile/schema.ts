import { z } from "zod";

export const profileFormSchema = z.object({
  name: z
    .string()
    .min(2, "Nama minimal 2 karakter")
    .max(100, "Nama maksimal 100 karakter"),
  email: z
    .string()
    .min(1, "Email wajib diisi")
    .email("Format email tidak valid")
    .max(254, "Email terlalu panjang"),
  bio: z.string().max(200, "Bio maksimal 200 karakter").optional(),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
