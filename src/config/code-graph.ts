/**
 * Copy user-facing untuk fitur Code Dependency Graph.
 *
 * Seluruh teks yang tampil di halaman `/code-graph` berasal dari file ini
 * (docs/ARCHITECTURE.md §14.7, AGENTS.md rule 7). Komponen tidak boleh menulis
 * string tampil inline dan tidak boleh merangkai kalimat sendiri dari angka —
 * pakai helper di bagian bawah supaya format konsisten di seluruh halaman.
 *
 * Angka dan tanggal bukan copy: helper di bawah hanya memformat angka dan ISO
 * date dari `graph.json` ke dalam kalimat yang sudah didefinisikan di sini.
 */

import type { Boundary, GraphStats, NodeType } from "@/features/code-graph/types";

/**
 * Placeholder yang boleh dipakai di dalam `*Template`. Satu-satunya sumber
 * kebenaran; `PLACEHOLDER_PATTERN` dibangun dari daftar ini, jadi menambah
 * placeholder cukup di satu tempat.
 */
const PLACEHOLDER_KEYS = [
  "files",
  "edges",
  "crossFeature",
  "violations",
  "boundaryViolations",
  "cycles",
  "sourceDir",
  "generatedAt",
] as const;

/**
 * Nilai placeholder. Sengaja `Record<string, string>` dan bukan
 * `Record<typeof PLACEHOLDER_KEYS[number], string>` supaya `fill()` bisa
 * mencari dengan key dari regex tanpa perlu assertion atau index signature.
 */
type PlaceholderValues = Readonly<Record<string, string>>;

const PLACEHOLDER_PATTERN = new RegExp(
  `\\{(${PLACEHOLDER_KEYS.join("|")})\\}`,
  "g",
);

const NUMBER_FORMAT = new Intl.NumberFormat("id-ID");

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return NUMBER_FORMAT.format(value);
}

function fill(template: string, values: PlaceholderValues): string {
  return template.replace(PLACEHOLDER_PATTERN, (match: string, key: string) => {
    return values[key] ?? match;
  });
}

export interface CodeGraphPageConfig {
  title: string;
  descriptionTemplate: string;
  sourceDirLabel: string;
  generatedAtLabel: string;
  empty: {
    title: string;
    description: string;
  };
  badges: {
    violations: string;
    noViolations: string;
    cycles: string;
    noCycles: string;
  };
  filters: {
    searchLabel: string;
    searchPlaceholder: string;
    categoryLabel: string;
    categoryAllOption: string;
    clearAction: string;
    violationsOnlyLabel: string;
    violationsOnlyHint: string;
    noMatches: string;
  };
  detail: {
    rows: {
      boundary: string;
      type: string;
      imports: string;
      importedBy: string;
    };
    sections: {
      imports: string;
      importedBy: string;
    };
    emptyImports: string;
    emptyImportedBy: string;
    closeLabel: string;
  };
  controls: {
    zoomInLabel: string;
    zoomOutLabel: string;
    fitViewLabel: string;
    minimapLabel: string;
    canvasLabel: string;
  };
  statusBarTemplate: string;
  boundaryLabels: Record<Boundary, string>;
  nodeTypeLabels: Record<NodeType, string>;
  legend: {
    title: string;
    fixedTitle: string;
    dynamicTitle: string;
  };
}

export const CODE_GRAPH_PAGE_CONFIG: CodeGraphPageConfig = {
  title: "Code Dependency Graph",
  descriptionTemplate:
    "Peta dependensi import hasil analisis statis dari {sourceDir}, digenerate pada {generatedAt}. Bukan runtime tracing.",
  sourceDirLabel: "Direktori sumber",
  generatedAtLabel: "Digenerate",
  empty: {
    title: "Graph belum di-generate",
    description:
      "File graph.json belum ada. Jalankan transformasi dependensi lebih dulu; halaman ini hanya membaca hasil analisis statis dan tidak menelusuri import saat runtime.",
  },
  badges: {
    violations: "Pelanggaran batas",
    noViolations: "Tanpa pelanggaran",
    cycles: "Siklus dependensi",
    noCycles: "Tanpa siklus",
  },
  filters: {
    searchLabel: "Cari file",
    searchPlaceholder: "Cari berdasarkan nama file...",
    categoryLabel: "Kategori",
    categoryAllOption: "Semua kategori",
    clearAction: "Bersihkan filter",
    violationsOnlyLabel: "Hanya pelanggaran",
    violationsOnlyHint:
      "Tampilkan node yang terlibat edge pelanggaran batas feature atau boundary runtime.",
    noMatches: "Tidak ada node yang cocok dengan filter.",
  },
  detail: {
    rows: {
      boundary: "Boundary",
      type: "Tipe",
      imports: "Import",
      importedBy: "Diimpor oleh",
    },
    sections: {
      imports: "Mengimpor",
      importedBy: "Diimpor oleh",
    },
    emptyImports: "Node ini tidak mengimpor file lain di dalam sourceDir.",
    emptyImportedBy: "Tidak ada file lain yang mengimpor node ini.",
    closeLabel: "Tutup detail node",
  },
  controls: {
    zoomInLabel: "Perbesar tampilan graph",
    zoomOutLabel: "Perkecil tampilan graph",
    fitViewLabel: "Paskan seluruh graph ke layar",
    minimapLabel: "Peta mini graph",
    canvasLabel: "Kanvas graph dependensi kode",
  },
  statusBarTemplate: "{files} file · {edges} edge",
  boundaryLabels: {
    server: "Server Component",
    client: "Client Component",
    "server-only": "Server only",
  },
  nodeTypeLabels: {
    component: "Komponen",
    module: "Modul",
    style: "Stylesheet",
    file: "Berkas",
  },
  legend: {
    title: "Legenda warna",
    fixedTitle: "Kategori tetap",
    dynamicTitle: "Kategori dinamis",
  },
};

/** Nama yang dipakai feature; alias dari `CODE_GRAPH_PAGE_CONFIG`. */
export const codeGraphConfig: CodeGraphPageConfig = CODE_GRAPH_PAGE_CONFIG;

/** `{n} file`. */
export function fileCountLabel(count: number): string {
  return fill("{files} file", { files: formatNumber(count) });
}

/** `{n} edge`; istilah "edge" dipakai apa adanya untuk semua nilai. */
export function edgeCountLabel(count: number): string {
  return fill("{edges} edge", { edges: formatNumber(count) });
}

/** Badge jumlah siklus, atau copy "tanpa siklus" saat nol. */
export function cycleCountLabel(count: number): string {
  if (count <= 0) return codeGraphConfig.badges.noCycles;
  return `${formatNumber(count)} ${codeGraphConfig.badges.cycles}`;
}

/** Badge jumlah pelanggaran batas, atau copy "tanpa pelanggaran" saat nol. */
export function violationCountLabel(count: number): string {
  if (count <= 0) return codeGraphConfig.badges.noViolations;
  return `${formatNumber(count)} ${codeGraphConfig.badges.violations}`;
}

/**
 * Waktu generator, diformat `id-ID`. Sengaja tanpa `timeZone` eksplisit agar
 * konsisten dengan komponen lain di repo (`observability`, `ueba`) yang
 * memformat waktu dengan `toLocaleString("id-ID")` yang sama. Kalau string ini
 * nanti ikut dirender di client, tambahkan `timeZone` di sini supaya tidak
 * ada hydration mismatch antara server dan browser.
 */
export function generatedAtLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "tidak diketahui";
  return date.toLocaleString("id-ID");
}

/** Baris status di bawah kanvas: `{files} file · {edges} edge`. */
export function statusBarLabel(files: number, edges: number): string {
  return fill(codeGraphConfig.statusBarTemplate, {
    files: formatNumber(files),
    edges: formatNumber(edges),
  });
}

/**
 * Deskripsi ringkas untuk header halaman, dibangun dari `stats`.
 * Jumlah siklus tidak ada di `stats`, jadi diteruskan terpisah.
 */
export function summaryDescription(stats: GraphStats, cycles = 0): string {
  return fill(
    "{files} file dan {edges} edge dianalisis: {crossFeature} edge lintas fitur, {violations} pelanggaran batas, {boundaryViolations} pelanggaran boundary, {cycles} siklus dependensi.",
    {
      files: formatNumber(stats.totalFiles),
      edges: formatNumber(stats.totalEdges),
      crossFeature: formatNumber(stats.crossFeatureEdges),
      violations: formatNumber(stats.violationEdges),
      boundaryViolations: formatNumber(stats.boundaryViolations),
      cycles: formatNumber(cycles),
    },
  );
}

/** Deskripsi metadata halaman, dengan `sourceDir` dan waktu generator. */
export function pageDescription(
  sourceDir: string,
  generatedAt: string,
): string {
  return fill(codeGraphConfig.descriptionTemplate, {
    sourceDir,
    generatedAt: generatedAtLabel(generatedAt),
  });
}
