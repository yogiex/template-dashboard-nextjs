import { z } from "zod";
import { listParamsSchema } from "@/lib/search-params";

export const teamRoleSchema = z.enum(["admin", "editor", "viewer"]);
export type TeamRole = z.infer<typeof teamRoleSchema>;

export const teamStatusSchema = z.enum(["active", "pending", "suspended"]);
export type TeamStatus = z.infer<typeof teamStatusSchema>;

export const teamMemberSchema = z.object({
  id: z.string().min(1),
  name: z
    .string()
    .min(1, "Nama wajib diisi")
    .max(100, "Nama maksimal 100 karakter"),
  email: z.string().email("Format email tidak valid").max(254, "Email terlalu panjang"),
  role: teamRoleSchema,
  status: teamStatusSchema,
  createdAt: z.date(),
});

export type TeamMember = z.infer<typeof teamMemberSchema>;

export const TEAM_SORTABLE_FIELDS = ["name", "email", "createdAt"] as const;
export type TeamSortField = (typeof TEAM_SORTABLE_FIELDS)[number];

const sortDirectionSchema = z.enum(["asc", "desc"]).catch("desc");

export const teamQuerySchema = listParamsSchema.extend({
  role: teamRoleSchema.optional().catch(undefined),
  sort: z.enum(TEAM_SORTABLE_FIELDS).catch("createdAt").default("createdAt"),
  dir: sortDirectionSchema.default("desc"),
});

export type TeamQuery = z.infer<typeof teamQuerySchema>;

export interface TeamListResult {
  data: TeamMember[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const deleteTeamMemberSchema = z.object({
  id: z.string().min(1, "ID wajib diisi").max(64, "ID tidak valid")
    .regex(/^[a-zA-Z0-9_-]+$/, "ID tidak valid"),
});

export const createTeamMemberSchema = z.object({
  name: z
    .string()
    .min(2, "Nama minimal 2 karakter")
    .max(100, "Nama maksimal 100 karakter"),
  email: z.string().email("Format email tidak valid").max(254, "Email terlalu panjang"),
  role: teamRoleSchema,
  status: teamStatusSchema,
});

export type CreateTeamMemberInput = z.infer<typeof createTeamMemberSchema>;

export const updateTeamMemberSchema = createTeamMemberSchema.extend({
  id: deleteTeamMemberSchema.shape.id,
});

export type UpdateTeamMemberInput = z.infer<typeof updateTeamMemberSchema>;

export type TeamFormValues = CreateTeamMemberInput;
export type TeamActionResult = {
  success: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
};
