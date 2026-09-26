/**
 * Palet dan helper warna untuk Code Dependency Graph.
 *
 * Ini satu-satunya tempat di feature ini yang boleh menyebut nilai warna
 * konkret. Komponen WAJIB memakai `categoryColor()` / `withAlpha()` atau token
 * semantic Tailwind, tidak boleh menulis hex atau arbitrary value
 * (AGENTS.md rule 8).
 *
 * ## Kenapa `light-dark()` dan bukan satu nilai
 *
 * Tema repo Ivory hangat: `--background: oklch(0.985 0.003 100)` (light) dan
 * `oklch(0.145 0 0)` (dark), dengan `color-scheme` di-set di `globals.css`
 * (`:root` = light, `.dark` = dark). Satu nilai warna tidak mungkin punya
 * kontras cukup di dua latar: L ~0.55 terbaca di ivory, tapi praktis hilang di
 * latar near-black. Karena `color-scheme` sudah di-set, `light-dark()` otomatis
 * mengikuti tema aktif — komponen cukup mengarang `stroke`/`fill` dan browser
 * yang memilih nilai yang tepat. Pola yang sama dipakai `src/lib/color.ts`
 * (`generateThemeVars`).
 *
 * Kontras dijaga secara konstruktif: lightness dan chroma dikunci per tema,
 * hanya hue yang varies. Lightness 0.55 di light dan 0.76 di dark dengan
 * chroma ~0.12 berarti semua node lolos ambang ~3:1 terhadap `--background`
 * di kedua tema tanpa perlu menyetel hue per kategori. Mengunci
 * lightness/chroma sekaligus juga membuat hue jadi satu-satunya channel
 * informasi, yang persis yang dibutuhkan untuk membedakan kategori.
 */

import type { Boundary } from "@/features/code-graph/types";

interface ColorEntry {
  /** Nama stabil untuk custom property, mis. `hue-190` atau `app`. */
  slug: string;
  /** Nilai pada tema light (latar ivory). */
  light: string;
  /** Nilai pada tema dark (latar near-black). */
  dark: string;
}

/**
 * Jumlah slot roda hue untuk kategori dinamis (`features/*`, `components/*`).
 * 32 slot memberi sebaran yang baik untuk belasan kategori yang ada di repo
 * ini, dan roda hue-nya bisa di-deklarasikan sebagai custom property sekaligus
 * (hue bebas tidak bisa di-preregister).
 *
 * Perhatikan: repeat itu DIHARAPKAN. Dengan ~18 kategori dinamis dan 32 slot,
 * birthday collision tidak bisa dihindari tanpa membuat palet Satu warna
 * per kategori yang tidak bisa dibedakan mata. Yang dijamin deterministik
 * adalah satu kategori selalu mendapat warna yang sama; repeats diselesaikan
 * lewat legend, bukan lewat warna tambahan.
 */
const DYNAMIC_SLOT_COUNT = 32;

/**
 * Chroma 0.12 dipilih supaya seluruh roda hue (termasuk kuning ~90 dan hijau
 * ~140) tetap di dalam gamut sRGB pada lightness yang dikunci, sehingga tidak
 * ada hue yang ter-clip diam-diam.
 */
const DYNAMIC_LIGHT_L = 0.55;
const DYNAMIC_LIGHT_C = 0.12;
const DYNAMIC_DARK_L = 0.76;
const DYNAMIC_DARK_C = 0.125;

const FIXED_VAR_PREFIX = "--code-graph-category";
const DYNAMIC_VAR_PREFIX = "--code-graph-hue";

/** Slot roda hue; index 0..31, hue naik 11.25 derajat per slot. */
const DYNAMIC_SLOTS: readonly ColorEntry[] = Array.from(
  { length: DYNAMIC_SLOT_COUNT },
  (_unused, index) => {
    const hue = Math.round((index * 360) / DYNAMIC_SLOT_COUNT) % 360;
    return {
      slug: `hue-${hue}`,
      light: `oklch(${DYNAMIC_LIGHT_L} ${DYNAMIC_LIGHT_C} ${hue})`,
      dark: `oklch(${DYNAMIC_DARK_L} ${DYNAMIC_DARK_C} ${hue})`,
    };
  },
);

/**
 * Warna kategori statis, kunci persis sama dengan `FixedNodeCategory` di
 * `types.ts`. Hue dipilih manual supaya kategori inti dikenali sekilas dan
 * tetap memakai token semantic yang sudah ada di `globals.css`:
 * `app` mengikuti keluarga emerald `--primary`, `lib` biru, `config` amber,
 * `hooks` hijau, dan `other` netral.
 *
 * `app/**` sengaja dipetakan ke warna `app` supaya seluruh App Router satu
 * warna; memecah route group jadi beberapa warna tidak menambah informasi.
 */
const FIXED_CATEGORY_COLORS: Readonly<Record<string, ColorEntry>> = {
  app: {
    slug: "app",
    light: "oklch(0.560 0.130 163)",
    dark: "oklch(0.760 0.150 163)",
  },
  lib: {
    slug: "lib",
    light: "oklch(0.550 0.160 250)",
    dark: "oklch(0.750 0.140 250)",
  },
  config: {
    slug: "config",
    light: "oklch(0.600 0.150 72)",
    dark: "oklch(0.800 0.140 78)",
  },
  hooks: {
    slug: "hooks",
    light: "oklch(0.520 0.120 125)",
    dark: "oklch(0.780 0.140 125)",
  },
  other: {
    slug: "other",
    light: "oklch(0.550 0.010 100)",
    dark: "oklch(0.750 0.010 100)",
  },
};

function toVarName(prefix: string, slug: string): string {
  const safe = slug
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `var(${prefix}-${safe === "" ? "other" : safe})`;
}

/**
 * Hash FNV-1a 32-bit. Deterministik dan tanpa `Math.random`, jadi warna
 * kategori tidak berubah antar-run dan tidak memicu hydration mismatch antara
 * render server dan client.
 */
function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Resolusi kategori ke warna. Kategori statis lewat tabel; sisanya (`features/*`
 * dan `components/*`, termasuk bucket yang belum dikenal) lewat hash supaya
 * tiap kategori dapat warna sendiri yang konsisten.
 */
function colorEntryFor(category: string): ColorEntry {
  const normalized = category.trim().toLowerCase();

  if (normalized === "" || normalized === "app" || normalized.startsWith("app/")) {
    return FIXED_CATEGORY_COLORS.app;
  }

  const fixed = FIXED_CATEGORY_COLORS[normalized];
  if (fixed) return fixed;

  const entry = DYNAMIC_SLOTS[fnv1a(normalized) % DYNAMIC_SLOT_COUNT];
  // `DYNAMIC_SLOTS` dibuat dengan panjang tetap, tapi guard eksplisit menjaga
  // fungsi ini total dan bebas assertion.
  if (!entry) return FIXED_CATEGORY_COLORS.other;
  return entry;
}

const COLOR_CACHE = new Map<string, string>();
const VAR_CACHE = new Map<string, string>();

/**
 * Warna stabil untuk sebuah kategori.
 *
 * Nilai dikembalikan sebagai `light-dark(...)`, jadi langsung bisa dipakai
 * sebagai `stroke`/`fill` atau nilai `style` tanpa stylesheet tambahan, dan
 * tetap mengikuti tema aktif. Hasil di-memoize karena dipanggil per node per
 * render.
 */
export function categoryColor(category: string): string {
  const cached = COLOR_CACHE.get(category);
  if (cached) return cached;

  const entry = colorEntryFor(category);
  const value = `light-dark(${entry.light}, ${entry.dark})`;
  COLOR_CACHE.set(category, value);
  return value;
}

/**
 * Bentuk CSS custom property untuk kategori yang sama, mis.
 * `var(--code-graph-hue-190)`.
 *
 * Berguna kalau node dirender lewat `className` alih-alih `style` inline.
 * Custom property yang dirujuk harus dideklarasikan lebih dulu; untuk itu
 * pakai `CATEGORY_COLOR_STYLESHEET` di bawah.
 */
export function categoryColorVar(category: string): string {
  const cached = VAR_CACHE.get(category);
  if (cached) return cached;

  const entry = colorEntryFor(category);
  const prefix = entry.slug.startsWith("hue-")
    ? DYNAMIC_VAR_PREFIX
    : FIXED_VAR_PREFIX;
  const value = toVarName(prefix, entry.slug);
  VAR_CACHE.set(category, value);
  return value;
}

/**
 * Aturan CSS yang mendaftarkan seluruh custom property di `:root` supaya
 * `categoryColorVar()` resolve tanpa menulis warna di markup.
 *
 * Cukup dirender sekali di layout halaman (dalam `<style>`). Tidak perlu blok
 * `.dark` terpisah karena setiap nilai `light-dark()` sudah membaca
 * `color-scheme` yang di-set `.dark` di `globals.css`.
 */
export const CATEGORY_COLOR_STYLESHEET = `:root { ${[
  ...Object.values(FIXED_CATEGORY_COLORS).map(
    (entry) => `${FIXED_VAR_PREFIX}-${entry.slug}: light-dark(${entry.light}, ${entry.dark});`,
  ),
  ...DYNAMIC_SLOTS.map(
    (entry) => `${DYNAMIC_VAR_PREFIX}-${entry.slug}: light-dark(${entry.light}, ${entry.dark});`,
  ),
].join(" ")} }`;

/**
 * Warna boundary sebagai nilai konkret, untuk stroke node. Diambil dari palet
 * yang sama supaya boundary dan kategori tidak terbaca sebagai dua sistem
 * warna yang berbeda.
 */
export const BOUNDARY_COLOR: Record<Boundary, string> = {
  server: "light-dark(oklch(0.560 0.130 163), oklch(0.760 0.150 163))",
  client: "light-dark(oklch(0.545 0.110 215), oklch(0.755 0.125 215))",
  "server-only": "light-dark(oklch(0.600 0.150 72), oklch(0.800 0.140 78))",
};

/**
 * Kelas token semantic untuk dot boundary di sidebar dan legend.
 *
 * Mapping dibuat SEMU positional sesuai urutan union `Boundary` di
 * `types.ts` (`server`, `client`, `server-only`) supaya consumer tidak perlu
 * tahu warna aslinya. Repo melarang hex atau warna hardcode di komponen
 * (AGENTS.md rule 8), jadi mapping ini tinggal di sini, bukan di markup.
 */
export const BOUNDARY_DOT_CLASS: Record<Boundary, string> = {
  server: "bg-destructive",
  client: "bg-primary",
  "server-only": "bg-muted-foreground",
};

/**
 * Warna edge netral, mengikuti `--border`/foreground supaya tidak bersaing
 * dengan warna kategori di kanvas.
 */
export const EDGE_COLOR = "light-dark(oklch(0.500 0.008 100), oklch(0.708 0 0))";

/** Warna edge yang ditandai pelanggaran batas feature atau boundary. */
export const EDGE_VIOLATION_COLOR =
  "light-dark(oklch(0.577 0.245 27.325), oklch(0.704 0.191 22.216))";

/** Warna edge yang sedang ditunjuk node terpilih. */
export const EDGE_SELECTED_COLOR =
  "light-dark(oklch(0.596 0.145 163.225), oklch(0.696 0.170 162.480))";

const ALPHA_CACHE = new Map<string, string>();

/**
 * Warna translucent dari warna apa pun, untuk tint background node/edge.
 *
 * `alpha` adalah fraksi 0..1, bukan string persistence — komponen tidak boleh
 * merangkai `color + "/20"` sendiri, karena itu tidak valid untuk nilai
 * `light-dark()` (yang sudah punya komponen alpha sendiri). Implementasi
 * memakai `color-mix()` supaya tetap benar untuk `light-dark()` maupun `var()`.
 */
export function withAlpha(color: string, alpha: number): string {
  const clamped = Number.isFinite(alpha) ? Math.min(Math.max(alpha, 0), 1) : 0;
  const key = `${color}::${clamped}`;
  const cached = ALPHA_CACHE.get(key);
  if (cached) return cached;

  const percent = Math.round(clamped * 100);
  const value =
    percent === 0
      ? "transparent"
      : `color-mix(in oklab, ${color} ${percent}%, transparent)`;
  ALPHA_CACHE.set(key, value);
  return value;
}

/** Alias tematik: tint background node dari warna kategorinya. */
export function categoryTint(category: string, alpha = 0.14): string {
  return withAlpha(categoryColor(category), alpha);
}
