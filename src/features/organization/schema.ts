import { z } from "zod";

/**
 * Batas id karyawan diperketat (64 karakter) karena id dipakai sebagai
 * kunci peta dan masuk ke audit log.
 */
export const employeeIdSchema = z.string().trim().min(1).max(64);

export const employeeSchema = z.object({
  id: employeeIdSchema,
  name: z.string().trim().min(1).max(120),
  role: z.string().trim().min(1).max(120),
  department: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(254),
  avatarUrl: z.string().trim().url().max(500).optional(),
  managerId: employeeIdSchema.nullable(),
  directReports: z.number().int().min(0).max(1000),
  location: z.string().trim().min(1).max(120),
  joinedAt: z.string().datetime(),
});

export type Employee = z.infer<typeof employeeSchema>;

export const orgQuerySchema = z.object({
  department: z.string().trim().min(1).max(80).optional(),
  search: z.string().trim().min(1).max(120).optional(),
});

export type OrgQuery = z.infer<typeof orgQuerySchema>;
export type OrgQueryInput = z.input<typeof orgQuerySchema>;
