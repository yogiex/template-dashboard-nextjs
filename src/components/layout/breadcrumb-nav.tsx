"use client"

import { useMemo } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { sidebarNav } from "@/config/site"
import { parseBreadcrumb } from "@/lib/parse-breadcrumb"

const sidebarItems = sidebarNav.flatMap((group) => group.items)

export function BreadcrumbNav() {
  const pathname = usePathname()
  const breadcrumbs = useMemo(
    () => parseBreadcrumb(pathname, sidebarItems),
    [pathname]
  )

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((item, index) => {
          const isCurrent = index === breadcrumbs.length - 1

          return (
            <BreadcrumbItem key={item.href}>
              {isCurrent ? (
                <BreadcrumbPage aria-current="page">{item.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink render={<Link href={item.href} />}>
                  {item.label}
                </BreadcrumbLink>
              )}
              {!isCurrent ? <BreadcrumbSeparator /> : null}
            </BreadcrumbItem>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
