"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Menu } from "@base-ui/react/menu"
import { CircleUserRound, LogOut, Settings } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { logoutAction } from "@/features/auth/actions"
import { cn } from "cn"

export function UserMenu() {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  // Menu ditutup lebih dulu supaya popup tidak menggantung di atas navigasi.
  // `logoutAction()` sendiri tidak pernah menolak (selalu mengembalikan
  // envelope), tapi request tetap dibungkus `try/catch`: error boundary tidak
  // menangkap error event handler.
  const logout = async () => {
    setOpen(false)

    try {
      await logoutAction()
    } catch (error) {
      console.error("[user-menu] logout failed", error)
    }

    router.push("/login")
    router.refresh()
  }

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
            <Menu.Item disabled className="flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm opacity-50">
              <CircleUserRound className="h-4 w-4" aria-hidden="true" />
              Profil
            </Menu.Item>
            <Menu.Item disabled className="flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm opacity-50">
              <Settings className="h-4 w-4" aria-hidden="true" />
              Pengaturan
            </Menu.Item>
            <Menu.Item
              className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
              onClick={() => void logout()}
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Log out
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
