import "server-only";

import { AUDIT_CATEGORIES, type AuditCategory } from "@/features/audit/schema";
import { getAuditStoreStats } from "@/features/audit/lib/store";

/**
 * TS-3 — Kebijakan storage log (NIST SP 800-92 §3.3).
 *
 * Retensi, transfer, korelasi, metode transfer, proteksi CIA, data reduction,
 * format log, dan monitoring storage. Kapasitas SELALU dihitung dari
 * `getAuditStoreStats()`; tidak ada angka kapasitas hardcode.
 */

export type StorageTier = "hot" | "warm" | "cold" | "archive";

export type RetentionPolicy = {
  category: AuditCategory;
  tier: StorageTier;
  retentionDays: number;
  rationale: string;
  regulatoryBasis: string;
  transferTo: StorageTier | null;
  transferAfterDays: number | null;
};

export const RETENTION_POLICIES: readonly RetentionPolicy[] = [
  {
    category: "auth",
    tier: "hot",
    retentionDays: 400,
    rationale: "Login gagal adalah indikator awal serangan brute force; retensi panjang untuk investigasi.",
    regulatoryBasis: "NIST SP 800-92; internally-mandated baseline",
    transferTo: "cold",
    transferAfterDays: 30,
  },
  {
    category: "authz",
    tier: "hot",
    retentionDays: 400,
    rationale: "Bukti perubahan hak akses dibutuhkan saat audit internal dan investigasi insider.",
    regulatoryBasis: "NIST SP 800-92; audit internal",
    transferTo: "cold",
    transferAfterDays: 30,
  },
  {
    category: "data",
    tier: "warm",
    retentionDays: 200,
    rationale: "Akses data sensitif diawasi untuk keperluan discovery dan forensik.",
    regulatoryBasis: "NIST SP 800-92; kebijakan perlindungan data",
    transferTo: "cold",
    transferAfterDays: 60,
  },
  {
    category: "config",
    tier: "hot",
    retentionDays: 730,
    rationale: "Perubahan konfigurasi memengaruhi perilaku sistem berbulan-bulan, jadi retensi dua tahun.",
    regulatoryBasis: "NIST SP 800-92; change management",
    transferTo: "archive",
    transferAfterDays: 90,
  },
  {
    category: "security",
    tier: "hot",
    retentionDays: 730,
    rationale: "Peringatan keamanan adalah bukti utama saat handling insiden.",
    regulatoryBasis: "NIST SP 800-92; incident response",
    transferTo: "archive",
    transferAfterDays: 90,
  },
  {
    category: "log",
    tier: "warm",
    retentionDays: 90,
    rationale: "Log aktivitas log sendiri hanya dibutuhkan untuk audit internal berkala.",
    regulatoryBasis: "NIST SP 800-92; audit internal",
    transferTo: "cold",
    transferAfterDays: 30,
  },
];

export function getRetentionPolicy(category: AuditCategory): RetentionPolicy | null {
  return RETENTION_POLICIES.find((policy) => policy.category === category) ?? null;
}

export type TransferPolicy = {
  id: string;
  name: string;
  description: string;
  confirmationRequired: boolean;
  loggingCategory: "log";
};

export const TRANSFER_POLICIES: readonly TransferPolicy[] = [
  {
    id: "hot-to-warm",
    name: "Hot ke Warm",
    description: "Otomatis setelah masa retensi tier hot habis; log tetap bisa dicari.",
    confirmationRequired: false,
    loggingCategory: "log",
  },
  {
    id: "warm-to-cold",
    name: "Warm ke Cold",
    description: "Otomatis setelah masa retensi tier warm habis; pencarian berubah menjadi sken.",
    confirmationRequired: false,
    loggingCategory: "log",
  },
  {
    id: "cold-to-archive",
    name: "Cold ke Archive",
    description: "Otomatis sebelum retensi kategori habis; arsip hanya dipulihkan atas permintaan.",
    confirmationRequired: false,
    loggingCategory: "log",
  },
  {
    id: "archive-restore",
    name: "Pemulihan arsip",
    description: "Pemulihan hanya atas permintaan tertulis dan tercatat sebagai event `log`.",
    confirmationRequired: true,
    loggingCategory: "log",
  },
];

export type CorrelationRule = {
  id: string;
  name: string;
  joinKey: string;
  windowMinutes: number;
  description: string;
};

export const CORRELATION_RULES: readonly CorrelationRule[] = [
  {
    id: "request-trace",
    name: "Jejak satu request",
    joinKey: "requestId",
    windowMinutes: 5,
    description: "Menggabungkan event runtime dan audit yang berasal dari satu request.",
  },
  {
    id: "actor-timeline",
    name: "Linimasa aktor",
    joinKey: "actor.id",
    windowMinutes: 60,
    description: "Mengurutkan seluruh aksi satu aktor untuk melihat pola escalation.",
  },
  {
    id: "auth-burst",
    name: "Burst autentikasi",
    joinKey: "source",
    windowMinutes: 5,
    description: "Menggabungkan percobaan login dari sumber yang sama untuk deteksi brute force.",
  },
  {
    id: "ip-user",
    name: "Hubungan IP dan user",
    joinKey: "metadata.ipHash",
    windowMinutes: 1440,
    description: "Menghubungkan IP hash dengan identitas pada jendela satu hari.",
  },
];

export type TransferMethod = {
  id: string;
  name: string;
  encryptionInTransit: boolean;
  encryptionAtRest: boolean;
  integrityCheck: string;
};

export const TRANSFER_METHODS: readonly TransferMethod[] = [
  {
    id: "bulk-export",
    name: "Ekspor massal terenkripsi",
    encryptionInTransit: true,
    encryptionAtRest: true,
    integrityCheck: "Verifikasi jumlah record dan checksum sebelum dan sesudah transfer.",
  },
  {
    id: "stream-replication",
    name: "Replikasi streaming",
    encryptionInTransit: true,
    encryptionAtRest: true,
    integrityCheck: "Bandingkan hash head sebelum dan sesudah transfer.",
  },
  {
    id: "manual-archive",
    name: "Arsip manual berkala",
    encryptionInTransit: true,
    encryptionAtRest: true,
    integrityCheck: "Catat jumlah file dan checksum arsip di log kategori `config`.",
  },
];

export type Ciaprotection = {
  confidentiality: string;
  integrity: string;
  availability: string;
};

export const STORAGE_PROTECTION: Ciaprotection = {
  confidentiality:
    "Enkripsi saat disimpan dan saat transit; redaksi metadata sensitif sebelum append.",
  integrity:
    "Hash chain SHA-256 per entry plus verifikasi berkala lewat `verifyAuditIntegrity()`.",
  availability:
    "Batas store 5000 entry, pencatatan overflow, dan retensi per kategori agar arsip tidak menumpuk di tier panas.",
};

export type DataReductionRule = {
  id: string;
  name: string;
  description: string;
  lossiness: "lossless" | "lossy";
};

export const DATA_REDUCTION_RULES: readonly DataReductionRule[] = [
  {
    id: "aggregation",
    name: "Agregasi",
    description: "Rangkum event berulang dari sumber yang sama menjadi satu baris per interval.",
    lossiness: "lossy",
  },
  {
    id: "thresholding",
    name: "Thresholding",
    description: "Abaikan event berfrekuensi rendah yang tidak pernah memicu insiden.",
    lossiness: "lossy",
  },
  {
    id: "sampling",
    name: "Sampling",
    description: "Simpan sampel event untuk memproses volume tinggi di luar jam sibuk.",
    lossiness: "lossy",
  },
  {
    id: "deduplication",
    name: "Eliminasi duplikasi",
    description: "Buang entry dengan hash identik dari pengiriman ulang agent.",
    lossiness: "lossless",
  },
];

export type LogFormat = {
  id: string;
  name: string;
  description: string;
  recommended: boolean;
};

export const LOG_FORMATS: readonly LogFormat[] = [
  {
    id: "structured-json",
    name: "JSON terstruktur",
    description: "Satu objek JSON per baris; mudah diparsing dan dikorelasikan lewat requestId.",
    recommended: true,
  },
  {
    id: "cef",
    name: "CEF",
    description: "Common Event Format; dipakai saat log diteruskan ke SIEM pihak ketiga.",
    recommended: false,
  },
  {
    id: "ltsv",
    name: "LTSV",
    description: "Labeled Tab-separated Values; ringan untuk volume sangat tinggi.",
    recommended: false,
  },
  {
    id: "syslog-rfc5424",
    name: "Syslog RFC 5424",
    description: "Standar untuk log sistem dan perangkat jaringan.",
    recommended: false,
  },
];

export type StorageMonitoringCheck = {
  id: string;
  name: string;
  description: string;
  threshold: string;
};

export const STORAGE_MONITORING_CHECKS: readonly StorageMonitoringCheck[] = [
  {
    id: "usage-ratio",
    name: "Persentase pemakaian store",
    description: "Entry tersimpan dibagi batas maksimum store in-memory.",
    threshold: "Peringatan di atas 80%.",
  },
  {
    id: "growth-rate",
    name: "Laju pertumbuhan",
    description: "Jumlah entry baru dalam 24 jam dibandingkan hari sebelumnya.",
    threshold: "Investigasi bila naik lebih dari 50% tanpa perubahan konfigurasi.",
  },
  {
    id: "overflow",
    name: "Entry terpotong",
    description: "Entry yang hilang karena store mencapai batas maksimum.",
    threshold: "Peringatan segera bila `droppedEntries` bertambah.",
  },
];

export type StorageCapacity = {
  /** Sumber angka: store in-memory, bukan storage log sungguhan. */
  basis: "audit-store-in-memory";
  totalEntries: number;
  maxEntries: number;
  droppedEntries: number;
  approximateSizeKB: number;
  usedRatio: number;
  usedPercent: number;
  remainingEntries: number;
  note: string;
};

export function getStorageCapacity(): StorageCapacity {
  const stats = getAuditStoreStats();
  const usedRatio =
    stats.maxEntries === 0 ? 0 : stats.totalEntries / stats.maxEntries;

  return {
    basis: "audit-store-in-memory",
    totalEntries: stats.totalEntries,
    maxEntries: stats.maxEntries,
    droppedEntries: stats.droppedEntries,
    approximateSizeKB: stats.approximateSizeKB,
    usedRatio,
    usedPercent: Math.round(usedRatio * 1000) / 10,
    remainingEntries: Math.max(0, stats.maxEntries - stats.totalEntries),
    note: "Angka berasal dari audit store in-memory proses Next.js, bukan storage log eksternal.",
  };
}

export const MONITORED_CATEGORIES: readonly AuditCategory[] = AUDIT_CATEGORIES;
