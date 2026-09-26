import "server-only";

import { METRIC_NAMES } from "@/features/observability/lib/constants";
import {
  DEFAULT_RETENTION_MS,
  getEarliestEvent,
  getEvents,
  getTotalEvents,
} from "@/features/observability/lib/store";

/**
 * Kebijakan retensi untuk **metric store in-memory** (`lib/store.ts`).
 *
 * PEMBATASAN WAJIB DIBACA — file ini bukan kebijakan retensi log/audit.
 * Retensi log sudah punya tempatnya sendiri: `RETENTION_POLICIES` di
 * `src/features/log-management/lib/storage.ts` dengan `StorageTier`
 * `hot | warm | cold | archive` dan bentuk `retentionDays` tunggal per
 * `AuditCategory`, plus disposal berjenjang di
 * `src/features/log-management/lib/disposal.ts`. Semua isi di bawah sengaja
 * tidak memakai ulang apa pun dari sana: bentuk datanya berbeda (metric store
 * butuh masa hot/warm/cold lalu `dispose`, bukan total `retentionDays`), sumber
 * datanya berbeda (event in-memory, bukan audit store), dan kebijakan log punya
 * jalur legal-hold yang tidak ada di metric store. Yang dipakai ulang hanya
 * bentuk umum saja: satu kebijakan per kelompok metrik, angka hari sebagai satu-satunya
 * sumber, dan tier yang monoton naik.
 *
 * Batasan yang harus jujur diucapkan: **state in-memory hilang saat restart.**
 * Retensi di sini mengatur berapa lama event masih tersedia di dalam satu
 * proses, bukan berapa lama data disimpan. `pruneExpiredEvents()` di store sudah
 * menjalankan pemangkasan berdasarkan `DEFAULT_RETENTION_MS` (7 hari); angka
 * tier di bawah adalah kebijakan yang menjelaskan angka hari: berapa lama metrik
 * masih berguna sebagai bahan diagnosa, dan berapa lama metrik itu harus
 * disimpan sebagai cadangan untuk storage time-series yang sesungguhnya. Jangan
 * memakai output fungsi ini sebagai klaim retensi durable di halaman publik.
 *
 * Tidak ada I/O ke luar, tidak ada env, tidak ada sumber data baru: fungsi
 * publiknya murni dan menerima `now` agar bisa diuji.
 */

export type RetentionTier = "hot" | "warm" | "cold" | "dispose";

export interface MetricRetentionPolicy {
  /** Id stabil kebab-case; kunci pengelompokan metrik. */
  id: string;
  label: string;
  description: string;
  /** Umur maksimum (hari) sebelum keluar dari tier hot. */
  hotDays: number;
  /** Umur maksimum (hari) sebelum keluar dari tier warm. */
  warmDays: number;
  /** Umur maksimum (hari) sebelum keluar dari tier cold. */
  coldDays: number;
  /**
   * Dasar retensi. Untuk metrik aggregat tanpa data pribadi, dasar ini adalah
   * kebutuhan operasional, bukan kewajiban regulasi — itu ditulis apa adanya
   * supaya tidak terlihat seperti klaim kepatuhan yang tidak berlaku.
   */
  legalBasis: string;
  /**
   * True bila store boleh memakai policy ini sebagai batas retensi otomatis.
   * False berarti policy hanya dokumentasi/UI: pruning yang berjalan tetap
   * memakai `DEFAULT_RETENTION_MS` milik store.
   */
  autoApply: boolean;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Angka hari hanya ada di sini; `getTierForAge()` tidak melakukan apa pun
 * selain aritmetika dari angka yang sama. Daftar metrik per kelompok ada di
 * `METRIC_GROUPS` di bawah.
 */
export const METRIC_RETENTION_POLICIES: MetricRetentionPolicy[] = [
  {
    id: "security-auth",
    label: "Metrik keamanan dan autentikasi",
    description:
      "Percobaan login, hasil MFA, rate limit, dan penolakan akses. Retensi paling pendek di semua kelompok: nilai metrik ini sensitif (mengindikasikan perilaku penyerang) dan volumenya tinggi, sehingga tidak layak disimpan lama di memori proses.",
    hotDays: 1,
    warmDays: 3,
    coldDays: 7,
    legalBasis:
      "Kebutuhan investigasi insiden jangka pendek. Bukan retensi audit: bukti login yang bertahan lama milik log audit (`log-management`), bukan metric store.",
    autoApply: true,
  },
  {
    id: "runtime-health",
    label: "Metrik kesehatan runtime",
    description:
      "Event loop lag, heap, RSS, CPU, uptime, dan biaya ingestion. Hanya berguna untuk diagnosis proses yang sedang berjalan: kalau prosesnya sudah restart, angka lamanya sudah tidak menggambarkan apa pun.",
    hotDays: 1,
    warmDays: 3,
    coldDays: 7,
    legalBasis:
      "Efisiensi operasional tanpa data pribadi. Tidak ada kewajiban regulasi; retensi pendek muncul karena nilai diagnostiknya cepat basi.",
    autoApply: true,
  },
  {
    id: "http-traffic",
    label: "Metrik lalu lintas HTTP",
    description:
      "Jumlah request, error, durasi, request aktif, dan latensi Server Action. Berguna untuk melihat tren dan regresi latensi, jadi retensinya paling panjang di antara metrik teknis.",
    hotDays: 3,
    warmDays: 14,
    coldDays: 30,
    legalBasis:
      "Analisis performa dan rekonstruksi insiden. Route sudah dinormalisasi oleh `normalizeRoute()` sehingga tidak ada path mentah yang bocor ke dalam metrik.",
    autoApply: true,
  },
  {
    id: "product-usage",
    label: "Metrik penggunaan produk",
    description:
      "Pembukaan halaman, command menu, dan aksi CRUD. Berguna untuk melihat adopsi fitur, tidak berguna untuk forensik, jadi tidak perlu bertahan sebulan.",
    hotDays: 2,
    warmDays: 8,
    coldDays: 14,
    legalBasis:
      "Kebutuhan analisis adopsi. Tanpa PII: identitas aktor sudah disamarkan oleh `redactTags()` sebelum event masuk store.",
    autoApply: true,
  },
  {
    id: "unclassified",
    label: "Metrik tanpa kebijakan khusus",
    description:
      "Fallback untuk nama metrik yang tidak tercakup kelompok mana pun. Paket retensi paling pendek supaya metrik yang tidak dikenal tidak menghuni penyimpanan lebih lama dari yang perlu.",
    hotDays: 1,
    warmDays: 3,
    coldDays: 7,
    legalBasis:
      "Fallback konservatif: retensi pendek sampai metriknya diklasifikasikan. Prudensi lebih baik daripada menyimpan data tak dikenal terlalu lama.",
    autoApply: false,
  },
];

/**
 * Metrik per kelompok. Satu grup bisa punya beberapa awalan (mis. seluruh
 * `auth.*` masuk kelompok keamanan). `unclassified` sengaja TIDAK disebut di
 * sini — ia fallback, bukan hasil pencocokan.
 */
const METRIC_GROUPS: Record<string, string[]> = {
  "security-auth": [
    METRIC_NAMES.LOGIN_ATTEMPT,
    METRIC_NAMES.LOGIN_SUCCESS,
    METRIC_NAMES.LOGIN_FAILURE,
    METRIC_NAMES.MFA_CHALLENGE,
    METRIC_NAMES.MFA_SUCCESS,
    METRIC_NAMES.MFA_FAILURE,
    METRIC_NAMES.RATE_LIMIT_HIT,
    METRIC_NAMES.ACCESS_DENIED,
  ],
  "runtime-health": [
    METRIC_NAMES.NODEJS_EVENT_LOOP_LAG,
    METRIC_NAMES.NODEJS_MEMORY_HEAP_USED_BYTES,
    METRIC_NAMES.NODEJS_MEMORY_RSS_BYTES,
    METRIC_NAMES.PROCESS_CPU_USER_MS,
    METRIC_NAMES.PROCESS_UPTIME_SECONDS,
    METRIC_NAMES.OBSERVABILITY_INGEST_BYTES,
    METRIC_NAMES.OBSERVABILITY_COST_USD,
  ],
  "http-traffic": [
    METRIC_NAMES.HTTP_SERVER_REQUEST_COUNT,
    METRIC_NAMES.HTTP_SERVER_ERROR_COUNT,
    METRIC_NAMES.HTTP_SERVER_REQUEST_DURATION,
    METRIC_NAMES.HTTP_SERVER_ACTIVE_REQUESTS,
    METRIC_NAMES.SERVER_ACTION_LATENCY,
  ],
  "product-usage": [
    METRIC_NAMES.PAGE_VIEW,
    METRIC_NAMES.COMMAND_MENU_OPEN,
    METRIC_NAMES.USER_CREATE,
    METRIC_NAMES.USER_UPDATE,
    METRIC_NAMES.USER_DELETE,
    METRIC_NAMES.CONTACT_MESSAGE,
  ],
};

const FALLBACK_POLICY_ID = "unclassified";

function policyById(id: string): MetricRetentionPolicy | null {
  return METRIC_RETENTION_POLICIES.find((policy) => policy.id === id) ?? null;
}

function fallbackPolicy(): MetricRetentionPolicy {
  // Policy fallback selalu ada di konstanta di atas, tapi `find()` mengembalikan
  // `null`; error di sini lebih baik daripada `!` atau type assertion.
  const found = policyById(FALLBACK_POLICY_ID);

  if (!found) {
    throw new Error(`Policy retensi fallback "${FALLBACK_POLICY_ID}" tidak ada di konfigurasi.`);
  }

  return found;
}

/**
 * Tier untuk usia event tertentu.
 *
 * Sifat yang dijamin di sini:
 * - **Monoton**: usia lebih tua tidak pernah menghasilkan tier yang lebih
 *   "muda" (hot → warm → cold → dispose, tidak ada lompatan balik).
 * - **Aman untuk usia negatif**: event bertimestamp di masa depan (jam server
 *   meleset, penyesuaian jam) dianggap `hot`, bukan `dispose`.
 * - Batas tier bersifat setengah terbuka: `[0, hotDays)` = hot, dan seterusnya,
 *   jadi `hotDays` yang persis sudah masuk warm.
 */
export function getTierForAge(
  ageMs: number,
  policy: MetricRetentionPolicy,
): RetentionTier {
  if (!Number.isFinite(ageMs) || ageMs < 0) {
    return "hot";
  }

  const hotMs = policy.hotDays * MS_PER_DAY;
  const warmMs = policy.warmDays * MS_PER_DAY;
  const coldMs = policy.coldDays * MS_PER_DAY;

  if (ageMs < hotMs) {
    return "hot";
  }

  if (ageMs < hotMs + warmMs) {
    return "warm";
  }

  if (ageMs < hotMs + warmMs + coldMs) {
    return "cold";
  }

  return "dispose";
}

/** Total masa sebelum sebuah event di-tier `dispose`. */
export function getRetentionWindowMs(policy: MetricRetentionPolicy): number {
  return (policy.hotDays + policy.warmDays + policy.coldDays) * MS_PER_DAY;
}

/**
 * Policy untuk satu nama metrik. Metrik yang tidak dikenal mendapat policy
 * fallback, bukan error: nama metrik baru bisa muncul kapan saja (mis. dari
 * exporter nanti) dan halaman retensi tidak boleh gagal total karena itu.
 */
export function getPolicyForMetric(metricName: string): MetricRetentionPolicy {
  for (const policy of METRIC_RETENTION_POLICIES) {
    const metrics = METRIC_GROUPS[policy.id];

    if (!metrics) {
      continue;
    }

    if (metrics.includes(metricName)) {
      return policy;
    }
  }

  return fallbackPolicy();
}

/**
 * Daftar policy lengkap dengan metrik yang dicakupnya, untuk tabel UI.
 * `metrics` diurutkan agar output deterministik.
 */
export function listMetricRetentionPolicies(): Array<
  MetricRetentionPolicy & { metrics: string[] }
> {
  return METRIC_RETENTION_POLICIES.map((policy) => {
    const metrics = [...(METRIC_GROUPS[policy.id] ?? [])].sort();

    return { ...policy, metrics };
  });
}

export type RetentionPolicySummary = MetricRetentionPolicy & {
  metrics: string[];
  /** Total hari dari hot sampai keluar dari cold. */
  totalDays: number;
  /** Tier store pada `now`, berdasarkan event tertua di kelompok ini. */
  currentTier: RetentionTier;
  /** Usia event tertua di kelompok ini dalam ms; `null` bila store kosong. */
  oldestAgeMs: number | null;
  oldestEventAt: string | null;
  /** Jumlah event di store yang memakai policy ini. */
  eventCount: number;
};

export interface RetentionSummary {
  policies: RetentionPolicySummary[];
  /** ISO timestamp event tertua di seluruh store; `null` bila store kosong. */
  oldestEventAt: string | null;
  /** Batas retensi nyata yang dipakai store saat prune. */
  defaultRetentionMs: number;
  totalEvents: number;
  /** Catatan: state ini hilang saat restart, jadi angka ini bukan retensi durable. */
  volatile: boolean;
}

type PolicyBuckets = {
  oldest: { timestamp: number; at: string } | null;
  count: number;
};

/**
 * Ringkasan retensi untuk UI: per policy — tier saat ini, usia event tertua,
 * jumlah event — ditambah batas retensi store yang sebenarnya.
 *
 * Fungsi ini hanya membaca store dan tidak pernah melempar.
 */
export function summarizeRetention(now: number = Date.now()): RetentionSummary {
  const policies = listMetricRetentionPolicies();
  const buckets = new Map<string, PolicyBuckets>();

  for (const policy of policies) {
    buckets.set(policy.id, { oldest: null, count: 0 });
  }

  for (const event of getEvents()) {
    const policy = getPolicyForMetric(event.name);
    const bucket = buckets.get(policy.id);

    if (!bucket) {
      continue;
    }

    bucket.count += 1;
    const timestamp = Date.parse(event.timestamp);

    if (Number.isNaN(timestamp)) {
      continue;
    }

    if (bucket.oldest === null || timestamp < bucket.oldest.timestamp) {
      bucket.oldest = { timestamp, at: event.timestamp };
    }
  }

  return {
    policies: policies.map((policy) => {
      const bucket = buckets.get(policy.id) ?? { oldest: null, count: 0 };
      const oldestAgeMs = bucket.oldest === null ? null : now - bucket.oldest.timestamp;

      return {
        ...policy,
        totalDays: policy.hotDays + policy.warmDays + policy.coldDays,
        currentTier:
          oldestAgeMs === null
            ? "hot"
            : getTierForAge(oldestAgeMs, policy),
        oldestAgeMs,
        oldestEventAt: bucket.oldest?.at ?? null,
        eventCount: bucket.count,
      };
    }),
    oldestEventAt: getEarliestEvent()?.timestamp ?? null,
    defaultRetentionMs: DEFAULT_RETENTION_MS,
    totalEvents: getTotalEvents(),
    volatile: true,
  };
}

/**
 * Nama metrik yang tercatat di store tapi tidak masuk kelompok mana pun.
 * Tipenya `string`, bukan `MetricName`: nama dari exporter nanti belum tentu
 * terdaftar di `METRIC_NAMES`, dan tipe itu tidak boleh dipalsukan.
 */
export function listUnclassifiedMetrics(): string[] {
  const known = new Set<string>(METRIC_RETENTION_POLICIES.flatMap(
    (policy) => METRIC_GROUPS[policy.id] ?? [],
  ));
  const unclassified = new Set<string>();

  for (const event of getEvents()) {
    if (!known.has(event.name)) {
      unclassified.add(event.name);
    }
  }

  return [...unclassified].sort();
}
