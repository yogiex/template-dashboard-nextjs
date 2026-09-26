import { Skeleton } from "@/components/ui/skeleton";

/**
 * Placeholder org chart: kartu node + garis penghubung, bukan spinner.
 *
 * Dipakai dua kali: sebagai `loading` dari `dynamic(..., { ssr: false })` di
 * `org-chart-lazy.tsx` (saat bundle React Flow diunduh) dan sebagai isi
 * `loading.tsx` route (saat Server Component masih membaca data). Bentuknya
 * sengaja meniru struktur tree supaya tidak ada loncatan layout saat
 * komponen asli mounted.
 *
 * murni dekoratif: `aria-hidden` dibiarkan ke elemen pembungkus supaya
 * pembaca layar tidak membacakan garis dan placeholder ini.
 */

const NODE_CARD_CLASS = "flex w-52 flex-col gap-2 rounded-lg border border-border p-3";
const LEAF_COUNT = 4;

function NodeCard() {
  return (
    <div className={NODE_CARD_CLASS}>
      <Skeleton className="size-9 rounded-full" />
      <Skeleton className="h-3.5 w-32" />
      <Skeleton className="h-3 w-44" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

export function OrgChartSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-28" />
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
          <Skeleton className="h-9 w-full rounded-md" />
          <Skeleton className="h-9 w-full rounded-md" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-32 rounded-md" />
            <Skeleton className="h-8 w-32 rounded-md" />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-72" />
        </div>

        <div className="flex min-h-[420px] flex-col items-center justify-center gap-0">
          <NodeCard />

          <Skeleton className="h-8 w-px" />

          <Skeleton className="h-px w-[calc(75%-0.75rem)]" />

          <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: LEAF_COUNT }).map((_, index) => (
              <div key={index} className="flex flex-col items-center gap-2">
                <Skeleton className="h-8 w-px" />
                <NodeCard />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
