/**
 * Normalisasi pathname dan HTTP method supaya aman dipakai sebagai nilai tag
 * metrik.
 *
 * Tanpa langkah ini, `http.route = /users/123` membuat satu series baru untuk
 * setiap user dan jumlah series meledak. Aturan yang dipakai:
 *
 * - query string dan fragment dibuang;
 * - segment angka menjadi `:id`, UUID menjadi `:uuid`, hex panjang menjadi
 *   `:hash`, email/encoded segment menjadi `:segment`;
 * - path dinormalisasi ke huruf kecil dan trailing slash dihapus;
 * - hasil dibatasi 120 karakter;
 * - fungsi ini idempoten: `normalizeRoute(normalizeRoute(x))` menghasilkan
 *   string yang sama.
 */

const MAX_ROUTE_LENGTH = 120;

/** Panjang termurah untuk dianggap hash, bukan teks biasa. */
const HASH_MIN_LENGTH = 16;

const TRUNCATION_SEGMENT = ":segment";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const HEX_PATTERN = /^[0-9a-f]+$/;

const DIGIT_PATTERN = /^\d+$/;

const ALLOWED_METHODS = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
] as const;

export const OTHER_METHOD = "OTHER";

/**
 * Ubah satu segmen path menjadi bentuk(low-cardinality).
 * Segmen yang sudah berupa placeholder (`:id`, `:uuid`, `:hash`, `:segment`)
 * tidak diubah sehingga hasilnya idempoten.
 */
function normalizeSegment(segment: string): string {
  if (segment.startsWith(":")) {
    return segment;
  }

  if (DIGIT_PATTERN.test(segment)) {
    return ":id";
  }

  if (UUID_PATTERN.test(segment)) {
    return ":uuid";
  }

  if (segment.includes("@") || segment.includes("%")) {
    return TRUNCATION_SEGMENT;
  }

  if (segment.length >= HASH_MIN_LENGTH && HEX_PATTERN.test(segment)) {
    return ":hash";
  }

  return segment;
}

/** Buang query string, fragment, dan segmen kosong (slash ganda/trailing). */
function toSegments(pathname: string): string[] {
  const withoutQuery = pathname.split(/[?#]/, 1)[0] ?? "";

  return withoutQuery
    .split("/")
    .map((segment) => segment.trim().toLowerCase())
    .filter((segment) => segment.length > 0)
    .map(normalizeSegment);
}

/**
 * Kalau hasil rakitan melebihi batas, buang ekor segmen dan tutup dengan
 * `:segment`. Hasil truncate selalu lebih pendek dari batas, jadi pass kedua
 * tidak memotong lagi dan idempotensi tetap terjaga.
 */
function truncate(segments: string[]): string {
  const budget = MAX_ROUTE_LENGTH - TRUNCATION_SEGMENT.length;
  const kept: string[] = [];
  let used = 1;

  for (const segment of segments) {
    if (used + segment.length + 1 > budget) {
      break;
    }

    used += segment.length + 1;
    kept.push(segment);
  }

  return `/${[...kept, TRUNCATION_SEGMENT].join("/")}`;
}

export function normalizeRoute(pathname: string): string {
  const segments = toSegments(pathname);

  if (segments.length === 0) {
    return "/";
  }

  const route = `/${segments.join("/")}`;

  if (route.length <= MAX_ROUTE_LENGTH) {
    return route;
  }

  return truncate(segments);
}

export function normalizeMethod(method: string): string {
  const candidate = method.trim().toUpperCase();

  return ALLOWED_METHODS.find((allowed) => allowed === candidate) ?? OTHER_METHOD;
}
