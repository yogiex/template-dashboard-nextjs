"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import type { OrgChartCanvasProps } from "@/features/organization/components/org-chart-canvas";
import type { OrgDetailSheetProps } from "@/features/organization/components/org-detail-sheet";
import {
  DEPARTMENT_ALL_VALUE,
  type OrgToolbarProps,
} from "@/features/organization/components/org-toolbar";
import {
  collectNodeIds,
  collapseOrgTree,
  filterOrgTree,
  findNodeById,
} from "@/features/organization/lib/visible-tree";
import type { EmployeeDetail, OrgTreeNode } from "@/features/organization/types";
import { getErrorMessage } from "@/lib/error";
import { clientLogger } from "@/lib/logger-client";

/**
 * State client org chart: filter, arah, lipat, seleksi, dan detail sheet.
 *
 * Hook ini tidak menghitung posisi node. `treeToFlow` + `layoutWithDagre`
 * dipanggil sekali per perubahan input di `components/org-chart.tsx`; hook ini
 * hanya menghasilkan pohon yang terlihat beserta props siap pakai untuk
 * toolbar, detail sheet, dan canvas.
 *
 * `emptyState` juga tidak dibuat di sini supaya file ini tetap tanpa JSX;
 * `components/org-chart.tsx` merakitnya dari `onClearFilters`.
 *
 * `canvasProps` sengaja tidak membawa `nodes`/`edges`: node hasil hitung
 * dagre hanya boleh dibuat di `org-chart.tsx` (aturan "dagre satu kali per
 * perubahan input"), lalu digabung ke `<OrgChartCanvas {...canvasProps}
 * nodes={nodes} edges={edges} />`.
 */

export interface OrgChartStats {
  totalEmployees: number;
  departmentCount: number;
  levelCount: number;
}

export interface UseOrgChartInput extends OrgChartStats {
  root: OrgTreeNode;
  departments: string[];
}

/** Props canvas minus data yang harus dihitung pemanggil. */
export type OrgChartCanvasBaseProps = Omit<
  OrgChartCanvasProps,
  "nodes" | "edges"
>;

const DEFAULT_DIRECTION: "TB" | "LR" = "TB";

const EMPTY_COLLAPSED: ReadonlySet<string> = new Set<string>();

export function useOrgChart({
  root,
  departments,
  totalEmployees,
  departmentCount,
  levelCount,
}: UseOrgChartInput) {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState<string>(DEPARTMENT_ALL_VALUE);
  const [direction, setDirection] = useState<"TB" | "LR">(DEFAULT_DIRECTION);
  const [collapsedIds, setCollapsedIds] =
    useState<ReadonlySet<string>>(EMPTY_COLLAPSED);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fitViewSignal, setFitViewSignal] = useState(0);

  const [detail, setDetail] = useState<EmployeeDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  /**
   * Nomor permintaan detail terakhir. Hasil yang bukan untuk permintaan
   * terbaru diabaikan, jadi klik cepat pada beberapa kartu tidak pernah
   * menampilkan detail karyawan yang salah.
   */
  const detailRequestRef = useRef(0);

  const stats = useMemo<OrgChartStats>(
    () => ({ totalEmployees, departmentCount, levelCount }),
    [departmentCount, levelCount, totalEmployees],
  );

  const filteredTree = useMemo(
    () => filterOrgTree(root, { search, department }),
    [department, root, search],
  );

  const visibleTree = useMemo(
    () =>
      filteredTree === null ? null : collapseOrgTree(filteredTree, collapsedIds),
    [collapsedIds, filteredTree],
  );

  /** Node yang benar-benar digambar (setelah filter dan lipatan). */
  const visibleCount = useMemo(
    () => (visibleTree === null ? 0 : collectNodeIds(visibleTree).length),
    [visibleTree],
  );

  /** Node tersedia di pohon server, tanpa filter apa pun. */
  const totalCount = useMemo(() => collectNodeIds(root).length, [root]);

  const loadDetail = useCallback((id: string) => {
    detailRequestRef.current += 1;
    const requestId = detailRequestRef.current;

    setIsDetailLoading(true);
    setDetailError(null);
    // Detail sebelumnya langsung dibuang. Menahan detail lama sambil request
    // baru berjalan akan menampilkan data salah milik karyawan lama.
    setDetail(null);

    void (async () => {
      try {
        const result: { success: true; data: EmployeeDetail } = {
          success: true,
          data: {
            employee: {
              id,
              name: "Demo Employee",
              role: "Demo Role",
              department: "Demo Department",
              email: "demo@example.com",
              avatarUrl: undefined,
              managerId: null,
              directReports: 0,
              location: "Demo Location",
              joinedAt: "2026-01-01T00:00:00.000Z",
            },
            managers: [],
            reports: [],
          },
        };

        if (detailRequestRef.current !== requestId) {
          return;
        }

        if (result.success) {
          setDetail(result.data);

          return;
        }
      } catch (error) {
        if (detailRequestRef.current !== requestId) {
          return;
        }

        // `@/lib/logger` (pino + redaksi) hanya untuk server. Di client dipakai
        // `clientLogger`, yang tidak pernah mencetak context sehingga tidak ada
        // data karyawan yang bocor ke console browser.
        clientLogger.error("organization.employee_detail.unexpected_error", error);
        setDetailError(getErrorMessage("INTERNAL_ERROR"));
      } finally {
        if (detailRequestRef.current === requestId) {
          setIsDetailLoading(false);
        }
      }
    })();
  }, []);

  /** Klik tunggal: seleksi kartu dan siapkan detail tanpa membuka sheet. */
  const onSelectNode = useCallback(
    (id: string) => {
      setSelectedId(id);
      loadDetail(id);
    },
    [loadDetail],
  );

  /** Klik ganda: sama seperti seleksi, lalu buka sheet detail. */
  const onOpenDetail = useCallback(
    (id: string) => {
      setSelectedId(id);
      setDetailOpen(true);
      loadDetail(id);
    },
    [loadDetail],
  );

  /**
   * Navigasi dari dalam sheet detail (misalnya pilih laporan langsung). Fokus
   * org chart pindah ke node itu: filter dilepas supaya node tidak tertutup
   * pencarian atau departemen, dan node itu sendiri dibuka dari keadaan
   * terlipat. Kalau id tidak ada di pohon, chart dibiarkan apa adanya dan
   * tidak melempar error.
   */
  const onSelectEmployeeFromDetail = useCallback(
    (id: string) => {
      if (findNodeById(root, id) === null) {
        return;
      }

      setSearch("");
      setDepartment(DEPARTMENT_ALL_VALUE);
      setCollapsedIds((current) => {
        if (!current.has(id)) {
          return current;
        }

        const next = new Set(current);
        next.delete(id);

        return next;
      });
      setSelectedId(id);
      setDetailOpen(true);
      loadDetail(id);
    },
    [loadDetail, root],
  );

  const onResetLayout = useCallback(() => {
    setSearch("");
    setDepartment(DEPARTMENT_ALL_VALUE);
    setDirection(DEFAULT_DIRECTION);
    setCollapsedIds(EMPTY_COLLAPSED);
    setSelectedId(null);
    setDetail(null);
    setDetailError(null);
    setFitViewSignal((current) => current + 1);
  }, []);

  const onClearFilters = useCallback(() => {
    setSearch("");
    setDepartment(DEPARTMENT_ALL_VALUE);
  }, []);

  const onExpandAll = useCallback(() => {
    setCollapsedIds(EMPTY_COLLAPSED);
  }, []);

  const onCollapseAll = useCallback(() => {
    const ids = collectNodeIds(root);
    const [rootId, ...rest] = ids;

    setCollapsedIds(new Set(rootId === undefined ? ids : rest));
  }, [root]);

  const onFitView = useCallback(() => {
    setFitViewSignal((current) => current + 1);
  }, []);

  const toolbarProps = useMemo<OrgToolbarProps>(
    () => ({
      search,
      onSearchChange: setSearch,
      department,
      departments,
      onDepartmentChange: setDepartment,
      direction,
      onDirectionChange: setDirection,
      onExpandAll,
      onCollapseAll,
      onFitView,
      onResetLayout,
      stats,
    }),
    [
      department,
      departments,
      direction,
      onCollapseAll,
      onExpandAll,
      onFitView,
      onResetLayout,
      search,
      stats,
    ],
  );

  const canvasProps = useMemo<OrgChartCanvasBaseProps>(
    () => ({
      direction,
      selectedId,
      onNodeClick: onSelectNode,
      onNodeDoubleClick: onOpenDetail,
      fitViewSignal,
    }),
    [direction, fitViewSignal, onOpenDetail, onSelectNode, selectedId],
  );

  const detailSheetProps = useMemo<OrgDetailSheetProps>(
    () => ({
      detail,
      open: detailOpen,
      onOpenChange: setDetailOpen,
      onSelectEmployee: onSelectEmployeeFromDetail,
    }),
    [detail, detailOpen, onSelectEmployeeFromDetail],
  );

  return {
    /** Pohon yang siap digambar (setelah filter dan lipatan), atau `null`. */
    filteredTree: visibleTree,
    visibleCount,
    totalCount,
    toolbarProps,
    onSelectNode,
    onSelectEmployeeFromDetail,
    onClearFilters,
    detailSheetProps,
    canvasProps,
    fitViewSignal,
    direction,
    stats,
    isDetailLoading,
    detailError,
  };
}
