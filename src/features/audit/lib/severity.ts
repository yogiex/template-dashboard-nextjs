/**
 * Kebijakan severity audit per kategori.
 *
 * Nilai default diambil dari pemakaian nyata di call site `logAudit()` dan dari
 * aturan severity yang sudah didokumentasikan di
 * `src/features/log-management/lib/access.ts` (`ACCESS_LOGGING_RULES`,
 * `ACCESS_MONITORING_CHECKS`), bukan dari tebakan. Tujuannya: event yang
 * pemanggilnya lupa set severity tetap masuk dengan level yang berguna saat
 * penyaringan dan eskalasi.
 *
 * Semua fungsi di file ini murni: tanpa I/O, tanpa state global, input tidak
 * pernah dimutasi.
 */

import type { AuditCategory, AuditSeverity } from "@/features/audit/schema";

/**
 * Severity default per kategori, dari yang paling ringan:
 *
 * - `auth`: `info` — login/register/reset/MFA sukses semua `info`; hanya
 *   kegagalan auth yang naik ke `warning`.
 * - `authz`: `warning` — satu-satunya call site (`logAuthzFailure`) memakai
 *   `warning`, dan kategori ini paling ketat di `ACCESS_MATRIX`.
 * - `data`: `info` — create/update/view/contact semuanya `info`; hanya
 *   `user_deleted` yang `warning`.
 * - `config`: `warning` — `ACCESS_LOGGING_RULES.retention-change` menyatakan
 *   perubahan kebijakan retensi minimum `warning`.
 * - `security`: `warning` — seluruh call site (`rate_limit_hit`) `warning`,
 *   dan `ACCESS_MONITORING_CHECKS` menaikkan akses gagal berulang ke
 *   `critical`, tidak pernah ke `info`.
 * - `log`: `warning` — disposal terjadwal `warning`, approve/reject/complete
 *   `critical`, sedangkan akses log biasa `info`; tiga dari empat aturan
 *   `ACCESS_LOGGING_RULES` (export, retention, disposal) menetapkan `warning`
 *   ke atas.
 */
export const DEFAULT_SEVERITY: Record<AuditCategory, AuditSeverity> = {
  auth: "info",
  authz: "warning",
  data: "info",
  config: "warning",
  security: "warning",
  log: "warning",
};

/**
 * Rank severity mengikuti urutan eskalasi yang dipakai
 * `ACCESS_MONITORING_CHECKS` di `log-management/lib/access.ts`: `info` di
 * bawah `warning` di bawah `critical`. Angka ditulis eksplisit supaya urutan
 * enum di `schema.ts` tidak diam-diam mengubah kebijakan.
 */
const SEVERITY_RANK: Record<AuditSeverity, number> = {
  info: 0,
  warning: 1,
  critical: 2,
};

/** Kebalikan rank dipakai supaya hasil selalu berupa member `AUDIT_SEVERITIES`. */
const SEVERITIES_BY_RANK: Record<number, AuditSeverity> = {
  0: "info",
  1: "warning",
  2: "critical",
};

/**
 * Lantai severity per kategori. Hanya `security` yang punya lantai di atas
 * `info`; kategori lain meneruskan nilai pemanggil apa adanya.
 */
const SEVERITY_FLOOR: Record<AuditCategory, AuditSeverity> = {
  auth: "info",
  authz: "info",
  data: "info",
  config: "info",
  security: "warning",
  log: "info",
};

/**
 * Naikkan severity bila perlu agar tidak turun di bawah lantai kategorinya.
 *
 * Aturannya satu arah dan murni: ambil yang lebih tinggi antara severity yang
 * diminta dan lantai kategori. `critical` tidak pernah diturunkan; kategori
 * `security` memiliki lantai `warning` sehingga event `info` menjadi `warning`.
 * Kategori lain tidak punya lantai khusus, jadi nilainya diteruskan apa adanya.
 */
export function normalizeSeverity(
  category: AuditCategory,
  severity: AuditSeverity,
): AuditSeverity {
  const requested = SEVERITY_RANK[severity];
  const floor = SEVERITY_RANK[SEVERITY_FLOOR[category]];

  return SEVERITIES_BY_RANK[requested > floor ? requested : floor];
}
