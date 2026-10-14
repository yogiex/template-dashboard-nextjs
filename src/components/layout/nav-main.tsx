"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import type { NavGroup } from "@/config/site"

type NavMainProps = {
  items: NavGroup[]
}

export function NavMain({ items }: NavMainProps) {
  const pathname = usePathname()
  // Drawer mobile harus ditutup setelah navigasi. Sheet-nya modal, jadi kalau
  // dibiarkan terbuka drawer menutupi halaman tujuan dan focus tetap terjebak
  // di dalamnya sampai pengguna menutupnya manual. `setOpenMobile` no-op di
  // desktop, jadi tidak perlu branching `isMobile` di sini.
  const { setOpenMobile } = useSidebar()

  return (
    <>
      {items.map((group) => (
        <SidebarGroup key={group.title}>
          <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`)
                const link = (
                  <SidebarMenuButton
                    isActive={isActive}
                    disabled={item.disabled}
                    aria-current={isActive ? "page" : undefined}
                    tooltip={item.title}
                    onClick={() => setOpenMobile(false)}
                    render={
                      item.disabled ? undefined : <Link href={item.href} />
                    }
                  >
                    <item.icon aria-hidden="true" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                )

                return (
                  <SidebarMenuItem key={item.href}>
                    {link}
                    {item.badge ? (
                      <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
                    ) : null}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  )
}
