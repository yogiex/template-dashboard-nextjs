"use client"

import { useMemo } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "cn"

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

  // Breadcrumb adalah satu-satunya bagian header yang lebarnya mengikuti
  // kedalaman route. Tiga crumb sudah bisa melewati ruang yang tersisa di
  // viewport 375px, dan `BreadcrumbList` adalah `flex flex-wrap` di dalam
  // header `h-14` tanpa `overflow-hidden` — hasilnya wrap keluar dari kotak
  // header, bukan terpotong rapi. Label di-truncate dan crumb tengah disembunyikan
  // di layar sempit; crumb terakhir (halaman aktif) selalu tampil.
  const isNarrow = breadcrumbs.length > 1

  return (
    <Breadcrumb>
      <BreadcrumbList className="min-w-0">
        {breadcrumbs.map((item, index) => {
          const isCurrent = index === breadcrumbs.length - 1
          const isMiddle = !isCurrent && index > 0

          return (
            <BreadcrumbItem key={item.href} className={cn(isMiddle && isNarrow && "hidden sm:flex")}>
              {isCurrent ? (
                <BreadcrumbPage aria-current="page" className="truncate">
                  {item.label}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink
                  render={<Link href={item.href} />}
                  className="truncate"
                >
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
