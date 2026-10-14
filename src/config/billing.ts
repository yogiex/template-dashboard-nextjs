export const BILLING_CONFIG = {
  title: "Tagihan & Paket",
  description: "Lihat paket aktif, penggunaan, dan riwayat invoice.",
  infoAlert:
    "Mode demo — pembayaran dan upgrade bersifat simulasi, data lokal.",
  plan: {
    currentLabel: "Paket Aktif",
    upgradeLabel: "Upgrade ke Pro",
    upgradeConfirmWord: "UPGRADE",
    upgradeSuccess: "Paket diperbarui (mock).",
    featuresLabel: "Fitur:",
  },
  usage: {
    title: "Penggunaan",
    cpuLabel: "CPU",
    storageLabel: "Penyimpanan",
    apiLabel: "Permintaan API",
  },
  invoices: {
    title: "Riwayat Invoice",
    downloadLabel: "Unduh",
    empty: "Belum ada invoice.",
    columns: {
      id: "ID",
      date: "Tanggal",
      plan: "Paket",
      amount: "Jumlah",
      status: "Status",
    },
    status: {
      paid: "Lunas",
      pending: "Menunggu",
      failed: "Gagal",
    },
  },
  plans: {
    free: {
      id: "free",
      name: "Free",
      priceMonthly: 0,
      features: ["Hingga 3 pengguna", "1 GB penyimpanan", "1.000 request/hari", "Dukungan komunitas"],
    },
    pro: {
      id: "pro",
      name: "Pro",
      priceMonthly: 29,
      features: ["Pengguna tak terbatas", "50 GB penyimpanan", "100.000 request/hari", "Dukungan prioritas", "SSO (mock)"],
    },
  },
} as const;
