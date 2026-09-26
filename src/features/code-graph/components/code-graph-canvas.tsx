"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesInitialized,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { Focus, ZoomIn, ZoomOut } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  codeGraphConfig,
  statusBarLabel,
} from "@/config/code-graph"
import { CodeGraphDetailSheet } from "@/features/code-graph/components/code-graph-detail-sheet"
import { CodeGraphFilters } from "@/features/code-graph/components/code-graph-filters"
import { CodeGraphNode as CodeGraphNodeView } from "@/features/code-graph/components/code-graph-node"
import { EDGE_VIOLATION_COLOR, categoryColor } from "@/features/code-graph/lib/color"
import { layoutGraph, type LaidOutEdge } from "@/features/code-graph/lib/layout"
import type { CodeGraphData, GraphEdge, GraphNode } from "@/features/code-graph/types"

const GRID_CLASS = "grid w-full gap-4 lg:grid-cols-[13.75rem_minmax(0,1fr)]"
const CANVAS_CLASS = "h-[calc(100svh-13rem)] min-h-[520px] w-full overflow-hidden rounded-xl border border-border bg-card"

/** `GraphNode` adalah interface, jadi tidak memenuhi constraint `Record<string, unknown>` milik React Flow. Interseksi ini membuatnya index-signature-compatible tanpa assertion. */
type CodeGraphNodeData = GraphNode & Record<string, unknown>
type FlowNode = Node<CodeGraphNodeData, "code">
type FlowEdge = Edge<Record<string, never>, "smoothstep">

const NODE_TYPES = { code: CodeGraphNodeView }
const PRO_OPTIONS = { hideAttribution: true }

const EDGE_STROKE_DEFAULT = "var(--border)"
const EDGE_STROKE_CROSS_FEATURE = "var(--primary)"
const EDGE_STROKE_WIDTH_DEFAULT = 1
const EDGE_STROKE_WIDTH_EMPHASIS = 2

const MIN_ZOOM = 0.2
const MAX_ZOOM = 2
const FIT_VIEW_OPTIONS = { padding: 0.2, maxZoom: 1 }
const FIT_VIEW_OPTIONS_ANIMATED = { ...FIT_VIEW_OPTIONS, duration: 200 }
const ZOOM_DURATION = { duration: 200 }

function edgeStroke(edge: LaidOutEdge): string {
  if (edge.violation) return EDGE_VIOLATION_COLOR
  if (edge.crossFeature) return EDGE_STROKE_CROSS_FEATURE
  return EDGE_STROKE_DEFAULT
}

type CodeGraphCanvasProps = {
  data: CodeGraphData
}

type FilterState = {
  search: string
  activeCategories: Set<string>
  violationsOnly: boolean
}

type VisibleGraph = {
  nodes: GraphNode[]
  edges: GraphEdge[]
  nodeIds: Set<string>
}

const EMPTY_FILTERS: FilterState = {
  search: "",
  activeCategories: new Set(),
  violationsOnly: false,
}

function computeVisible(data: CodeGraphData, filters: FilterState): VisibleGraph {
  const query = filters.search.trim().toLowerCase()
  const matches = (node: GraphNode) => {
    if (
      filters.activeCategories.size > 0 &&
      !filters.activeCategories.has(node.category)
    ) {
      return false
    }
    if (query === "") return true
    return (
      node.id.toLowerCase().includes(query) ||
      node.label.toLowerCase().includes(query)
    )
  }

  const scopedEdges = data.edges.filter(
    (edge) => !filters.violationsOnly || edge.violation
  )
  // Saat `violationsOnly` aktif, node dibatasi ke endpoint edge yang lolos filter
  // supaya graf tetap bisa dinavigasi lewat edge pelanggaran itu sendiri.
  const endpoints =
    filters.violationsOnly && scopedEdges.length > 0
      ? new Set(scopedEdges.flatMap((edge) => [edge.source, edge.target]))
      : null

  const nodes = data.nodes.filter(
    (node) => matches(node) && (endpoints === null || endpoints.has(node.id))
  )
  const nodeIds = new Set(nodes.map((node) => node.id))
  const edges = scopedEdges.filter(
    (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
  )

  return { nodes, edges, nodeIds }
}

export function CodeGraphCanvas({ data }: CodeGraphCanvasProps) {
  return (
    <ReactFlowProvider>
      <CodeGraphCanvasInner data={data} />
    </ReactFlowProvider>
  )
}

function CodeGraphCanvasInner({ data }: CodeGraphCanvasProps) {
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS)
  const [selected, setSelected] = useState<GraphNode | null>(null)

  const { fitView, zoomIn, zoomOut } = useReactFlow<FlowNode, FlowEdge>()
  const nodesInitialized = useNodesInitialized()

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([])

  const categories = useMemo(() => {
    const counts = new Map<string, number>()
    for (const node of data.nodes) {
      counts.set(node.category, (counts.get(node.category) ?? 0) + 1)
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  }, [data.nodes])

  const visible = useMemo(() => computeVisible(data, filters), [data, filters])

  const layout = useMemo(
    () => layoutGraph(visible.nodes, visible.edges, "LR"),
    [visible.nodes, visible.edges]
  )

  const flowNodes = useMemo<FlowNode[]>(() => {
    const byId = new Map(visible.nodes.map((node) => [node.id, node]))
    return layout.nodes.flatMap<FlowNode>((positioned) => {
      const graphNode = byId.get(positioned.id)
      if (graphNode === undefined) return []
      return [
        {
          id: positioned.id,
          type: "code",
          position: { x: positioned.x, y: positioned.y },
          data: { ...graphNode },
        },
      ]
    })
  }, [layout.nodes, visible.nodes])

  const flowEdges = useMemo<FlowEdge[]>(
    () =>
      layout.edges.map<FlowEdge>((edge) => {
        const stroke = edgeStroke(edge)
        const emphasized = edge.violation || edge.crossFeature
        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: "smoothstep",
          style: {
            stroke,
            strokeWidth: emphasized
              ? EDGE_STROKE_WIDTH_EMPHASIS
              : EDGE_STROKE_WIDTH_DEFAULT,
          },
          markerEnd: { type: MarkerType.ArrowClosed, color: stroke },
        }
      }),
    [layout.edges]
  )

  const pendingFit = useRef(false)
  useEffect(() => {
    // `useNodesState` hanya mengisi state awal; filter berubah berarti node/edge
    // baru (posisi hasil dagre) harus ditulis ulang, bukan di-seed sekali.
    pendingFit.current = true
    setNodes(flowNodes)
    setEdges(flowEdges)
  }, [flowNodes, flowEdges, setNodes, setEdges])

  useEffect(() => {
    if (!pendingFit.current || !nodesInitialized || nodes.length === 0) return
    pendingFit.current = false
    void fitView(FIT_VIEW_OPTIONS_ANIMATED)
  }, [nodesInitialized, nodes, fitView])

  const applyFilters = useCallback(
    (next: FilterState) => {
      setFilters(next)
      setSelected((current) => {
        if (current === null) return null
        return computeVisible(data, next).nodeIds.has(current.id)
          ? current
          : null
      })
    },
    [data]
  )

  const handleToggleCategory = useCallback(
    (category: string) => {
      const next = new Set(filters.activeCategories)
      if (!next.delete(category)) next.add(category)
      applyFilters({ ...filters, activeCategories: next })
    },
    [applyFilters, filters]
  )

  const handleClearCategories = useCallback(() => {
    applyFilters({ ...filters, activeCategories: new Set() })
  }, [applyFilters, filters])

  const handleToggleViolations = useCallback(() => {
    applyFilters({ ...filters, violationsOnly: !filters.violationsOnly })
  }, [applyFilters, filters])

  const handleSearchChange = useCallback(
    (value: string) => {
      applyFilters({ ...filters, search: value })
    },
    [applyFilters, filters]
  )

  const handleNodeClick = useCallback<NodeMouseHandler<FlowNode>>(
    (_event, node) => {
      setSelected(node.data)
    },
    []
  )

  const minimapNodeColor = useCallback(
    (node: FlowNode) => categoryColor(node.data?.category ?? ""),
    []
  )

  return (
    <div className={GRID_CLASS}>
      <CodeGraphFilters
        categories={categories}
        activeCategories={filters.activeCategories}
        onToggleCategory={handleToggleCategory}
        onClearCategories={handleClearCategories}
        search={filters.search}
        onSearchChange={handleSearchChange}
        showViolationsOnly={filters.violationsOnly}
        onToggleViolations={handleToggleViolations}
      />

      <div className="flex min-w-0 flex-col gap-2">
        <p
          role="status"
          aria-live="polite"
          className="text-sm text-muted-foreground tabular-nums"
        >
          {statusBarLabel(nodes.length, edges.length)}
        </p>

        <div className={CANVAS_CLASS}>
          <ReactFlow<FlowNode, FlowEdge>
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            nodeTypes={NODE_TYPES}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            fitView
            fitViewOptions={FIT_VIEW_OPTIONS}
            nodesConnectable={false}
            elementsSelectable
            proOptions={PRO_OPTIONS}
            aria-label={codeGraphConfig.controls.canvasLabel}
            className="bg-card"
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={18}
              size={1}
              patternClassName="fill-muted-foreground/40"
            />
            <MiniMap
              pannable
              zoomable
              ariaLabel={codeGraphConfig.controls.minimapLabel}
              nodeColor={minimapNodeColor}
            />
            <Controls position="top-left" orientation="horizontal" />
            <Panel position="bottom-left">
              <div
                className="flex items-center gap-1 rounded-lg border border-border bg-card p-1 shadow-sm"
              >
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label={codeGraphConfig.controls.zoomInLabel}
                  onClick={() => void zoomIn(ZOOM_DURATION)}
                >
                  <ZoomIn aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label={codeGraphConfig.controls.zoomOutLabel}
                  onClick={() => void zoomOut(ZOOM_DURATION)}
                >
                  <ZoomOut aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label={codeGraphConfig.controls.fitViewLabel}
                  onClick={() => void fitView(FIT_VIEW_OPTIONS_ANIMATED)}
                >
                  <Focus aria-hidden="true" />
                </Button>
              </div>
            </Panel>
            {nodes.length === 0 ? (
              <Panel position="top-center">
                <p className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
                  {codeGraphConfig.filters.noMatches}
                </p>
              </Panel>
            ) : null}
          </ReactFlow>
        </div>
      </div>

      <CodeGraphDetailSheet
        node={selected}
        data={data}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
