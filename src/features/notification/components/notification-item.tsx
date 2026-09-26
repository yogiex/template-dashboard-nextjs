"use client"

import Link from "next/link"
import { AlertTriangle, CheckCircle2, Circle, Info, XCircle, type LucideIcon } from "lucide-react"

import type { Notification, NotificationType } from "@/features/notification/schema"
import { cn } from "cn"

type NotificationItemProps = {
  notification: Notification
  onMarkAsRead: (id: string) => void
}

const TYPE_ICON: Record<NotificationType, LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
}

const TYPE_CLASS: Record<NotificationType, string> = {
  info: "text-blue-500",
  success: "text-emerald-500",
  warning: "text-amber-500",
  error: "text-destructive",
}

export function NotificationItem({ notification, onMarkAsRead }: NotificationItemProps) {
  const Icon = TYPE_ICON[notification.type]
  const content = (
    <div className="flex items-start gap-3 px-4 py-3">
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", TYPE_CLASS[notification.type])} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm", !notification.isRead && "font-medium")}>
          {notification.title}
          {!notification.isRead ? <Circle className="mb-1 ml-1 inline h-1.5 w-1.5 fill-primary text-primary" aria-label="Belum dibaca" /> : null}
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{notification.description}</p>
      </div>
    </div>
  )

  if (notification.href) {
    return (
      <li className="border-b last:border-b-0">
        <Link href={notification.href} onClick={() => onMarkAsRead(notification.id)} className="block transition-colors hover:bg-accent">
          {content}
        </Link>
      </li>
    )
  }

  return (
    <li className="border-b last:border-b-0">
      <button type="button" onClick={() => onMarkAsRead(notification.id)} className="block w-full text-left transition-colors hover:bg-accent">
        {content}
      </button>
    </li>
  )
}
