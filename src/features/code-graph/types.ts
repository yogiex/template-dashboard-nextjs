/**
 * Kontrak data untuk fitur Code Dependency Graph.
 *
 * Sumber kebenaran adalah `graph.json` yang dihasilkan
 * `scripts/code-graph-transform.js` pada build/dev. Bentuk di sini MIRROR
 * output transform — bukan hasil validasi runtime. File JSON dibaca apa
 * adanya oleh service (DAL), jadi tipe di bawah harus jujur dengan data
 * yang benar-benar ada di disk.
 *
 * Catatan penting soal `category` (AGENTS.md rule 4: jangan pakai assertion
 * untuk menjinakkan compiler): nilai `category` di `graph.json` adalah
 * string DINAMIS yang dibentuk dari path file sumber. `NodeCategory` di bawah
 * sengaja hanya Dokumentasi union yang diharapkan, sedangkan field
 * `GraphNode.category` tetap bertipe `string`. Casting `string` ke
 * `NodeCategory` akan berbohong kalau ada feature baru yang belum terdaftar,
 * jadi jalur itu memang tidak dibuka.
 */

/**
 * Bentuk kategori yang diharapkan dari `src/`.
 *
 * - `app` dan `app/(${string})` / `app/${string}`: App Router, termasuk route
 *   group `(dashboard)`, `(auth)`, `(public)`.
 * - `features/${string}`: satu feature domain, mis. `features/auth`.
 * - `components/${string}`: shared component, mis. `components/ui`.
 * - `lib`, `config`, `hooks`: utilitas bersama.
 * - `other`: file yang tidak masuk bucket di atas (mis. `proxy.ts`).
 *
 * Union ini TIDAKconstraint data; pakai untuk exhaustive switch di consumer
 * yang mau handling kategori baru secara eksplisit.
 */
export type NodeCategory =
  | "app"
  | `app/${string}`
  | `app/(${string})`
  | `features/${string}`
  | `components/${string}`
  | "lib"
  | "config"
  | "hooks"
  | "other";

/** Kategori dengan nilai tetap; dipakai transform untuk bucketing stats. */
export type FixedNodeCategory = "app" | "lib" | "config" | "hooks" | "other";

/** Bentuk file sumber yang menentukan apakah node bisa dirender di client. */
export type NodeType = "component" | "module" | "style" | "file";

/** Batas runtime yang dianalisis transform untuk menandai risiko boundary. */
export type Boundary = "server" | "client" | "server-only";

export interface GraphNode {
  /** Path relatif terhadap `sourceDir`, mis. `src/features/auth/actions.ts`. */
  id: string;
  /** Nama yang ditampilkan di node; biasanya `basename(id)`. */
  label: string;
  /**
   * Bucket kategori path. Sengaja `string`, bukan `NodeCategory`: nilai ini
   * berasal dari data di disk dan bisa berisi bucket baru kapan saja.
   */
  category: string;
  type: NodeType;
  boundary: Boundary;
  /** Jumlah import keluar dari node ini. */
  deps: number;
}

export interface GraphEdge {
  /** `${source}->${target}`; stabil selama graph di-generate ulang. */
  id: string;
  source: string;
  target: string;
  sourceCat: string;
  targetCat: string;
  /** `true` bila `sourceCat` dan `targetCat` berbeda. */
  crossFeature: boolean;
  /** Edge yang melanggar batas feature yang disepakati repo. */
  violation: boolean;
  /**
   * Edge yang menembus boundary runtime (mis. client Component mengimpor
   * modul `server-only`). Absen pada graph versi lama.
   */
  boundaryViolation?: boolean;
}

export interface GraphStats {
  totalFiles: number;
  totalEdges: number;
  crossFeatureEdges: number;
  /** Sama dengan `edges.filter((e) => e.violation).length`. */
  violationEdges: number;
  /** Edge yang menembus boundary runtime. */
  boundaryViolations: number;
  categories: Record<string, number>;
  types: Record<string, number>;
  boundaries: Record<string, number>;
}

/** Isi `graph.json` apa adanya. */
export interface CodeGraphData {
  /** ISO-8601 dari `Date#toISOString()` saat transform dijalankan. */
  generatedAt: string;
  sourceDir: string;
  stats: GraphStats;
  /**
   * Siklus dependensi; tiap entri adalah satu siklus yang sudah diratakan
   * menjadi string siap tampil (bukan daftar node terpisah), sehingga
   * `cycles.length` langsung berarti "jumlah siklus".
   */
  cycles: string[];
  nodes: GraphNode[];
  edges: GraphEdge[];
}
