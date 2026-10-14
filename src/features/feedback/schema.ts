import { z } from "zod";

export const feedbackFormSchema = z.object({
  subject: z
    .string()
    .min(2, "Judul minimal 2 karakter")
    .max(100, "Judul maksimal 100 karakter"),
  category: z.enum(["bug", "feature", "general", "other"]),
  rating: z.number().int().min(1, "Rating wajib dipilih").max(5),
  message: z
    .string()
    .min(10, "Pesan minimal 10 karakter")
    .max(1000, "Pesan maksimal 1000 karakter"),
  email: z
    .string()
    .email("Format email tidak valid")
    .max(254, "Email terlalu panjang")
    .optional()
    .or(z.literal("")),
});

export type FeedbackFormValues = z.infer<typeof feedbackFormSchema>;
