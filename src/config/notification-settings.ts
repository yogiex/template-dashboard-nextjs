export const NOTIFICATION_SETTINGS_CONFIG = {
  title: "Preferensi Notifikasi",
  description: "Atur kapan dan bagaimana Anda menerima notifikasi.",
  savedLabel: "Preferensi tersimpan (lokal).",
  saveLabel: "Simpan Preferensi",
  savingLabel: "Menyimpan…",
  channels: {
    inApp: "Notifikasi dalam aplikasi",
    email: "Notifikasi email",
    push: "Push notification (browser)",
  },
  quietHours: {
    label: "Jam Tenang",
    description: "Matikan notifikasi selama rentang waktu tertentu.",
    start: "Mulai",
    end: "Selesai",
  },
  infoAlert:
    "Mode demo — preferensi hanya tersimpan di browser ini.",
} as const;
