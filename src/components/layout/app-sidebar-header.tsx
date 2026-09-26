"use client"

import Link from "next/link"
import { PanelsTopLeft } from "lucide-react"

import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { siteConfig } from "@/config/site"

export function AppSidebarHeader() {
  return (
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            tooltip={siteConfig.name}
            render={<Link href="/" aria-label={`${siteConfig.name} — beranda`} />}
            className="data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground"
          >
            <PanelsTopLeft aria-hidden="true" />
            <span className="truncate font-semibold">{siteConfig.name}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
  )
}
