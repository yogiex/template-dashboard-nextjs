"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "cn";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ORGANIZATION_FORMAT } from "@/config/organization";
import {
  NODE_HEIGHT,
  NODE_WIDTH,
  type OrgNode as OrgFlowNode,
} from "@/features/organization/lib/transform";

/**
 * `OrgFlowNode` adalah `Node<Employee, "org">` dari `lib/transform.ts`, jadi
 * `NodeProps`-nya sudah membawa `sourcePosition`/`targetPosition` yang diisi
 * React Flow. Komponen ini menerima `NodeProps` penuh supaya bisa langsung
 * masuk ke `nodeTypes` tanpa casting di sisi canvas.
 */
export type OrgNodeProps = NodeProps<OrgFlowNode>;

const HANDLE_CLASS =
  "size-2.5 rounded-full border border-border bg-card transition-colors";

const NUMBER_FORMAT = new Intl.NumberFormat(ORGANIZATION_FORMAT.numberLocale);

function formatCount(template: string, count: number): string {
  return template.replace("{count}", NUMBER_FORMAT.format(count));
}

/**
 * Kartu node org chart: avatar, nama, jabatan, badge departemen, dan jumlah
 * laporan langsung.
 *
 * Arah diagram (TB atau LR) tidak diputuskan di sini dan tidak butuh prop
 * baru. Node hanya membaca `sourcePosition`/`targetPosition` yang sudah
 * diisi React Flow, dengan fallback `Bottom`/`Top` sesuai default React Flow
 * untuk mode vertikal. Canvas yang memegang state `direction` menulis kedua
 * field itu ke node saat arah berubah, sehingga mode LR cukup berpindah dari
 * `Bottom`/`Top` ke `Right`/`Left` tanpa menyentuh komponen ini.
 */
function OrgNodeComponent({
  data,
  selected,
  sourcePosition,
  targetPosition,
}: OrgNodeProps) {
  const targetSide = targetPosition ?? Position.Top;
  const sourceSide = sourcePosition ?? Position.Bottom;

  return (
    <div
      data-slot="org-node"
      data-selected={selected ? "true" : "false"}
      style={{ width: NODE_WIDTH, height: NODE_HEIGHT }}
      className={cn(
        "nodrag flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2 text-left shadow-sm transition-shadow",
        selected && "border-primary ring-2 ring-primary/40",
      )}
    >
      <Handle type="target" position={targetSide} className={HANDLE_CLASS} />
      <Handle type="source" position={sourceSide} className={HANDLE_CLASS} />

      <Avatar
        name={data.name}
        src={data.avatarUrl}
        size="sm"
        className="border border-border"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-sm font-medium text-foreground" title={data.name}>
          {data.name}
        </p>
        <p className="truncate text-xs text-muted-foreground" title={data.role}>
          {data.role}
        </p>
        <div className="mt-0.5 flex items-center gap-1.5">
          <Badge variant="secondary" className="h-4 px-1.5 text-xs">
            {data.department}
          </Badge>
          <span className="truncate text-xs text-muted-foreground tabular-nums">
            {formatCount(ORGANIZATION_FORMAT.directReportsTemplate, data.directReports)}
          </span>
        </div>
      </div>
    </div>
  );
}

export const OrgNode = memo(OrgNodeComponent);

OrgNode.displayName = "OrgNode";
