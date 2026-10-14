export const SUPPORT_CONFIG = {
  title: "Bantuan & Tiket",
  description: "Buat tiket baru dan pantau proses penyelesaiannya.",
  infoAlert:
    "Mode demo — tiket disimpan di browser ini.",
  create: {
    label: "Buat Tiket",
    subjectLabel: "Judul",
    subjectPlaceholder: "Ringkasan masalah Anda",
    priorityLabel: "Prioritas",
    messageLabel: "Pesan",
    messagePlaceholder: "Jelaskan masalah secara detail…",
    submitLabel: "Kirim Tiket",
    createdLabel: "Tiket dibuat (mock).",
  },
  filters: {
    searchPlaceholder: "Cari tiket…",
    statusLabel: "Status",
    allStatus: "Semua Status",
  },
  status: {
    open: "Terbuka",
    pending: "Menunggu",
    closed: "Ditutup",
  },
  priority: {
    low: "Rendah",
    normal: "Normal",
    high: "Tinggi",
  },
  thread: {
    title: "Percakapan",
    empty: "Belum ada pesan.",
    replyPlaceholder: "Tulis balasan…",
    replyLabel: "Balas",
    replySuccess: "Balasan terkirim (mock).",
    agentName: "Tim Support",
    assignLabel: "Ditugaskan:",
  },
  columns: {
    id: "ID",
    subject: "Judul",
    priority: "Prioritas",
    status: "Status",
    updated: "Diperbarui",
  },
  empty: {
    title: "Belum ada tiket",
    description: "Buat tiket baru untuk memulai.",
  },
} as const;
