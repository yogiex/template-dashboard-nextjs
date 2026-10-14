"use client"

import Link from "next/link"
import { useState } from "react"
import { Menu } from "@base-ui/react/menu"
import { CircleUserRound, LogOut, Settings } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "cn"

export function UserMenu() {
  const [open, setOpen] = useState(false)

  return (
    <Menu.Root open={open} onOpenChange={setOpen}>
      <Menu.Trigger
        aria-label="Menu pengguna"
        className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
      >
        <CircleUserRound className="h-5 w-5" aria-hidden="true" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end">
          <Menu.Popup className="z-50 min-w-48 rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
            <Menu.Item
              render={<Link href="/profile" />}
              className="flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
            >
              <CircleUserRound className="h-4 w-4" aria-hidden="true" />
              Profil
            </Menu.Item>
            <Menu.Item
              render={<Link href="/settings/general" />}
              className="flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
            >
              <Settings className="h-4 w-4" aria-hidden="true" />
              Pengaturan
            </Menu.Item>
            {/* Log out butuh Server Action untuk menghapus cookie session, dan
                itu tidak didukung static export — diparkir sampai host Node. */}
            <Menu.Item disabled className="flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm opacity-50">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Log out
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
