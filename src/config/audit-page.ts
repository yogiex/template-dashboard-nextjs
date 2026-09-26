/**
 * Copy user-facing untuk halaman `/settings/audit` (Sprint 7.3).
 *
 * Semua teks, label kolom, dan label filter berasal dari file ini; komponen
 * `src/features/audit/components/*` tidak boleh menulis string tampil inline
 * (ARCHITECTURE §14.7). Nilai angka, filter, dan data event tetap milik
 * `src/features/audit/*` karena bukan copy.
 */

export interface AuditFilterOption {
  /** Nilai yang masuk ke searchParams; `null` berarti "tanpa filter". */
  value: string | null;
  label: string;
}

export const AUDIT_PAGE_CONFIG = {
  title: "Audit Log",
  description: "Riwayat aktivitas keamanan, akses, dan perubahan data.",
  tabTitle: "Audit",
  tabDescription: "Jejak audit yang dapat ditelusuri dan tidak bisa dimodifikasi.",
  basePath: "/settings/audit",
  /** Kunci searchParams yang dianggap sebagai filter aktif. */
  filterKeys: ["category", "severity", "result", "action", "actorId"] as const,
  filters: {
    label: "Filter audit",
    searchLabel: "Cari action audit",
    searchPlaceholder: "Cari action...",
    searchMaxLength: 100,
    categoryLabel: "Kategori",
    categoryAll: "Semua kategori",
    severityLabel: "Severity",
    severityAll: "Semua level",
    resultLabel: "Hasil",
    resultAll: "Semua hasil",
    reset: "Reset filter",
    pending: "Memuat...",
  },
  options: {
    category: {
      auth: "Auth",
      authz: "Authz",
      data: "Data",
      config: "Config",
      security: "Security",
      log: "Log",
    },
    severity: {
      info: "Info",
      warning: "Warning",
      critical: "Critical",
    },
    result: {
      success: "Sukses",
      failure: "Gagal",
      error: "Error",
    },
  } satisfies Record<string, Record<string, string>>,
  columns: {
    time: "Waktu",
    category: "Kategori",
    action: "Action",
    actor: "Aktor",
    result: "Hasil",
    detail: "Detail",
  },
  detail: {
    open: "Lihat detail",
    sheetDescription: "Detail event audit",
    fields: {
      time: "Waktu",
      category: "Kategori",
      severity: "Severity",
      result: "Hasil",
      source: "Source",
      actorId: "Actor ID",
      actorEmail: "Actor email",
      actorRole: "Actor role",
      resource: "Resource",
      requestId: "Request ID",
      host: "Host",
      userAgent: "User-Agent",
      eventId: "Event ID",
      previousHash: "Previous hash",
      hash: "Hash",
      metadata: "Metadata",
    },
    metadataEmpty: "Tidak ada metadata.",
    copyHash: "Salin hash",
    notAvailable: "—",
  },
  empty: {
    title: "Tidak ada log untuk filter yang dipilih",
    description:
      "Coba longgarkan filter, atau reset filter untuk melihat seluruh event audit.",
  },
  pagination: {
    navLabel: "Pagination audit",
    summary: "Menampilkan {start}–{end} dari {total} event",
    previous: "Sebelumnya",
    next: "Berikutnya",
    pagePosition: "{page} / {totalPages}",
  },
} as const;

export type AuditPageConfig = typeof AUDIT_PAGE_CONFIG;
