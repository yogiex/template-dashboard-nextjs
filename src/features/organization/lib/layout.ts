import {
  layout as dagreLayout,
  Graph,
  type EdgeLabel,
  type GraphLabel,
  type NodeLabel,
} from "@dagrejs/dagre";
import type { Edge } from "@xyflow/react";

import { NODE_HEIGHT, NODE_WIDTH, type OrgNode } from "./transform";

/**
 * Posisi node dihitung dengan dagre. Fungsi ini satu-satunya tempat yang
 * memanggil `dagre.layout()` dan dipanggil tepat satu kali per perhitungan.
 *
 * Catatan React Flow v12: `positionAbsolute` milik node internal hasil
 * perhitungan React Flow, jadi tidak boleh diisi di sini. Node yang
 * dikembalikan tetap node publik: `position` diisi koordinat kiri-atas
 * (dagre memberi titik tengah, dikurangi setengah lebar/tinggi) plus
 * `width`/`height`/`measured` agar React Flow tidak perlu mengukur ulang
 * sebelum render.
 */

const NODE_SEPARATION = 32;
const RANK_SEPARATION = 72;

function nodeWidth(node: OrgNode): number {
  return node.measured?.width ?? node.width ?? NODE_WIDTH;
}

function nodeHeight(node: OrgNode): number {
  return node.measured?.height ?? node.height ?? NODE_HEIGHT;
}

export function layoutWithDagre(
  nodes: OrgNode[],
  edges: Edge[],
  direction: "TB" | "LR" = "TB",
): OrgNode[] {
  if (nodes.length === 0) {
    return [];
  }

  try {
    const graph = new Graph<GraphLabel, NodeLabel, EdgeLabel>({
      directed: true,
      multigraph: true,
      compound: false,
    });

    graph.setGraph({
      rankdir: direction,
      nodesep: NODE_SEPARATION,
      ranksep: RANK_SEPARATION,
      marginx: 0,
      marginy: 0,
    });
    graph.setDefaultEdgeLabel({ minlen: 1, weight: 1 });

    for (const node of nodes) {
      graph.setNode(node.id, { width: nodeWidth(node), height: nodeHeight(node) });
    }

    for (const edge of edges) {
      // Edge yang menunjuk node tak dikenal (data tidak konsisten) dilewati.
      if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
        graph.setEdge(edge.source, edge.target);
      }
    }

    dagreLayout(graph);

    return nodes.map((node) => {
      const placed = graph.node(node.id);
      const width = nodeWidth(node);
      const height = nodeHeight(node);
      const centerX = placed.x ?? 0;
      const centerY = placed.y ?? 0;

      return {
        ...node,
        position: { x: centerX - width / 2, y: centerY - height / 2 },
        width,
        height,
        measured: { width, height },
      };
    });
  } catch {
    // Fallback: kembalikan node apa adanya supaya UI tetap tampil (misalnya
    // sebagai daftar) alih-alih halaman kosong.
    return nodes;
  }
}
