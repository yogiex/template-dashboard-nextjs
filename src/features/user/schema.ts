import { z } from "zod"

import { listParamsSchema } from "@/lib/search-params"

export const userRoleSchema = z.enum(["admin", "editor", "viewer"])
export type UserRole = z.infer<typeof userRoleSchema>

export const userStatusSchema = z.enum(["active", "pending", "suspended"])
export type UserStatus = z.infer<typeof userStatusSchema>

export const userSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(100),
  email: z.string().email().max(254),
  role: userRoleSchema,
  status: userStatusSchema,
  createdAt: z.date(),
})

export type User = z.infer<typeof userSchema>

export const USER_SORTABLE_FIELDS = ["name", "email", "createdAt"] as const
export type UserSortField = (typeof USER_SORTABLE_FIELDS)[number]

const sortDirectionSchema = z.enum(["asc", "desc"]).catch("desc")

export const userQuerySchema = listParamsSchema.extend({
  role: userRoleSchema.optional().catch(undefined),
  sort: z.enum(USER_SORTABLE_FIELDS).catch("createdAt").default("createdAt"),
  dir: sortDirectionSchema.default("desc"),
})

export type UserQuery = z.infer<typeof userQuerySchema>

export interface UserListResult {
  data: User[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export const deleteUserSchema = z.object({
  id: z
    .string()
    .min(1, "ID wajib diisi")
    .max(64, "ID tidak valid")
    .regex(/^[a-zA-Z0-9_-]+$/, "ID tidak valid"),
})

export const createUserSchema = z.object({
  name: z
    .string()
    .min(2)
    .max(100)
    .regex(
      /^[\p{L}\p{M}][\p{L}\p{M}\p{N} .'-]*[\p{L}\p{M}\p{N}]$/u,
      "Nama harus terdiri dari 2-100 karakter yang valid"
    ),
  email: z.string().email().max(254),
  role: userRoleSchema,
  status: userStatusSchema,
})

export type CreateUserInput = z.infer<typeof createUserSchema>

export const updateUserSchema = createUserSchema.extend({
  id: deleteUserSchema.shape.id,
})

export type UpdateUserInput = z.infer<typeof updateUserSchema>
