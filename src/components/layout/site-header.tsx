import { BreadcrumbNav } from "@/components/layout/breadcrumb-nav"
import { CommandMenu } from "@/components/custom/command-menu"
import { ThemeToggle } from "@/components/custom/theme-toggle"
import { UserMenu } from "@/components/layout/user-menu"
import { NotificationButton } from "@/features/notification/components/notification-button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <SidebarTrigger
          className="-ml-1"
          aria-label="Buka atau tutup sidebar"
        />
        <Separator orientation="vertical" className="mr-1 h-4" />
        <BreadcrumbNav />
      </div>
      <div className="flex items-center gap-1">
        <CommandMenu />
        <NotificationButton />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  )
}
