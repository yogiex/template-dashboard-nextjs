"use client"

import { useState } from "react"
import { Menu } from "@base-ui/react/menu"
import { Bell } from "lucide-react"

import { Button } from "@/components/ui/button"
import { NotificationList } from "@/features/notification/components/notification-list"
import { useNotifications } from "@/features/notification/hooks/use-notifications"

export function NotificationButton() {
  const [open, setOpen] = useState(false)
  const { notifications, unreadCount, isLoaded, markAsRead, markAllAsRead } = useNotifications()

  return (
    <Menu.Root open={open} onOpenChange={setOpen}>
      <Menu.Trigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={
              unreadCount > 0 ? `Notifikasi, ${unreadCount} belum dibaca` : "Notifikasi"
            }
            className="relative"
          />
        }
      >
        <Bell aria-hidden="true" />
        {unreadCount > 0 ? (
          <span
            className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-4 font-medium text-destructive-foreground"
            aria-hidden="true"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={8}>
          <Menu.Popup className="z-50 w-88 max-w-[calc(100vw-2rem)]">
            <NotificationList
              notifications={notifications}
              isLoaded={isLoaded}
              unreadCount={unreadCount}
              onMarkAll={markAllAsRead}
              onMarkAsRead={markAsRead}
            />
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
