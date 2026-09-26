import { z } from "zod"

import { ALL_PERMISSION_IDS, isValidPermissionId } from "@/config/roles"

export const roleIdSchema = z
  .string()
  .min(1)
  .max(40)
  .regex(/^[a-z]+(?:-[a-z]+)*$/, "ID role hanya boleh huruf kecil dan tanda hubung")

export const permissionIdSchema = z.string().refine(isValidPermissionId, "Permission ID tidak valid")

export const roleSchema = z.object({
  id: roleIdSchema,
  name: z.string().min(1).max(40),
  description: z.string().min(1).max(200),
  userCount: z.number().int().nonnegative(),
  permissions: z.array(permissionIdSchema).max(ALL_PERMISSION_IDS.length),
})

export const rolesResultSchema = z.object({
  roles: z.array(roleSchema).min(1).max(10),
})

export type Role = z.infer<typeof roleSchema>
export type RolesResult = z.infer<typeof rolesResultSchema>

export { ALL_PERMISSION_IDS, isValidPermissionId }
