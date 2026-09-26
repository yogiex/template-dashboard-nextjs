"use client";

import { useMemo, type ReactElement } from "react";

import { EmptyState } from "@/components/custom/empty-state";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ORGANIZATION_COPY, ORGANIZATION_FORMAT } from "@/config/organization";
import { OrgChartCanvas } from "@/features/organization/components/org-chart-canvas";
import { OrgDetailSheet } from "@/features/organization/components/org-detail-sheet";
import { OrgToolbar } from "@/features/organization/components/org-toolbar";
import { useOrgChart } from "@/features/organization/hooks/use-org-chart";
import { layoutWithDagre } from "@/features/organization/lib/layout";
import { treeToFlow, type OrgNode } from "@/features/organization/lib/transform";
import { DEPARTMENT_ALL_VALUE } from "@/features/organization/lib/visible-tree";
import type { OrgTreeNode } from "@/features/organization/types";

/**
 * Root client org chart: toolbar + canvas + detail sheet.
 *
 * Komponen ini akan dimuat lewat `next/dynamic` dari route
 * `(dashboard)/organization`, jadi Client Component yang sudah ter-bundle
 * React Flow tidak pernah ikut masuk ke bundle Server Component halaman.
 * Ekspor hanya named `OrgChart` (tanpa default) supaya pemanggil dynamic()
 * tidak ambigu.
 */

export interface OrgChartProps {
  root: OrgTreeNode;
  totalEmployees: number;
  departmentCount: number;
  levelCount: number;
  departments: string[];
}

const NUMBER_FORMAT = new Intl.NumberFormat(ORGANIZATION_FORMAT.numberLocale);

function formatEmployeesTemplate(count: number): string {
  return ORGANIZATION_FORMAT.employeesTemplate.replace(
    "{count}",
    NUMBER_FORMAT.format(count),
  );
}

interface OrgFlowResult {
  nodes: OrgNode[];
  edges: ReturnType<typeof treeToFlow>["edges"];
}

const EMPTY_FLOW: OrgFlowResult = { nodes: [], edges: [] };

export function OrgChart({
  root,
  totalEmployees,
  departmentCount,
  levelCount,
  departments,
}: OrgChartProps): ReactElement {
  const {
    filteredTree,
    visibleCount,
    toolbarProps,
    canvasProps,
    detailSheetProps,
    onClearFilters,
    isDetailLoading,
    detailError,
  } = useOrgChart({
    root,
    departments,
    totalEmployees,
    departmentCount,
    levelCount,
  });

  /**
   * Satu-satunya tempat dagre dipanggil untuk chart ini: satu kali per
   * perubahan pohon terfilter atau arah, tidak di dalam loop render dan tidak
   * di dalam event handler. `treeToFlow` juga dipanggil tepat di sini, jadi
   * canvas hanya menerima node yang sudah berposisi.
   */
  const flow = useMemo<OrgFlowResult>(() => {
    if (filteredTree === null) {
      return EMPTY_FLOW;
    }

    const { nodes, edges } = treeToFlow(filteredTree);

    return {
      nodes: layoutWithDagre(nodes, edges, canvasProps.direction),
      edges,
    };
  }, [canvasProps.direction, filteredTree]);

  const hasFilter =
    toolbarProps.search.trim().length > 0 ||
    toolbarProps.department !== DEPARTMENT_ALL_VALUE;

  const emptyState = useMemo(
    () => (
      <EmptyState
        title={ORGANIZATION_COPY.noResultTitle}
        description={ORGANIZATION_COPY.noResultDescription}
        action={
          <Button type="button" variant="outline" onClick={onClearFilters}>
            {ORGANIZATION_COPY.clearFilterLabel}
          </Button>
        }
      />
    ),
    [onClearFilters],
  );

  return (
    <div className="flex flex-col gap-4">
      <OrgToolbar {...toolbarProps} />

      <Card aria-busy={isDetailLoading}>
        <CardHeader>
          <CardTitle>{ORGANIZATION_COPY.chartTitle}</CardTitle>
          <CardDescription>{ORGANIZATION_COPY.chartDescription}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-xs text-muted-foreground">
            {ORGANIZATION_COPY.mockDataNotice}
          </p>

          {detailError !== null ? (
            <Alert variant="destructive">
              <AlertDescription>{detailError}</AlertDescription>
            </Alert>
          ) : null}

          {hasFilter ? (
            <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
              {formatEmployeesTemplate(visibleCount)}
            </p>
          ) : null}

          <OrgChartCanvas
            {...canvasProps}
            nodes={flow.nodes}
            edges={flow.edges}
            emptyState={emptyState}
          />
        </CardContent>
      </Card>

      <OrgDetailSheet {...detailSheetProps} />
    </div>
  );
}
