/**
 * Posisi node dan polyline edge hasil dagre untuk Code Dependency Graph.
 *
 * API yang dipakai sudah diverifikasi terhadap
 * `node_modules/@dagrejs/dagre/dist/types/index.d.ts` (v3.1.1; paket
 * `"type": "module"` dengan build ESM + CJS dan types sendiri di
 * `./dist/types/index.d.ts`, jadi `@types/dagre` tidak diperlukan):
 *
 * - `import dagre from "@dagrejs/dagre"` — ada default export.
 * - `dagre.graphlib.Graph` — construct signature generik
 *   `new <G, N, E>(opts?: any) => Graph`, jadi kita mengoper `GraphLabel`,
 *   `NodeLabel`, dan `EdgeLabel`; tanpa itu `g.node(id)` akan bertipe `any`.
 * - `g.setGraph(label)`, `g.setDefaultEdgeLabel(label)`, `g.setNode(id, label)`,
 *   `g.setEdge(v, w)`, `g.hasNode(id)`, `g.edge(v, w)`, `dagre.layout(g)`.
 *
 * `dagre.layout` cukup mahal (network-simplex), jadi memoization SENGAJA
 * TIDAK dilakukan di sini. Yang punya cache adalah pemanggil, supaya
 * `useMemo` bisa memakai `nodes`/`edges`/`direction` sebagai dependency.
 */

import dagre from "@dagrejs/dagre";
import type {
  EdgeLabel,
  Graph as DagreGraph,
  GraphLabel,
  NodeLabel,
} from "@dagrejs/dagre";

import type { GraphEdge, GraphNode } from "@/features/code-graph/types";

/** Lebar node dalam koordinat layout dagre, sebelum zoom/fitView. */
export const NODE_WIDTH = 240;
/** Tinggi node; cukup untuk dua baris label plus metadata. */
export const NODE_HEIGHT = 76;

/** Arah rank dagre. Default `LR` supaya dependensi mengalir kiri ke kanan. */
export type LayoutDirection = "TB" | "BT" | "LR" | "RL";

const RANK_SEP = 90;
const NODE_SEP = 28;
const EDGE_SEP = 12;
const MARGIN_X = 32;
const MARGIN_Y = 32;
const GRID_GAP_X = 40;
const GRID_GAP_Y = 40;

const LAYOUT_OPTIONS: GraphLabel = {
  ranksep: RANK_SEP,
  nodesep: NODE_SEP,
  edgesep: EDGE_SEP,
  marginx: MARGIN_X,
  marginy: MARGIN_Y,
  acyclicer: "greedy",
  ranker: "network-simplex",
};

export interface LayoutPoint {
  x: number;
  y: number;
}

export interface LaidOutNode {
  /** Sama dengan `GraphNode.id`. */
  id: string;
  /** Titik kiri atas node, sesuai kontrak React Flow (`position` top-left). */
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Edge hasil layout. Extends `GraphEdge` (bukan compose) supaya nilai ini
 * bisa langsung dikirim ke fungsi yang menerima `GraphEdge` tanpa menyalin
 * ulang field-nya.
 */
export interface LaidOutEdge extends GraphEdge {
  /**
   * Polyline antar node. `[]` bila edge dilewati karena salah satu ujungnya
   * tidak ada di `nodes`; consumer wajib menganggap edge ini tidak bisa
   * dirender.
   */
  points: LayoutPoint[];
}

export interface GraphLayout {
  nodes: LaidOutNode[];
  edges: LaidOutEdge[];
  /** Bounding box seluruh layout, untuk `fitView` awal. */
  width: number;
  height: number;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function readPoints(label: EdgeLabel | undefined): LayoutPoint[] {
  const raw = label?.points;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((point) => isFiniteNumber(point.x) && isFiniteNumber(point.y))
    .map((point) => ({ x: point.x, y: point.y }));
}

function gridPosition(index: number, total: number): LayoutPoint {
  const columns = Math.max(1, Math.ceil(Math.sqrt(total)));
  return {
    x: MARGIN_X + (index % columns) * (NODE_WIDTH + GRID_GAP_X),
    y: MARGIN_Y + Math.floor(index / columns) * (NODE_HEIGHT + GRID_GAP_Y),
  };
}

function toLaidOutEdge(edge: GraphEdge, points: LayoutPoint[]): LaidOutEdge {
  return {
    ...edge,
    // `GraphEdge.boundaryViolation` opsional; di layout selalu diseragamkan
    // jadi boolean supaya consumer tidak perlu mengecek `undefined`.
    boundaryViolation: edge.boundaryViolation === true,
    points,
  };
}

/**
 * Fallback deterministik kalau dagre melempar error, mis. graph rusak setelah
 * penyaringan node. Mengembalikan grid sederhana supaya halaman tetap
 * menampilkan sesuatu, bukan crash saat render.
 */
function gridFallback(
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
): GraphLayout {
  const known = new Set(nodes.map((node) => node.id));
  const laidOutNodes: LaidOutNode[] = nodes.map((node, index) => {
    const position = gridPosition(index, nodes.length);
    return {
      id: node.id,
      x: position.x,
      y: position.y,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    };
  });
  const columns = Math.max(1, Math.ceil(Math.sqrt(nodes.length)));
  return {
    nodes: laidOutNodes,
    edges: edges
      .filter((edge) => known.has(edge.source) && known.has(edge.target))
      .map((edge) => toLaidOutEdge(edge, [])),
    width: MARGIN_X * 2 + columns * (NODE_WIDTH + GRID_GAP_X),
    height:
      MARGIN_Y * 2 +
      Math.ceil(nodes.length / columns) * (NODE_HEIGHT + GRID_GAP_Y),
  };
}

/**
 * Hitung layout graph dependensi.
 *
 * Tidak pernah melempar error, karena dipanggil dari jalur render:
 * - edge yang menunjuk node di luar `nodes` dilewati (tetap dikembalikan
 *   dengan `points: []` supaya consumer bisa membedakan "tidak bisa dirender"
 *   dari "tidak ada edge"),
 * - node tanpa koordinat hasil layout diparkir di slot grid, bukan di `NaN`,
 * - kegagalan `dagre.layout` ditangkap dan diganti fallback grid.
 */
export function layoutGraph(
  nodes: readonly GraphNode[],
  edges: readonly GraphEdge[],
  direction: LayoutDirection = "LR",
): GraphLayout {
  if (nodes.length === 0) {
    return { nodes: [], edges: [], width: 0, height: 0 };
  }

  const known = new Set<string>();
  const graph = new dagre.graphlib.Graph<GraphLabel, NodeLabel, EdgeLabel>();
  graph.setDefaultEdgeLabel({ weight: 1 });
  graph.setGraph({ ...LAYOUT_OPTIONS, rankdir: direction });

  for (const node of nodes) {
    known.add(node.id);
    graph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }

  // Graph dibuat tanpa multigraph, jadi edge duplikat di-collapse menjadi satu.
  // Itu tidak masalah: yang penting kedua ujungnya tetap ada supaya posisinya
  // ikut dihitung.
  for (const edge of edges) {
    if (!known.has(edge.source) || !known.has(edge.target)) continue;
    graph.setEdge(edge.source, edge.target);
  }

  let laid: DagreGraph<GraphLabel, NodeLabel, EdgeLabel>;
  try {
    laid = dagre.layout(graph);
  } catch (error) {
    console.error(
      "[code-graph] layout dagre gagal, memakai fallback grid",
      error instanceof Error ? error.message : error,
    );
    return gridFallback(nodes, edges);
  }

  const laidOutNodes: LaidOutNode[] = [];
  let width = 0;
  let height = 0;

  nodes.forEach((node, index) => {
    const label = graph.hasNode(node.id) ? laid.node(node.id) : undefined;
    const x = label?.x;
    const y = label?.y;

    // `graphlib` bisa mengembalikan `undefined` untuk node yang tidak ada
    // meski tipenya `NodeLabel`, jadi dicek dengan `isFiniteNumber` dan bukan
    // hanya `label == null`.
    if (!isFiniteNumber(x) || !isFiniteNumber(y)) {
      const position = gridPosition(index, nodes.length);
      laidOutNodes.push({
        id: node.id,
        x: position.x,
        y: position.y,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      });
      return;
    }

    laidOutNodes.push({
      id: node.id,
      x: x - NODE_WIDTH / 2,
      y: y - NODE_HEIGHT / 2,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    });
    width = Math.max(width, x + NODE_WIDTH / 2 + MARGIN_X);
    height = Math.max(height, y + NODE_HEIGHT / 2 + MARGIN_Y);
  });

  const box = laid.graph();
  if (isFiniteNumber(box.width)) width = Math.max(width, box.width);
  if (isFiniteNumber(box.height)) height = Math.max(height, box.height);

  return {
    nodes: laidOutNodes,
    edges: edges.map((edge) => {
      if (!known.has(edge.source) || !known.has(edge.target)) {
        return toLaidOutEdge(edge, []);
      }
      return toLaidOutEdge(
        edge,
        readPoints(laid.edge(edge.source, edge.target)),
      );
    }),
    width,
    height,
  };
}
