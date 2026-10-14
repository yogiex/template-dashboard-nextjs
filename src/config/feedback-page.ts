export const FEEDBACK_PAGE_CONFIG = {
  title: "Umpan Balik",
  description: "Bantu kami meningkatkan pengalaman Anda.",
  infoAlert:
    "Mode demo — umpan balik hanya tersimpan di browser dan tidak dikirim ke server.",
  submitLabel: "Kirim Umpan Balik",
  submittingLabel: "Mengirim...",
  successLabel: "Terima kasih! Umpan balik Anda sudah kami terima.",
  subjectLabel: "Judul",
  subjectPlaceholder: "Ringkasan umpan balik Anda",
  categoryLabel: "Kategori",
  messageLabel: "Pesan",
  messagePlaceholder: "Ceritakan pengalaman Anda secara detail...",
  ratingLabel: "Penilaian",
  ratingHint: "Pilih rating dari 1 sampai 5 bintang.",
  emailLabel: "Email (opsional)",
  emailPlaceholder: "Untuk balasan, beri tahu kami email Anda",
  categoryOptions: [
    { value: "bug", label: "Laporan Bug" },
    { value: "feature", label: "Permintaan Fitur" },
    { value: "general", label: "Umpan Balik Umum" },
    { value: "other", label: "Lainnya" },
  ],
} as const;
