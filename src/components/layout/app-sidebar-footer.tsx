"use client"

import { CircleUserRound } from "lucide-react"

import {
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function AppSidebarFooter() {
  return (
    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            size="lg"
            disabled
            tooltip="Pengguna (segera)"
          >
            <CircleUserRound aria-hidden="true" />
            <span className="truncate">Pengguna</span>
            <span className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
              Segera
            </span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarFooter>
  )
}
