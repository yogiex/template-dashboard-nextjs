export const INTEGRATIONS_CONFIG = {
  title: "Integrasi",
  description: "Hubungkan aplikasi dan layanan pihak ketiga ke workspace Anda.",
  infoAlert:
    "Mode demo — status integrasi bersifat simulasi dan hanya disimpan di browser.",
  searchPlaceholder: "Cari integrasi…",
  empty: {
    title: "Tidak ada integrasi",
    description: "Coba ubah pencarian atau kategori.",
  },
  connectLabel: "Hubungkan",
  disconnectLabel: "Putuskan",
  connectedLabel: "Terhubung",
  disconnectedLabel: "Belum Terhubung",
  categories: {
    all: "Semua",
    communication: "Komunikasi",
    commerce: "Komersial",
    devtool: "Devtool",
    analytics: "Analitik",
  },
  fields: {
    webhookUrl: "Webhook URL",
    secret: "Secret",
    docs: "Dokumentasi",
  },
  docsLabel: "Buka Dokumentasi",
  noMetadata: "Tidak ada metadata tambahan.",
} as const;

export type IntegrationCategory = "communication" | "commerce" | "devtool" | "analytics";
