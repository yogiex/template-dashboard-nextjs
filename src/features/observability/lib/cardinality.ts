/**
 * Kontrol cardinality untuk tag metrik.
 *
 * Cardinality adalah jumlah series unik pada backend time-series. Metrik dengan
 * label bebas (route, user agent, pesan error) bisa meledak menjadi ratusan
 * ribu series dan menjatuhkan exporter. Fungsi di sini memberi batas keras
 * tanpa merusak metrik yang sah:
 *
 * - `maxTagKeys`: jumlah key per metrik dibatasi; key sisanya dibuang;
 * - `perTag`: jumlah nilai unik per key dibatasi; nilai baru yang sudah
 *   melewati batas diganti `_other`, sedangkan nilai yang sudah pernah dipakai
 *   tetap utuh sehingga limit tidak merusak series yang populer;
 * - `totalSeries`: jumlah series unik per metrik dibatasi; series baru yang
 *   akan melewati batas di-collapse sehingga semua nilainya menjadi `_other`.
 *
 * Semua fungsi di file ini murni: tidak ada I/O, tidak ada state global, dan
 * input tidak pernah dimutasi. Series yang sudah tercatat disimpan di store,
 * bukan di sini.
 */

/** Nilai pengganti ketika nilai tag melewati batas. */
export const OTHER_TAG_VALUE = "_other";

/** Batas default per metrik. */
export const CARDINALITY_LIMITS: {
  totalSeries: number;
  perTag: number;
  maxTagKeys: number;
} = {
  totalSeries: 300,
  perTag: 20,
  maxTagKeys: 8,
};

const SERIES_SEPARATOR = "|";
const KEY_VALUE_SEPARATOR = "=";

export type CardinalityResult = {
  tags: Record<string, string>;
  /** Key yang dibuang atau nilainya dilipat, format `key` atau `key=value`. */
  overflowKeys: string[];
};

export type CardinalityContext = {
  metricName: string;
  /** Series key yang sudah tercatat, format dari `buildSeriesKey()`. */
  existingSeries: ReadonlySet<string>;
};

function sanitize(value: string): string {
  return value
    .split(SERIES_SEPARATOR)
    .join("_")
    .split(KEY_VALUE_SEPARATOR)
    .join("_");
}

/**
 * Series key deterministik: nama metrik + tag yang sudah diurutkan berdasarkan
 * nama key, jadi dua event dengan tag yang sama selalu menghasilkan key sama.
 */
export function buildSeriesKey(
  metricName: string,
  tags: Record<string, string>,
): string {
  const parts = Object.keys(tags)
    .sort()
    .map(
      (key) =>
        `${sanitize(key)}${KEY_VALUE_SEPARATOR}${sanitize(tags[key] ?? "")}`,
    );

  return `${sanitize(metricName)}${SERIES_SEPARATOR}${parts.join(SERIES_SEPARATOR)}`;
}

function metricPrefix(metricName: string): string {
  return `${sanitize(metricName)}${SERIES_SEPARATOR}`;
}

/** Kumpulkan nilai yang sudah pernah dipakai per key dari series key. */
function collectObservedValues(
  metricName: string,
  existingSeries: ReadonlySet<string>,
): Map<string, Set<string>> {
  const prefix = metricPrefix(metricName);
  const observed = new Map<string, Set<string>>();

  for (const series of existingSeries) {
    if (!series.startsWith(prefix)) {
      continue;
    }

    for (const pair of series.slice(prefix.length).split(SERIES_SEPARATOR)) {
      const separatorIndex = pair.indexOf(KEY_VALUE_SEPARATOR);

      if (separatorIndex <= 0) {
        continue;
      }

      const key = pair.slice(0, separatorIndex);
      const value = pair.slice(separatorIndex + 1);
      const values = observed.get(key) ?? new Set<string>();

      values.add(value);
      observed.set(key, values);
    }
  }

  return observed;
}

function countSeries(
  metricName: string,
  existingSeries: ReadonlySet<string>,
): number {
  const prefix = metricPrefix(metricName);
  let count = 0;

  for (const series of existingSeries) {
    if (series.startsWith(prefix)) {
      count += 1;
    }
  }

  return count;
}

/** Terapkan batas `maxTagKeys` dan `perTag` pada kandidat tag. */
function limitTags(
  metricName: string,
  tags: Record<string, string>,
  existingSeries: ReadonlySet<string>,
  overflowKeys: string[],
): Record<string, string> {
  const observed = collectObservedValues(metricName, existingSeries);
  const sortedKeys = Object.keys(tags).sort();
  const limited: Record<string, string> = {};

  for (const key of sortedKeys.slice(0, CARDINALITY_LIMITS.maxTagKeys)) {
    limited[key] = tags[key] ?? "";
  }

  for (const key of sortedKeys.slice(CARDINALITY_LIMITS.maxTagKeys)) {
    overflowKeys.push(key);
  }

  for (const [key, value] of Object.entries(limited)) {
    const known = observed.get(key);

    // Nilai yang sudah pernah dipakai tetap utuh walau kuota perTag habis.
    if (known?.has(value)) {
      continue;
    }

    if (known && known.size >= CARDINALITY_LIMITS.perTag) {
      limited[key] = OTHER_TAG_VALUE;
      overflowKeys.push(`${key}${KEY_VALUE_SEPARATOR}${value}`);
    }
  }

  return limited;
}

export function applyCardinalityLimits(
  tags: Record<string, string>,
  context: CardinalityContext,
): CardinalityResult {
  const { metricName, existingSeries } = context;
  const overflowKeys: string[] = [];
  const limited = limitTags(metricName, tags, existingSeries, overflowKeys);

  if (
    existingSeries.has(buildSeriesKey(metricName, limited)) ||
    countSeries(metricName, existingSeries) < CARDINALITY_LIMITS.totalSeries
  ) {
    return { tags: limited, overflowKeys };
  }

  // Batas total series terlampaui: series baru tidak boleh menambah nilai
  // unik, jadi seluruh nilainya dilipat ke `_other`.
  const collapsed: Record<string, string> = {};

  for (const key of Object.keys(limited).sort()) {
    const value = limited[key] ?? "";

    if (value !== OTHER_TAG_VALUE) {
      overflowKeys.push(`${key}${KEY_VALUE_SEPARATOR}${value}`);
    }

    collapsed[key] = OTHER_TAG_VALUE;
  }

  return { tags: collapsed, overflowKeys };
}
