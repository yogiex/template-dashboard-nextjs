import "server-only";

import { AUDIT_CATEGORIES, type AuditCategory } from "@/features/audit/schema";
import type { DisposalMethod } from "@/features/log-management/schema";
import { getRetentionPolicy } from "@/features/log-management/lib/storage";

/**
 * TS-5 — Kebijakan disposal log (NIST SP 800-92 §3.5).
 *
 * Metode disposal mengikuti NIST SP 800-88 Rev.1. Angka retensi dan grace
 * period diambil dari `getRetentionPolicy()` supaya tidak ada duplikasi sumber
 * kebenaran.
 */

export const DISPOSAL_STANDARD = "NIST SP 800-88 Rev.1" as const;

export type MediaType = "logical-store" | "backup-media" | "physical-media";

export type DisposalPolicy = {
  category: AuditCategory;
  method: DisposalMethod;
  media: MediaType;
  standard: string;
  /** Diambil dari kebijakan retensi, bukan angka terpisah. */
  retentionDays: number;
  /** Masa tunggu sebelum item benar-benar boleh dihapus. */
  gracePeriodHours: number;
  rationale: string;
  verification: string;
  monitoring: string;
};

const GRACE_PERIOD_BY_CATEGORY: Record<AuditCategory, number> = {
  auth: 72,
  authz: 72,
  data: 168,
  config: 336,
  security: 336,
  log: 24,
};

const RATIONALE_BY_CATEGORY: Record<AuditCategory, string> = {
  auth: "Log autentikasi di-shred lewat penghapusan kunci enkripsi agar tidak bisa dipulihkan tanpa menghancurkan media.",
  authz: "Log otorisasi punya nilai investigasi tinggi, jadi dihapus dengan overwrite bertahap di media logis.",
  data: "Log akses data mengandung metadata identitas, sehingga dihapus lewat secure delete setelah grace period seminggu.",
  config: "Log konfigurasi berumur panjang, jadi hanya dihapus dengan overwrite di media logis lalu arsip ikut dibersihkan.",
  security: "Log keamanan disimpan paling lama dan dihapus terakhir lewat secure delete.",
  log: "Log aktivitas pencatatan log sendiri paling ephemeral dan dihapus lebih cepat lewat crypto shredding.",
};

const VERIFICATION_BY_METHOD: Record<DisposalMethod, string> = {
  "crypto-shredding":
    "Verifikasi kunci enkripsi dihapus dan dekripsi gagal, lalu jalankan verifikasi rantai hash.",
  "secure-delete":
    "Verifikasi dengan read-back pada blok yang disanitasi dan pastikan tidak ada salinan di backup dalam masa retensi.",
  overwrite:
    "Verifikasi dengan read-back pada blok yang di-overwrite dan cocokkan checksum dengan pola nol.",
  "physical-destruction":
    "Verifikasi lewat sertifikat penghancuran media dan foto serah terima, bukan lewat pembacaan data.",
};

const MONITORING_BY_CATEGORY: Record<AuditCategory, string> = {
  auth: "Pantau jumlah item disposal gagal dan selisih antara jadwal dan eksekusi.",
  authz: "Pantau item disposal yang tertunda lebih dari satu periode retensi.",
  data: "Pantau kegagalan disposal dan pastikan backup ikut melewati siklus disposal.",
  config: "Pantau laundry list arsip yang belum dibersihkan.",
  security: "Pantau kegagalan disposal sebagai sinyal integrity incident.",
  log: "Pantau pertumbuhan antrian disposal kategori `log` sebagai Leading indicator.",
};

function buildPolicy(category: AuditCategory): DisposalPolicy {
  const retention = getRetentionPolicy(category);
  const method: DisposalMethod =
    category === "auth" || category === "log"
      ? "crypto-shredding"
      : category === "config"
        ? "overwrite"
        : "secure-delete";

  return {
    category,
    method,
    media: category === "security" || category === "authz" ? "backup-media" : "logical-store",
    standard: DISPOSAL_STANDARD,
    retentionDays: retention?.retentionDays ?? 365,
    gracePeriodHours: GRACE_PERIOD_BY_CATEGORY[category],
    rationale: RATIONALE_BY_CATEGORY[category],
    verification: VERIFICATION_BY_METHOD[method],
    monitoring: MONITORING_BY_CATEGORY[category],
  };
}

export const DISPOSAL_POLICIES: readonly DisposalPolicy[] = AUDIT_CATEGORIES.map(buildPolicy);

export function getDisposalPolicy(category: AuditCategory): DisposalPolicy {
  return buildPolicy(category);
}

export type UnauthorizedDisposalPrevention = {
  id: string;
  name: string;
  description: string;
  enforcedInTemplate: boolean;
  implementationNote: string;
};

/**
 * Pencegahan penghapusan tidak sah. `enforcedInTemplate` jujur soal apa yang
 * benar-benar dijalankan di repo ini vs apa yang hanya desain kebijakan.
 */
export const UNAUTHORIZED_DISPOSAL_PREVENTION: readonly UnauthorizedDisposalPrevention[] = [
  {
    id: "hash-chain",
    name: "Hash chain",
    description: "Setiap entry berantai hash sehingga penghapusan atau modifikasi terdeteksi.",
    enforcedInTemplate: true,
    implementationNote: "Dihitung oleh `verifyAuditIntegrity()`; belum ada alert otomatis.",
  },
  {
    id: "approval",
    name: "Persetujuan",
    description: "Disposal tidak dijalankan sebelum ada approval role admin.",
    enforcedInTemplate: true,
    implementationNote: "Diterapkan lewat status antrian `scheduled` → `approved`.",
  },
  {
    id: "dual-control",
    name: "Dual control",
    description: "Pemohon dan pemberi approval harus orang berbeda.",
    enforcedInTemplate: false,
    implementationNote:
      "Butuh identitas pemohon nyata; `requireSession()` saat ini mengembalikan satu placeholder.",
  },
  {
    id: "grace-period",
    name: "Grace period",
    description: "Jeda antara masa retensi habis dan penghapusan dijalankan.",
    enforcedInTemplate: true,
    implementationNote: "Dihitung dari `gracePeriodHours` per kategori.",
  },
  {
    id: "preservation-order",
    name: "Preservation order",
    description: "Legal hold dan investigasi insiden membekukan disposal.",
    enforcedInTemplate: false,
    implementationNote: "Kebijakan terdefinisi; belum ada mekanisme hold di template ini.",
  },
];

export type DisposalVerificationStep = {
  id: string;
  name: string;
  automated: boolean;
  description: string;
};

export const DISPOSAL_VERIFICATION_STEPS: readonly DisposalVerificationStep[] = [
  {
    id: "chain-verify",
    name: "Verifikasi rantai hash",
    automated: true,
    description: "Pastikan rantai hash utuh sebelum penghapusan dijalankan.",
  },
  {
    id: "read-back",
    name: "Read-back area yang disanitasi",
    automated: false,
    description: "Baca ulang blok yang disanitasi untuk memastikan tidak ada data tersisa.",
  },
  {
    id: "backup-cycle",
    name: "Kepatuhan siklus backup",
    automated: false,
    description: "Pastikan salinan backup melewati siklus retensi yang sama.",
  },
  {
    id: "certificate",
    name: "Sertifikat penghancuran",
    automated: false,
    description: "Simpan bukti serah terima untuk media fisik.",
  },
];
