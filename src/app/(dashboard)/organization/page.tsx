import { Network } from "lucide-react";
import type { Metadata } from "next";

import { EmptyState } from "@/components/custom/empty-state";
import { PageShell } from "@/components/layout/page-shell";
import { ORGANIZATION_COPY } from "@/config/organization";
import { OrgChartLazy } from "@/features/organization/components/org-chart-lazy";
import {
  countDepartments,
  countLevels,
  getOrgTree,
} from "@/features/organization/service";

export const metadata: Metadata = { title: ORGANIZATION_COPY.title };

/**
 * Route org chart.
 *
 * `PageShell` dipakai karena route ini berada di `(dashboard)/organization`,
 * di luar `(dashboard)/settings/layout.tsx` yang sudah menyediakan `<main>`.
 * Tidak ada shell ganda di sini.
 *
 * Data dibaca langsung dari DAL (`service.ts`, `server-only`) di Server
 * Component; detail karyawan tidak diambil di sini karena itu dilakukan client
 * lewat server action saat node diklik.
 *
 * `ORGANIZATION_COPY.chartTitle`, `chartDescription`, `statsTitle`, dan
 * `mockDataNotice` sengaja tidak diulang di halaman: semuanya sudah dirender
 * oleh `OrgChart` (toolbar + kartu chart), jadi mengulangnya di sini akan
 * menampilkan teks yang sama dua kali.
 */
export default function OrganizationPage() {
  const { root, totalEmployees, departments } = getOrgTree();
  const departmentCount = countDepartments(root);

  if (root === null) {
    return (
      <PageShell
        title={ORGANIZATION_COPY.title}
        description={ORGANIZATION_COPY.description}
      >
        <EmptyState
          icon={Network}
          title={ORGANIZATION_COPY.noResultTitle}
          description={ORGANIZATION_COPY.noResultDescription}
        />
      </PageShell>
    );
  }

  return (
    <PageShell
      title={ORGANIZATION_COPY.title}
      description={ORGANIZATION_COPY.description}
    >
      <OrgChartLazy
        root={root}
        totalEmployees={totalEmployees}
        departmentCount={departmentCount}
        levelCount={countLevels(root)}
        departments={departments}
      />
    </PageShell>
  );
}
