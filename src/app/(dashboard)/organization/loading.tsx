import { PageShell } from "@/components/layout/page-shell";
import { ORGANIZATION_COPY } from "@/config/organization";
import { OrgChartSkeleton } from "@/features/organization/components/org-chart-skeleton";

/**
 * Skeleton route. Heading dan struktur kartunya sengaja sama dengan
 * `page.tsx` supaya tidak ada loncatan layout saat Server Component selesai
 * membaca data. Isi kanvas memakai `OrgChartSkeleton` yang sama dengan
 * placeholder `dynamic()` di `org-chart-lazy.tsx`.
 */
export default function OrganizationLoading() {
  return (
    <PageShell
      title={ORGANIZATION_COPY.title}
      description={ORGANIZATION_COPY.description}
    >
      <div role="status" aria-label={ORGANIZATION_COPY.chartTitle}>
        <span className="sr-only">{ORGANIZATION_COPY.chartTitle}</span>
        <OrgChartSkeleton />
      </div>
    </PageShell>
  );
}
