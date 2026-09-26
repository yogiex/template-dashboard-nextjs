import { notificationIdSchema, notificationsResultSchema, type Notification, type NotificationsResult } from "@/features/notification/schema"
import { clientLogger } from "@/lib/logger-client"

const STORAGE_KEY = "notification-read-ids"

const MOCK_NOTIFICATIONS: NotificationsResult = {
  notifications: [
    {
      id: "ntf_01",
      type: "error",
      title: "Backup gagal",
      description: "Backup otomatis pukul 02:00 tidak berhasil dijalankan.",
      isRead: false,
      createdAt: new Date(Date.now() - 5 * 60_000),
    },
    {
      id: "ntf_02",
      type: "warning",
      title: "Penggunaan storage 85%",
      description: "Ruang penyimpanan hampir penuh. Pertimbangkan upgrade.",
      href: "/settings",
      isRead: false,
      createdAt: new Date(Date.now() - 45 * 60_000),
    },
    {
      id: "ntf_03",
      type: "success",
      title: "Laporan bulanan siap",
      description: "Laporan penjualan bulan lalu telah selesai dibuat.",
      href: "/dashboard",
      isRead: false,
      createdAt: new Date(Date.now() - 3 * 60 * 60_000),
    },
    {
      id: "ntf_04",
      type: "info",
      title: "User baru mendaftar",
      description: "putri@acme.co mendaftar melalui halaman registrasi.",
      href: "/users",
      isRead: true,
      createdAt: new Date(Date.now() - 26 * 60 * 60_000),
    },
  ],
}

export async function getNotifications(): Promise<NotificationsResult> {
  const result = notificationsResultSchema.safeParse(MOCK_NOTIFICATIONS)
  if (!result.success) {
    clientLogger.error("notification.list.invalid", result.error)
    return { notifications: [] }
  }
  return result.data
}

export function saveReadState(readIds: string[]): boolean {
  if (typeof window === "undefined") return false
  try {
    const validIds = readIds.filter((id) => notificationIdSchema.safeParse(id).success).slice(0, 100)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(validIds))
    return true
  } catch (error) {
    clientLogger.error("notification.persist.failed", error)
    return false
  }
}

export function loadReadState(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is string => typeof item === "string" && notificationIdSchema.safeParse(item).success).slice(0, 100)
  } catch (error) {
    clientLogger.error("notification.load.failed", error)
    return []
  }
}

export type NotificationReference = Pick<Notification, "id">
