import "server-only"

import { rolesResultSchema, type RolesResult } from "@/features/role/schema"
import { logger } from "@/lib/logger"

const MOCK_ROLES: RolesResult = {
  roles: [
    {
      id: "admin",
      name: "Admin",
      description: "Akses penuh ke seluruh fitur termasuk pengaturan aplikasi.",
      userCount: 3,
      permissions: [
        "users:read",
        "users:create",
        "users:update",
        "users:delete",
        "content:read",
        "content:create",
        "content:update",
        "content:delete",
        "settings:read",
        "settings:update",
      ],
    },
    {
      id: "editor",
      name: "Editor",
      description: "Mengelola konten, tidak dapat mengubah pengaturan atau menghapus user.",
      userCount: 4,
      permissions: [
        "users:read",
        "content:read",
        "content:create",
        "content:update",
        "content:delete",
        "settings:read",
      ],
    },
    {
      id: "viewer",
      name: "Viewer",
      description: "Hanya dapat melihat data, tanpa hak akses tulis.",
      userCount: 5,
      permissions: ["users:read", "content:read", "settings:read"],
    },
  ],
}

function logRoleError(message: string, error: unknown): void {
  try {
    logger.error(message, error)
  } catch {
    return
  }
}

export async function getRoles(): Promise<RolesResult> {
  const result = rolesResultSchema.safeParse(MOCK_ROLES)
  if (!result.success) {
    logRoleError("role.list.invalid", result.error)
    return { roles: [] }
  }
  return result.data
}
