export const ACTIVITY_PAGE_CONFIG = {
  title: "Linimasa Aktivitas",
  description: "Riwayat aktivitas terbaru di workspace Anda.",
  options: {
    category: {
      auth: "Autentikasi",
      data: "Data",
      config: "Konfigurasi",
      security: "Keamanan",
      system: "Sistem",
    },
  },
  filterAll: "Semua",
  empty: {
    title: "Tidak ada aktivitas",
    description: "Aktivitas akan tampil di sini.",
  },
} as const;
