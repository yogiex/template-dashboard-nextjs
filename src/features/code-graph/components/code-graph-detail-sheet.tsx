"use client"

import { useMemo } from "react"
import { cn } from "cn"

import { codeGraphConfig } from "@/config/code-graph"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  BOUNDARY_DOT_CLASS,
  categoryColor,
  withAlpha,
} from "@/features/code-graph/lib/color"
import type { CodeGraphData, GraphNode } from "@/features/code-graph/types"

export type CodeGraphDetailSheetProps = {
  node: GraphNode | null
  data: CodeGraphData
  onClose: () => void
}

function DependencyList({
  paths,
  emptyLabel,
}: {
  paths: string[]
  emptyLabel: string
}) {
  if (paths.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>
  }

  return (
    <ul className="flex flex-col gap-1">
      {paths.map((path) => (
        <li
          key={path}
          title={path}
          className="truncate rounded-md bg-muted/50 px-2 py-1 font-mono text-xs text-foreground"
        >
          {path}
        </li>
      ))}
    </ul>
  )
}

export function CodeGraphDetailSheet({
  node,
  data,
  onClose,
}: CodeGraphDetailSheetProps) {
  const labels = useMemo(
    () => new Map(data.nodes.map((item) => [item.id, item.label])),
    [data.nodes]
  )

  const imports = useMemo(
    () =>
      node === null
        ? []
        : data.edges.filter((edge) => edge.source === node.id),
    [data.edges, node]
  )
  const importedBy = useMemo(
    () =>
      node === null
        ? []
        : data.edges.filter((edge) => edge.target === node.id),
    [data.edges, node]
  )

  const accent = node === null ? null : categoryColor(node.category)
  const { detail } = codeGraphConfig

  return (
    <Sheet
      open={node !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <SheetContent
        side="right"
        className="gap-0 overflow-y-auto sm:max-w-md"
      >
        {node === null || accent === null ? null : (
          <>
            <SheetHeader>
              <SheetTitle className="flex flex-wrap items-center gap-2">
                {node.label}
                <Badge
                  variant="secondary"
                  style={{
                    backgroundColor: withAlpha(accent, 0.14),
                    color: accent,
                  }}
                >
                  {node.category}
                </Badge>
              </SheetTitle>
              <SheetDescription className="truncate font-mono text-xs">
                {node.id}
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-4 px-4 pb-4">
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted-foreground">
                  {detail.rows.boundary}
                </dt>
                <dd className="flex items-center gap-2">
                  <span
                    role="img"
                    title={codeGraphConfig.boundaryLabels[node.boundary]}
                    aria-label={codeGraphConfig.boundaryLabels[node.boundary]}
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      BOUNDARY_DOT_CLASS[node.boundary]
                    )}
                  />
                  <span>{codeGraphConfig.boundaryLabels[node.boundary]}</span>
                </dd>

                <dt className="text-muted-foreground">{detail.rows.type}</dt>
                <dd>{codeGraphConfig.nodeTypeLabels[node.type]}</dd>

                <dt className="text-muted-foreground">
                  {detail.rows.imports}
                </dt>
                <dd className="tabular-nums">{imports.length}</dd>

                <dt className="text-muted-foreground">
                  {detail.rows.importedBy}
                </dt>
                <dd className="tabular-nums">{importedBy.length}</dd>
              </dl>

              <section className="flex flex-col gap-2">
                <h3 className="text-sm font-medium text-foreground">
                  {detail.sections.imports}
                </h3>
                <DependencyList
                  paths={imports.map(
                    (edge) => labels.get(edge.target) ?? edge.target
                  )}
                  emptyLabel={detail.emptyImports}
                />
              </section>

              <section className="flex flex-col gap-2">
                <h3 className="text-sm font-medium text-foreground">
                  {detail.sections.importedBy}
                </h3>
                <DependencyList
                  paths={importedBy.map(
                    (edge) => labels.get(edge.source) ?? edge.source
                  )}
                  emptyLabel={detail.emptyImportedBy}
                />
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
