export const ACCOUNT_SETTINGS_CONFIG = {
  title: "Profil Akun",
  description: "Perbarui identitas akun dan pengaturan keamanan dasar.",
  infoAlert:
    "Mode demo — data hanya tersimpan di browser ini dan bukan backend production.",
  profile: {
    title: "Profil",
    saveLabel: "Simpan Profil",
    savingLabel: "Menyimpan…",
    savedLabel: "Profil tersimpan (lokal).",
  },
  password: {
    title: "Ganti Kata Sandi",
    saveLabel: "Ganti Kata Sandi",
    savedLabel: "Permintaan ganti kata sandi tercatat (mock).",
  },
  fields: {
    fullName: "Nama Lengkap",
    email: "Email",
    currentPassword: "Kata Sandi Saat Ini",
    newPassword: "Kata Sandi Baru",
    confirmPassword: "Konfirmasi Kata Sandi Baru",
  },
  sessions: {
    title: "Sesi Aktif",
    revokeLabel: "Akhiri",
    revokedLabel: "Sesi diakhiri (mock).",
    emptyTitle: "Tidak ada sesi lain.",
    columns: {
      device: "Perangkat",
      os: "Sistem Operasi",
      ip: "IP",
      lastActive: "Terakhir Aktif",
    },
  },
  delete: {
    title: "Hapus Akun",
    description:
      "Tindakan ini tidak dapat dibatalkan. Akun dan seluruh datanya akan dijadwalkan penghapusan.",
    buttonLabel: "Hapus Akun",
    confirmLabel: "Konfirmasi Hapus Akun",
    confirmPlaceholder: "Ketik DELETE untuk melanjutkan",
    confirmWord: "DELETE",
    scheduledLabel: "Penghapusan akun dijadwalkan (mock).",
    cancelLabel: "Batal",
  },
} as const;
