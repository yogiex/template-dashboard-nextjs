"use client"

import { Sidebar, SidebarContent, SidebarRail } from "@/components/ui/sidebar"
import { sidebarNav } from "@/config/site"

import { AppSidebarFooter } from "./app-sidebar-footer"
import { AppSidebarHeader } from "./app-sidebar-header"
import { NavMain } from "./nav-main"

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <AppSidebarHeader />
      <SidebarContent>
        <NavMain items={sidebarNav} />
      </SidebarContent>
      <AppSidebarFooter />
      <SidebarRail />
    </Sidebar>
  )
}
