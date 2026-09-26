import "server-only";

import type { AuditCategory } from "@/features/audit/schema";
import { RETENTION_POLICIES } from "@/features/log-management/lib/storage";

/**
 * TS-4 — Kebijakan akses log (NIST SP 800-92 §3.4).
 *
 * Level akses per role, akses remote/indirect, policy pencatatan akses,
 * proteksi akses (MFA, session timeout, IP allowlist, time restriction),
 * urutan preservasi, dan monitoring akses.
 */

export type AccessLevel =
  | "none"
  | "read-own"
  | "read-category"
  | "read-all"
  | "admin";

export type WorkRole = "admin" | "editor" | "viewer" | "auditor";

export type AccessGrant = {
  role: WorkRole;
  level: AccessLevel;
  /** Kategori yang boleh dibaca; `["*"]` berarti semua kategori. */
  scope: AuditCategory[] | ["*"];
  conditions: string[];
  approvalRequired: boolean;
};

export const ACCESS_MATRIX: readonly AccessGrant[] = [
  {
    role: "viewer",
    level: "read-own",
    scope: ["*"],
    conditions: ["Hanya log dengan `actor.id` miliknya sendiri", "Tidak boleh mengekspor"],
    approvalRequired: false,
  },
  {
    role: "editor",
    level: "read-category",
    scope: ["auth", "data", "config", "log"],
    conditions: ["Tidak boleh membaca kategori `authz`", "Ekspor perlu persetujuan admin"],
    approvalRequired: true,
  },
  {
    role: "auditor",
    level: "read-category",
    scope: ["auth", "authz", "config", "security", "log"],
    conditions: ["Akses hanya pada jam kerja", "Setiap akses direkam penuh"],
    approvalRequired: false,
  },
  {
    role: "admin",
    level: "admin",
    scope: ["*"],
    conditions: ["MFA wajib", "Perubahan retention dan disposal perlu dual control"],
    approvalRequired: true,
  },
];

export function getAccessGrant(role: WorkRole): AccessGrant | null {
  return ACCESS_MATRIX.find((grant) => grant.role === role) ?? null;
}

export type AccessMode = "direct" | "remote" | "indirect";

export type AccessModePolicy = {
  id: AccessMode;
  label: string;
  description: string;
  additionalControls: string[];
  audited: boolean;
};

export const ACCESS_MODE_POLICIES: readonly AccessModePolicy[] = [
  {
    id: "direct",
    label: "Akses langsung",
    description: "Pengguna membuka log lewat antarmuka aplikasi di jaringan internal.",
    additionalControls: ["MFA", "Session timeout"],
    audited: true,
  },
  {
    id: "remote",
    label: "Akses remote",
    description: "Akses dari luar jaringan internal melalui VPN.",
    additionalControls: ["MFA", "IP allowlist", "Session timeout", "Time restriction"],
    audited: true,
  },
  {
    id: "indirect",
    label: "Akses tidak langsung",
    description: "Log dipakai sistem lain: dasbor BI, alert, atau ekspor terjadwal.",
    additionalControls: ["Token scoped per dasbor", "Ekspor tercatat sebagai event `log`"],
    audited: true,
  },
];

export type AccessProtection = {
  id: string;
  name: string;
  value: string;
  appliesTo: WorkRole[];
};

export const ACCESS_PROTECTIONS: readonly AccessProtection[] = [
  {
    id: "mfa",
    name: "Multi-factor authentication",
    value: "Wajib untuk role admin dan auditor; opsional untuk editor.",
    appliesTo: ["admin", "auditor", "editor"],
  },
  {
    id: "session-timeout",
    name: "Session timeout",
    value: "15 menit idle, 8 jam absolute, tanpa Remember me untuk akses log.",
    appliesTo: ["admin", "auditor", "editor", "viewer"],
  },
  {
    id: "ip-allowlist",
    name: "IP allowlist",
    value: "Hanya IP jaringan internal yang boleh mengakses log; VPN untuk akses remote.",
    appliesTo: ["admin", "auditor"],
  },
  {
    id: "time-restriction",
    name: "Pembatasan waktu",
    value: "Akses kategori `authz` dan `security` hanya pukul 07.00-19.00 waktu kerja.",
    appliesTo: ["auditor", "editor"],
  },
  {
    id: "least-privilege",
    name: "Least privilege",
    value: "Tidak ada role yang bisa membaca log dan sekaligus mengubah kebijakan log.",
    appliesTo: ["admin", "auditor", "editor", "viewer"],
  },
];

export type AccessLoggingRule = {
  id: string;
  name: string;
  description: string;
  category: "log";
  minimumSeverity: "info" | "warning" | "critical";
};

export const ACCESS_LOGGING_RULES: readonly AccessLoggingRule[] = [
  {
    id: "log-access",
    name: "Akses terhadap log",
    description: "Setiap query, filter, dan halaman log yang dibuka dicatat sebagai event `log`.",
    category: "log",
    minimumSeverity: "info",
  },
  {
    id: "log-export",
    name: "Ekspor log",
    description: "Ekspor log dicatat lengkap dengan aktor, cakupan, dan jumlah baris.",
    category: "log",
    minimumSeverity: "warning",
  },
  {
    id: "retention-change",
    name: "Perubahan kebijakan retensi",
    description: "Perubahan hari retensi atau tier dicatat sebagai event `config`.",
    category: "log",
    minimumSeverity: "warning",
  },
  {
    id: "disposal-execution",
    name: "Eksekusi disposal",
    description: "Penghapusan log dicatat sebagai event `log` dengan identitas pelaku dan metode.",
    category: "log",
    minimumSeverity: "critical",
  },
];

/**
 * Preservation order. Item yang lebih tinggi menang ketika ada konflik antara
 * legal hold, investigasi insiden, dan jadwal retensi normal.
 */
export type PreservationSource = {
  id: "legal-hold" | "incident-investigation" | "retention-policy";
  priority: number;
  label: string;
  description: string;
  blocksDisposal: boolean;
};

export const PRESERVATION_ORDER: readonly PreservationSource[] = [
  {
    id: "legal-hold",
    priority: 1,
    label: "Legal hold",
    description:
      "Permintaan tertulis pihak yang berwenang membekukan penghapusan sampai dilepas secara resmi.",
    blocksDisposal: true,
  },
  {
    id: "incident-investigation",
    priority: 2,
    label: "Investigasi insiden",
    description: "Log yang sedang dipakai dalam investigasi insiden aktif tidak boleh dihapus.",
    blocksDisposal: true,
  },
  {
    id: "retention-policy",
    priority: 3,
    label: "Kebijakan retensi normal",
    description: "Jadwal retensi berjalan hanya bila tidak ada hold di atasnya.",
    blocksDisposal: false,
  },
];

export type AccessMonitoringCheck = {
  id: string;
  name: string;
  description: string;
  escalation: "info" | "warning" | "critical";
};

export const ACCESS_MONITORING_CHECKS: readonly AccessMonitoringCheck[] = [
  {
    id: "bulk-access",
    name: "Akses massal",
    description: "Satu aktor membuka lebih dari 500 baris log dalam 10 menit.",
    escalation: "warning",
  },
  {
    id: "off-hours-access",
    name: "Akses di luar jam kerja",
    description: "Akses kategori sensitif di luar 07.00-19.00.",
    escalation: "warning",
  },
  {
    id: "repeated-failure",
    name: "Kegagalan akses berulang",
    description: "Role yang tidak punya akses mencoba membuka log berulang kali.",
    escalation: "critical",
  },
  {
    id: "export-after-hold",
    name: "Ekspor saat legal hold",
    description: "Ekspor log saat hold aktif perlu persetujuan tertulis tambahan.",
    escalation: "critical",
  },
];

/**
 * Preservation map per kategori: retensi mana yang berlaku bila hold aktif.
 * Dihitung dari `RETENTION_POLICIES` supaya tidak mengulang angka.
 */
export function getPreservationBaseline(): Array<{
  category: AuditCategory;
  retentionDays: number;
  blockingSources: string[];
}> {
  return RETENTION_POLICIES.map((policy) => ({
    category: policy.category,
    retentionDays: policy.retentionDays,
    blockingSources: PRESERVATION_ORDER.filter((source) => source.blocksDisposal).map(
      (source) => source.id,
    ),
  }));
}
