import type { Edge, Node } from "@xyflow/react";

import type { Employee, OrgTreeNode } from "../types";

/**
 * Konversi pohon organisasi menjadi node/edge React Flow. Modul ini murni
 * data: tidak memanggil dagre dan tidak menyentuh DOM, jadi aman dipakai di
 * client maupun server. Penempatan koordinat dilakukan `lib/layout.ts`.
 */

export const NODE_WIDTH = 220;
export const NODE_HEIGHT = 88;

/** Tipe node custom; harus sama dengan kunci di `nodeTypes` komponen. */
export const ORG_NODE_TYPE = "org";

export type OrgNode = Node<Employee, "org">;

export interface OrgFlow {
  nodes: OrgNode[];
  edges: Edge[];
}

function toNode(employee: Employee): OrgNode {
  return {
    id: employee.id,
    type: ORG_NODE_TYPE,
    // Dagre nanti menimpa posisi ini dengan koordinat terpusat.
    position: { x: 0, y: 0 },
    data: employee,
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
    measured: { width: NODE_WIDTH, height: NODE_HEIGHT },
  };
}

export function treeToFlow(tree: OrgTreeNode): OrgFlow {
  const nodes: OrgNode[] = [];
  const edges: Edge[] = [];
  // Satu karyawan hanya boleh muncul sekali walau datanya membentuk siklus.
  const visited = new Set<string>([tree.employee.id]);
  const queue: OrgTreeNode[] = [tree];

  nodes.push(toNode(tree.employee));

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current) {
      break;
    }

    for (const child of current.children) {
      if (visited.has(child.employee.id)) {
        continue;
      }

      visited.add(child.employee.id);
      nodes.push(toNode(child.employee));
      edges.push({
        id: `${current.employee.id}->${child.employee.id}`,
        source: current.employee.id,
        target: child.employee.id,
        type: "smoothstep",
      });
      queue.push(child);
    }
  }

  return { nodes, edges };
}
