"use client"

import { memo } from "react"
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react"
import { FileCode2 } from "lucide-react"
import { cn } from "cn"

import { codeGraphConfig } from "@/config/code-graph"
import {
  BOUNDARY_DOT_CLASS,
  categoryColor,
  withAlpha,
} from "@/features/code-graph/lib/color"
import { NODE_HEIGHT, NODE_WIDTH } from "@/features/code-graph/lib/layout"
import type { GraphNode } from "@/features/code-graph/types"

// `@xyflow/react` v12 mensyaratkan `data: Record<string, unknown>`; `GraphNode`
// adalah interface jadi tidak punya index signature. Irisan di bawahemenuhinya
// tanpa assertion supaya field asli tetap punya tipe persis.
type CodeGraphNodeData = GraphNode & Record<string, unknown>

export type CodeGraphNode = Node<CodeGraphNodeData, "code">

const HANDLE_CLASS =
  "size-2.5 rounded-full border border-border bg-card transition-colors"

function CodeGraphNodeComponent({ data, selected }: NodeProps<CodeGraphNode>) {
  const accent = categoryColor(data.category)
  const boundaryLabel = codeGraphConfig.boundaryLabels[data.boundary]

  return (
    <div
      style={{ width: NODE_WIDTH, minHeight: NODE_HEIGHT, backgroundColor: withAlpha(accent, 0.08) }}
      className={cn(
        "nodrag relative flex flex-col justify-center gap-1 overflow-hidden rounded-lg border border-border bg-card px-3 py-2 text-left shadow-sm transition-shadow",
        selected && "border-primary ring-2 ring-primary/40"
      )}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-1 rounded-l-lg"
        style={{ backgroundColor: accent }}
      />

      <Handle
        type="target"
        position={Position.Left}
        className={HANDLE_CLASS}
      />
      <Handle
        type="source"
        position={Position.Right}
        className={HANDLE_CLASS}
      />

      <div className="flex items-center gap-2">
        <FileCode2
          aria-hidden="true"
          className="size-4 shrink-0"
          style={{ color: accent }}
        />
        <span
          title={data.label}
          className="truncate text-sm font-medium text-foreground"
        >
          {data.label}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span
          role="img"
          title={boundaryLabel}
          aria-label={boundaryLabel}
          className={cn("size-2 shrink-0 rounded-full", BOUNDARY_DOT_CLASS[data.boundary])}
        />
        <span
          title={data.category}
          className="truncate text-xs text-muted-foreground"
        >
          {data.category}
        </span>
      </div>
    </div>
  )
}

export const CodeGraphNode = memo(CodeGraphNodeComponent)

CodeGraphNode.displayName = "CodeGraphNode"
