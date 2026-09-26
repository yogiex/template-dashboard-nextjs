"use client"

import { BellOff, CheckCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { NotificationItem } from "@/features/notification/components/notification-item"
import type { Notification } from "@/features/notification/schema"
import { cn } from "cn"

export type NotificationListProps = {
  notifications: readonly Notification[]
  unreadCount: number
  isLoaded: boolean
  onMarkAll: () => void
  onMarkAsRead: (id: string) => void
  className?: string
}

export function NotificationList({ notifications, unreadCount, isLoaded, onMarkAll, onMarkAsRead, className }: NotificationListProps) {
  return (
    <section aria-label="Notifikasi" aria-busy={!isLoaded} className={cn("overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10", className)}>
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <p className="text-xs text-muted-foreground">{isLoaded && unreadCount > 0 ? `${unreadCount} belum dibaca` : isLoaded ? "Semua terbaca" : "Memuat..."}</p>
        <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={onMarkAll} disabled={!isLoaded || unreadCount === 0} aria-label="Tandai semua notifikasi sebagai sudah dibaca">
          <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Tandai semua
        </Button>
      </div>
      {!isLoaded ? (
        <div role="status" aria-label="Memuat notifikasi">
          <span className="sr-only">Memuat notifikasi</span>
          {Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="m-3 h-14 w-[calc(100%-1.5rem)]" />)}
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
          <BellOff className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
          <p className="text-sm font-medium">Tidak ada notifikasi</p>
          <p className="text-xs text-muted-foreground">Notifikasi akan tampil di sini.</p>
        </div>
      ) : (
        <ul className="max-h-80 overflow-y-auto" aria-label="Daftar notifikasi">
          {notifications.map((notification) => <NotificationItem key={notification.id} notification={notification} onMarkAsRead={onMarkAsRead} />)}
        </ul>
      )}
    </section>
  )
}
