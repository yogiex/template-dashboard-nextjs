"use client"

import dynamic from "next/dynamic"

import { Skeleton } from "@/components/ui/skeleton"
import type { CodeGraphData } from "@/features/code-graph/types"

/**
 * Kolom, lebar sidebar, dan tinggi kanvas sengaja diduplikasi dari
 * `code-graph-canvas.tsx`. Menarik konstanta itu lewat import statis akan menarik
 * modul kanvas (dan `@xyflow/react`) ke initial bundle, yang justru dibatalkan
 * oleh `dynamic` di bawah.
 */
const GRID_CLASS = "grid w-full gap-4 lg:grid-cols-[13.75rem_minmax(0,1fr)]"
const SIDEBAR_CLASS = "h-64 w-full rounded-xl lg:w-55"
const CANVAS_CLASS = "h-[calc(100svh-13rem)] min-h-[520px] w-full rounded-xl"

const CodeGraphCanvas = dynamic(
  () =>
    import("@/features/code-graph/components/code-graph-canvas").then(
      (module) => module.CodeGraphCanvas
    ),
  {
    ssr: false,
    loading: () => (
      <div className={GRID_CLASS} aria-hidden="true">
        <Skeleton className={SIDEBAR_CLASS} />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className={CANVAS_CLASS} />
        </div>
      </div>
    ),
  }
)

export type CodeGraphProps = {
  data: CodeGraphData
}

export function CodeGraph({ data }: CodeGraphProps) {
  return <CodeGraphCanvas data={data} />
}
