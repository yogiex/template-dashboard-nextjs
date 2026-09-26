import { z } from "zod"

import { userRoleSchema, type UserRole } from "@/features/user/schema"

export const roleSchema = userRoleSchema
export type Role = z.infer<typeof roleSchema>

export const permissionKeySchema = z.enum([
  "dashboard.view",
  "users.view",
  "users.manage",
  "roles.view",
  "settings.view",
  "reports.view",
])
export type PermissionKey = z.infer<typeof permissionKeySchema>

export const permissionDefinitionSchema = z.object({
  key: permissionKeySchema,
  name: z.string().min(1),
  description: z.string().min(1),
})
export type PermissionDefinition = z.infer<typeof permissionDefinitionSchema>

export const roleDefinitionSchema = z.object({
  id: roleSchema,
  name: z.string().min(1),
  description: z.string().min(1),
  permissions: z.array(permissionKeySchema),
})
export type RoleDefinition = z.infer<typeof roleDefinitionSchema>

export const roleSummarySchema = roleDefinitionSchema.extend({
  userCount: z.number().int().nonnegative(),
})
export type RoleSummary = z.infer<typeof roleSummarySchema>

export type RolePermissionMatrix = Record<Role, Record<PermissionKey, boolean>>

export const PERMISSION_DEFINITIONS: readonly PermissionDefinition[] = [
  {
    key: "dashboard.view",
    name: "Lihat dashboard",
    description: "Melihat ringkasan dan statistik dashboard.",
  },
  {
    key: "users.view",
    name: "Lihat pengguna",
    description: "Melihat daftar dan detail pengguna.",
  },
  {
    key: "users.manage",
    name: "Kelola pengguna",
    description: "Menambah, mengubah, dan menghapus pengguna.",
  },
  {
    key: "roles.view",
    name: "Lihat role",
    description: "Melihat daftar role dan matriks izin.",
  },
  {
    key: "settings.view",
    name: "Lihat pengaturan",
    description: "Melihat pengaturan aplikasi.",
  },
  {
    key: "reports.view",
    name: "Lihat laporan",
    description: "Melihat laporan dan data analitik.",
  },
]

export const ROLE_DEFINITIONS: readonly RoleDefinition[] = [
  {
    id: "admin",
    name: "Administrator",
    description: "Akses penuh ke seluruh fitur dan pengaturan aplikasi.",
    permissions: [
      "dashboard.view",
      "users.view",
      "users.manage",
      "roles.view",
      "settings.view",
      "reports.view",
    ],
  },
  {
    id: "editor",
    name: "Editor",
    description: "Manage konten dan data operasional dalam ruang lingkup-edit.",
    permissions: ["dashboard.view", "users.view", "reports.view"],
  },
  {
    id: "viewer",
    name: "Viewer",
    description: "Akses baca terhadap data dan halaman yang diizinkan.",
    permissions: ["dashboard.view", "users.view"],
  },
]

export const ROLE_PERMISSION_MATRIX: RolePermissionMatrix = {
  admin: {
    "dashboard.view": true,
    "users.view": true,
    "users.manage": true,
    "roles.view": true,
    "settings.view": true,
    "reports.view": true,
  },
  editor: {
    "dashboard.view": true,
    "users.view": true,
    "users.manage": false,
    "roles.view": false,
    "settings.view": false,
    "reports.view": true,
  },
  viewer: {
    "dashboard.view": true,
    "users.view": true,
    "users.manage": false,
    "roles.view": false,
    "settings.view": false,
    "reports.view": false,
  },
}

export const ROLE_SUMMARIES: readonly RoleSummary[] = ROLE_DEFINITIONS.map((role) => ({
  ...role,
  userCount: role.id === "admin" ? 3 : role.id === "editor" ? 5 : 4,
}))

export const rolesResultSchema = z.object({
  data: z.array(roleSummarySchema),
  total: z.number().int().nonnegative(),
})

export type RolesListResult = z.infer<typeof rolesResultSchema>

export const STATIC_ROLE_UI_REFERENCE = {
  roles: ROLE_DEFINITIONS,
  permissions: PERMISSION_DEFINITIONS,
  matrix: ROLE_PERMISSION_MATRIX,
  summaries: ROLE_SUMMARIES,
} as const

export type StaticRoleUiReference = typeof STATIC_ROLE_UI_REFERENCE

export type RoleName = UserRole
