import "server-only"

import {
  rolesResultSchema,
  type RoleSummary,
  type RolesListResult,
} from "@/features/roles/schema"
import { logger } from "@/lib/logger"

export const MOCK_ROLES: readonly RoleSummary[] = [
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
    userCount: 3,
  },
  {
    id: "editor",
    name: "Editor",
    description: "Manage konten dan data operasional dalam ruang lingkup-edit.",
    permissions: ["dashboard.view", "users.view", "reports.view"],
    userCount: 5,
  },
  {
    id: "viewer",
    name: "Viewer",
    description: "Akses baca terhadap data dan halaman yang diizinkan.",
    permissions: ["dashboard.view", "users.view"],
    userCount: 4,
  },
]

const EMPTY_ROLES: RolesListResult = {
  data: [],
  total: 0,
}

function logServiceError(message: string, error: unknown): void {
  try {
    logger.error(message, error)
  } catch {
    return
  }
}

export async function getRoles(): Promise<RolesListResult> {
  try {
    const result = rolesResultSchema.safeParse({
      data: MOCK_ROLES,
      total: MOCK_ROLES.length,
    })

    if (!result.success) {
      logServiceError("roles.load.invalid", result.error)
      return EMPTY_ROLES
    }

    return result.data
  } catch (error) {
    logServiceError("roles.load.failed", error)
    return EMPTY_ROLES
  }
}
