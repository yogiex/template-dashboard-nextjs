"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useReactFlow,
  type Edge,
  type NodeMouseHandler,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { cn } from "cn";

import { ORGANIZATION_COPY } from "@/config/organization";
import { OrgNode as OrgNodeView } from "@/features/organization/components/org-node";
import {
  ORG_NODE_TYPE,
  type OrgNode as OrgFlowNode,
} from "@/features/organization/lib/transform";

/**
 * Permukaan React Flow untuk org chart.
 *
 * Canvas ini murni presentasi: node dan edge sudah dihitung di parent
 * (`treeToFlow` + `layoutWithDagre`, satu kali per perubahan input), jadi
 * `layoutWithDagre` tidak pernah dipanggil di sini. Tugas canvas hanya:
 * menulis arah handle ke node, menandai node terpilih, merespons klik, dan
 * menjalankan `fitView` saat diminta.
 */

export interface OrgChartCanvasProps {
  nodes: OrgFlowNode[];
  edges: Edge[];
  direction: "TB" | "LR";
  selectedId: string | null;
  onNodeClick: (id: string) => void;
  /** Membuka detail sheet; klik tunggal hanya seleksi. */
  onNodeDoubleClick: (id: string) => void;
  /** Naik setiap kali toolbar meminta "pas ke layar". */
  fitViewSignal: number;
  className?: string;
  emptyState?: ReactNode;
}

/**
 * `nodeTypes` harus identitas yang sama di semua render. Object literal di
 * dalam komponen akan membuat React Flow menganggap tipe node berubah dan
 * me-remount semua node tiap render, jadi pemetaannya dinaikkan ke level modul.
 */
const NODE_TYPES: NodeTypes = { [ORG_NODE_TYPE]: OrgNodeView };

const POSITIONS = {
  TB: { source: Position.Bottom, target: Position.Top },
  LR: { source: Position.Right, target: Position.Left },
} as const;

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 1.5;
const FIT_VIEW_OPTIONS = { padding: 0.2, maxZoom: 1 };
const FIT_VIEW_OPTIONS_ANIMATED = { ...FIT_VIEW_OPTIONS, duration: 300 };
const REVEAL_OPTIONS = { padding: 0.6, maxZoom: 1, duration: 300 };
const CANVAS_CLASS =
  "h-[calc(100svh-16rem)] min-h-[520px] w-full overflow-hidden rounded-xl border border-border bg-card";

export function OrgChartCanvas(props: OrgChartCanvasProps): ReactElement {
  return (
    <ReactFlowProvider>
      <OrgChartCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

function OrgChartCanvasInner({
  nodes,
  edges,
  direction,
  selectedId,
  onNodeClick,
  onNodeDoubleClick,
  fitViewSignal,
  className,
  emptyState,
}: OrgChartCanvasProps): ReactElement {
  const { fitView } = useReactFlow<OrgFlowNode, Edge>();
  const nodesInitialized = useNodesInitialized();
  const pendingFitViewRef = useRef(false);
  const lastFitViewSignalRef = useRef(fitViewSignal);
  const clickedIdRef = useRef<string | null>(null);
  const revealedIdRef = useRef<string | null>(null);

  const flowNodes = useMemo(() => {
    const handles = POSITIONS[direction];

    return nodes.map((node) => {
      const selected = node.id === selectedId;

      if (
        node.sourcePosition === handles.source &&
        node.targetPosition === handles.target &&
        node.selected === selected
      ) {
        return node;
      }

      return {
        ...node,
        sourcePosition: handles.source,
        targetPosition: handles.target,
        selected,
      };
    });
  }, [direction, nodes, selectedId]);

  const handleNodeClick = useCallback<NodeMouseHandler<OrgFlowNode>>(
    (_event, node) => {
      clickedIdRef.current = node.id;
      // Memindahkan kamera bukan tugas klik; pilihan berikutnya dari sheet
      // detail tetap boleh memusatkan lagi.
      revealedIdRef.current = null;
      onNodeClick(node.id);
    },
    [onNodeClick],
  );

  const handleNodeDoubleClick = useCallback<NodeMouseHandler<OrgFlowNode>>(
    (_event, node) => {
      clickedIdRef.current = node.id;
      revealedIdRef.current = null;
      onNodeDoubleClick(node.id);
    },
    [onNodeDoubleClick],
  );

  const minimapNodeColor = useCallback(
    (node: OrgFlowNode) =>
      node.id === selectedId ? "var(--primary)" : "var(--muted-foreground)",
    [selectedId],
  );

  // Sinyal "pas ke layar" dari toolbar: effectorannya baru benar setelah node
  // selesai diukur React Flow.
  useEffect(() => {
    if (lastFitViewSignalRef.current === fitViewSignal) {
      return;
    }

    lastFitViewSignalRef.current = fitViewSignal;
    pendingFitViewRef.current = true;
  }, [fitViewSignal]);

  useEffect(() => {
    if (!pendingFitViewRef.current || !nodesInitialized || flowNodes.length === 0) {
      return;
    }

    pendingFitViewRef.current = false;
    void fitView(FIT_VIEW_OPTIONS_ANIMATED);
  }, [fitView, flowNodes.length, nodesInitialized]);

  /**
   * Fokus yang datang dari detail sheet atau reset layout memusatkan kamera ke
   * node terpilih. Klik pada kartu tidak menggeser kamera, jadi id yang
   * terakhir diklik dilewati sekali. Node yang tidak ada di daftar node yang
   * sedang digambar (misalnya habis terfilter) dilewati tanpa error.
   */
  useEffect(() => {
    if (selectedId === null) {
      return;
    }

    if (clickedIdRef.current === selectedId) {
      clickedIdRef.current = null;

      return;
    }

    if (revealedIdRef.current === selectedId || !nodesInitialized) {
      return;
    }

    if (!flowNodes.some((node) => node.id === selectedId)) {
      return;
    }

    revealedIdRef.current = selectedId;
    void fitView({ ...REVEAL_OPTIONS, nodes: [{ id: selectedId }] });
  }, [fitView, flowNodes, nodesInitialized, selectedId]);

  const isEmpty = nodes.length === 0;

  return (
    <div
      className={cn("flex flex-col gap-2", className)}
      data-slot="org-chart-canvas"
    >
      {isEmpty && emptyState ? (
        emptyState
      ) : (
        <div
          className={CANVAS_CLASS}
          role="application"
          aria-label={ORGANIZATION_COPY.chartTitle}
        >
          <ReactFlow<OrgFlowNode, Edge>
            nodes={flowNodes}
            edges={edges}
            nodeTypes={NODE_TYPES}
            onNodeClick={handleNodeClick}
            onNodeDoubleClick={handleNodeDoubleClick}
            fitView
            fitViewOptions={FIT_VIEW_OPTIONS}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            nodesDraggable={false}
            nodesConnectable={false}
            nodesFocusable
            elementsSelectable
            className="bg-card"
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={18}
              size={1}
              patternClassName="fill-muted-foreground/40"
            />
            <MiniMap pannable zoomable nodeColor={minimapNodeColor} />
            <Controls position="top-left" orientation="horizontal" />
          </ReactFlow>
        </div>
      )}
    </div>
  );
}
