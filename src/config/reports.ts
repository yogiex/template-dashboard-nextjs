export const REPORTS_CONFIG = {
  title: "Laporan & Ekspor",
  description: "Buat laporan dari dataset yang tersedia dan unduh hasilnya.",
  infoAlert:
    "Mode demo — data berasal dari mock lokal, bukan database production.",
  builder: {
    title: "Export Builder",
    datasetLabel: "Dataset",
    fromLabel: "Dari Tanggal",
    toLabel: "Sampai Tanggal",
    formatLabel: "Format",
    generateLabel: "Buat Laporan",
    generatingLabel: "Membuat…",
    generatedLabel: "Laporan siap diunduh.",
    previewTitle: "Pratinjau",
    emptyPreview: "Hasil laporan akan tampil di sini.",
  },
  datasets: {
    users: "Pengguna",
    invoices: "Invoice",
    audit: "Aktivitas Audit",
  },
  formats: {
    csv: "CSV",
  },
  columns: {
    downloadLabel: "Unduh CSV",
  },
} as const;
