"use client";

import dynamic from "next/dynamic";
import type { ReactElement } from "react";

import { OrgChartSkeleton } from "@/features/organization/components/org-chart-skeleton";
import type { OrgTreeNode } from "@/features/organization/types";

/**
 * Client wrapper untuk org chart.
 *
 * `dynamic(..., { ssr: false })` hanya boleh dipakai di dalam Client
 * Component — memanggilnya langsung dari Server Component akan error
 * ("`ssr: false` is not allowed with `next/dynamic` in Server Components",
 * `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md` § Skipping
 * SSR). Karena itu file ini yang memegang `dynamic`, dan route
 * `(dashboard)/organization/page.tsx` tetap Server Component biasa yang hanya
 * mengimpor wrapper ini.
 *
 * Konsekuensinya: chart baru dirender di client, jadi bentuk data (tree
 * Serializable) yang dikirim dari server tidak pernah ikut ter-render ke HTML
 * awal, dan bundle `@xyflow/react` baru diambil saat halaman dibuka.
 */

export interface OrgChartLazyProps {
  root: OrgTreeNode;
  totalEmployees: number;
  departmentCount: number;
  levelCount: number;
  departments: string[];
}

const OrgChart = dynamic(
  () =>
    import("@/features/organization/components/org-chart").then(
      (module) => module.OrgChart
    ),
  {
    ssr: false,
    loading: () => <OrgChartSkeleton />,
  }
);

export function OrgChartLazy(props: OrgChartLazyProps): ReactElement {
  return <OrgChart {...props} />;
}
