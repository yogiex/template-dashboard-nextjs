import { AppError } from "@/lib/error";

/**
 * Rate limiter in-memory dengan *sliding window counter* yang akurat.
 *
 * Fixed window (yang dipakai sebelumnya) bisa dilewati di batas jendela: 5
 * percobaan pada detik terakhir jendela lama ditambah 5 pada detik pertama
 * jendela baru = 10 percobaan dalam rentang waktu yang sangat singkat.
 * Sliding window menyimpan timestamp tiap percobaan dan selalu membuang
 * timestamp yang sudah keluar dari jendela sebelum menghitung, sehingga
 * `maxAttempts` benar-benar berlaku untuk setiap rentang `windowMs` bergeser.
 *
 * Alternatif yang lebih murah adalah *two-bucket weighted sliding window
 * counter*, tapi itu hanya estimasi. Yang dipakai di sini adalah hitungan
 * eksak; konsekuensinya array timestamp per identifier, karena itu dibatasi
 * `MAX_TRACKED_ATTEMPTS` agar tidak tumbuh tanpa batas.
 *
 * State dan interval cleanup ditempel di `globalThis` dengan `Symbol.for`
 * supaya tidak hilang atau terduplikasi saat modul dievaluasi ulang (HMR/dev).
 */

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60_000;
const CLEANUP_INTERVAL_MS = 60_000;

/** Batas per identifier; cukup untuk window jauh di atas default. */
const MAX_TRACKED_ATTEMPTS = 1000;

const STORE_KEY = Symbol.for("template.rate-limit");

/** Timestamp (ms) percobaan yang masih berada di dalam jendela. */
type Attempts = number[];

/** Satu key limit: `purpose:maxAttempts:windowMs`. */
type LimitBucket = {
  windowMs: number;
  /** identifier -> timestamp percobaan. */
  entries: Map<string, Attempts>;
};

type RateLimitStore = {
  buckets: Map<string, LimitBucket>;
  /** Disimpan agar interval tidak didaftarkan dua kali saat re-evaluasi modul. */
  cleanupInterval: ReturnType<typeof setInterval> | null;
};

type GlobalWithStore = typeof globalThis & { [STORE_KEY]?: RateLimitStore };

export type RateLimitOptions = {
  maxAttempts?: number;
  windowMs?: number;
};

export type RateLimitState = {
  /** Percobaan yang tercatat di dalam jendela saat ini. */
  count: number;
  /** Sisa kuota sebelum permintaan berikutnya ditolak. */
  remaining: number;
  /** Waktu (epoch ms) saat kuota pulih lagi. */
  resetAt: number;
  /** True bila permintaan berikutnya sudah pasti ditolak. */
  limited: boolean;
};

function getStore(): RateLimitStore {
  const globalStore = globalThis as GlobalWithStore;
  const existing = globalStore[STORE_KEY];

  if (existing) {
    return existing;
  }

  const created: RateLimitStore = {
    buckets: new Map(),
    cleanupInterval: null,
  };

  globalStore[STORE_KEY] = created;

  return created;
}

/** Limit yang berbeda harus punya bucket sendiri, jadi masukkan limit ke key. */
function bucketKey(purpose: string, maxAttempts: number, windowMs: number): string {
  return `${purpose}:${maxAttempts}:${windowMs}`;
}

function getBucket(
  purpose: string,
  maxAttempts: number,
  windowMs: number,
  create: boolean,
): LimitBucket | undefined {
  const store = getStore();
  const key = bucketKey(purpose, maxAttempts, windowMs);
  const existing = store.buckets.get(key);

  if (existing) {
    return existing;
  }

  if (!create) {
    return undefined;
  }

  const created: LimitBucket = { windowMs, entries: new Map() };

  store.buckets.set(key, created);

  return created;
}

/** Buang timestamp yang sudah keluar dari jendela sliding. */
function prune(timestamps: Attempts, now: number, windowMs: number): Attempts {
  const threshold = now - windowMs;
  let firstActive = 0;

  while (firstActive < timestamps.length && timestamps[firstActive] <= threshold) {
    firstActive += 1;
  }

  return firstActive === 0 ? timestamps : timestamps.slice(firstActive);
}

function cleanupStore(store: RateLimitStore, now: number): void {
  for (const [key, bucket] of store.buckets) {
    for (const [identifier, timestamps] of bucket.entries) {
      const active = prune(timestamps, now, bucket.windowMs);

      if (active.length === 0) {
        bucket.entries.delete(identifier);
      } else if (active.length !== timestamps.length) {
        bucket.entries.set(identifier, active);
      }
    }

    if (bucket.entries.size === 0) {
      store.buckets.delete(key);
    }
  }
}

function ensureCleanup(): void {
  const store = getStore();

  if (store.cleanupInterval) {
    return;
  }

  const interval = setInterval(() => {
    cleanupStore(getStore(), Date.now());
  }, CLEANUP_INTERVAL_MS);

  // Cleanup tidak boleh menahan event loop tetap hidup.
  interval.unref?.();
  store.cleanupInterval = interval;
}

/** Catat satu percobaan dan kembalikan timestamp yang masih aktif. */
function recordAttempt(
  identifier: string,
  purpose: string,
  maxAttempts: number,
  windowMs: number,
): Attempts {
  const bucket = getBucket(purpose, maxAttempts, windowMs, true) as LimitBucket;
  const now = Date.now();
  const timestamps = prune(bucket.entries.get(identifier) ?? [], now, windowMs);

  timestamps.push(now);

  if (timestamps.length > MAX_TRACKED_ATTEMPTS) {
    timestamps.splice(0, timestamps.length - MAX_TRACKED_ATTEMPTS);
  }

  bucket.entries.set(identifier, timestamps);
  ensureCleanup();

  return timestamps;
}

export function enforceRateLimit(
  identifier: string,
  purpose: string,
  options: RateLimitOptions = {},
): void {
  const maxAttempts = options.maxAttempts ?? MAX_ATTEMPTS;
  const windowMs = options.windowMs ?? WINDOW_MS;
  const timestamps = recordAttempt(identifier, purpose, maxAttempts, windowMs);

  if (timestamps.length > maxAttempts) {
    // Pesan tetap generik (`AppError` memakai USER_MESSAGES): angka threshold
    // dan panjang jendela tidak boleh bocor ke user.
    throw new AppError("RATE_LIMITED");
  }
}

/**
 * Status rate limit saat ini tanpa mencatat percobaan baru. Untuk UI/diagnostik
 * internal; jangan pernah menampilkan angka threshold ke user.
 */
export function getRateLimitState(
  identifier: string,
  purpose: string,
  options: RateLimitOptions = {},
): RateLimitState {
  const maxAttempts = options.maxAttempts ?? MAX_ATTEMPTS;
  const windowMs = options.windowMs ?? WINDOW_MS;
  const now = Date.now();
  const bucket = getBucket(purpose, maxAttempts, windowMs, false);
  const timestamps = prune(bucket?.entries.get(identifier) ?? [], now, windowMs);

  if (bucket && timestamps.length > 0) {
    bucket.entries.set(identifier, timestamps);
  }

  const count = timestamps.length;

  return {
    count,
    remaining: Math.max(0, maxAttempts - count),
    resetAt: count > 0 ? timestamps[0] + windowMs : now,
    limited: count >= maxAttempts,
  };
}

/**
 * Hapus catatan untuk satu identifier pada sebuah purpose. Tanpa `options`,
 * semua varian limit untuk purpose tersebut ikut dibersihkan. Dipakai oleh
 * testing dan tooling operasional.
 */
export function resetRateLimit(
  identifier: string,
  purpose: string,
  options: RateLimitOptions = {},
): void {
  const store = getStore();
  const hasExactLimit =
    options.maxAttempts !== undefined || options.windowMs !== undefined;
  const exactKey = hasExactLimit
    ? bucketKey(
        purpose,
        options.maxAttempts ?? MAX_ATTEMPTS,
        options.windowMs ?? WINDOW_MS,
      )
    : null;

  for (const [key, bucket] of [...store.buckets]) {
    const matches = exactKey ? key === exactKey : key.startsWith(`${purpose}:`);

    if (!matches) {
      continue;
    }

    bucket.entries.delete(identifier);

    if (bucket.entries.size === 0) {
      store.buckets.delete(key);
    }
  }
}
