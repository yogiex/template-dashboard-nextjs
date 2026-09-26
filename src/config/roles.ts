export interface PermissionDef {
  id: string
  action: string
  description: string
}

export interface ResourceGroup {
  resource: string
  label: string
  permissions: PermissionDef[]
}

export const PERMISSION_CATALOG: ResourceGroup[] = [
  {
    resource: "users",
    label: "Manajemen User",
    permissions: [
      { id: "users:read", action: "Lihat", description: "Melihat daftar & detail user" },
      { id: "users:create", action: "Buat", description: "Menambahkan user baru" },
      { id: "users:update", action: "Ubah", description: "Mengubah data & role user" },
      { id: "users:delete", action: "Hapus", description: "Menghapus user permanen" },
    ],
  },
  {
    resource: "content",
    label: "Konten",
    permissions: [
      { id: "content:read", action: "Lihat", description: "Melihat semua konten" },
      { id: "content:create", action: "Buat", description: "Membuat konten baru" },
      { id: "content:update", action: "Ubah", description: "Mengubah konten apa pun" },
      { id: "content:delete", action: "Hapus", description: "Menghapus konten" },
    ],
  },
  {
    resource: "settings",
    label: "Pengaturan",
    permissions: [
      { id: "settings:read", action: "Lihat", description: "Melihat halaman settings" },
      { id: "settings:update", action: "Ubah", description: "Mengubah pengaturan aplikasi & tampilan" },
    ],
  },
] as const

export const ALL_PERMISSION_IDS = PERMISSION_CATALOG.flatMap((group) =>
  group.permissions.map((permission) => permission.id),
) as [string, ...string[]]

export function isValidPermissionId(id: unknown): id is string {
  return typeof id === "string" && (ALL_PERMISSION_IDS as readonly string[]).includes(id)
}
