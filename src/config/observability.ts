export interface ObservabilityPageConfig {
  title: string;
  description: string;
  storeAlert: string;
  seedLabel: string;
  kpis: {
    loginSuccess: string;
    loginFailure: string;
    activeActors: string;
    latency: string;
    latencyHint: string;
  };
  heatmapTitle: string;
  heatmapDescription: string;
  timeseriesTitle: string;
  timeseriesDescription: string;
  topActionsTitle: string;
  topActionsDescription: string;
  topActionsEmpty: string;
  latencyTitle: string;
  emptyState: string;
  countLabel: string;
  windowLabel: string;
  eventNameLabel: string;
}

export interface UebaPageConfig {
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  tableHeaders: {
    actor: string;
    risk: string;
    anomalies: string;
    lastSeen: string;
    action: string;
  };
  detailBackLabel: string;
  detailCopyActorLabel: string;
  detailTitleTemplate: string;
  detailBaselineTitle: string;
  detailAnomalyTitle: string;
  detailNoAnomaly: string;
  detailRecommendationsTitle: string;
  detailRecommendations: string[];
  baselineLabels: {
    available: string;
    unavailable: string;
    totalEvents: string;
    lastSeen: string;
    knownIps: string;
    knownDevices: string;
  };
  levelLabels: Record<"low" | "medium" | "high" | "critical", string>;
  kindLabels: Record<string, string>;
}

export const OBSERVABILITY_PAGE_CONFIG: ObservabilityPageConfig = {
  title: "Observability",
  description:
    "Metrik aktivitas, latensi, dan penggunaan fitur. Data dihitung dari event store in-memory dan hilang saat server restart.",
  storeAlert:
    "Template frontend-only: metrik berasal dari store in-memory (maks 5000 event) tanpa exporter eksternal. Ganti dengan OpenTelemetry/Prometheus saat backend siap.",
  seedLabel: "Isi data demo",
  kpis: {
    loginSuccess: "Login sukses (24 jam)",
    loginFailure: "Login gagal (24 jam)",
    activeActors: "Aktor aktif (1 jam)",
    latency: "Latensi p95 Server Action",
    latencyHint: "Rata-rata {avg} ms dari {count} sampel",
  },
  heatmapTitle: "Aktivitas 7 hari terakhir",
  heatmapDescription: "Semakin gelap sel, semakin banyak percobaan login.",
  timeseriesTitle: "Login sukses 24 jam",
  timeseriesDescription: "Dikelompokkan per jam dari event store.",
  topActionsTitle: "Aksi paling sering",
  topActionsDescription: "Total nilai event per nama metrik.",
  topActionsEmpty: "Belum ada event tercatat.",
  latencyTitle: "Distribusi latensi",
  emptyState: "Belum ada metrik. Login beberapa kali untuk mengisi data.",
  countLabel: "Jumlah",
  windowLabel: "Window",
  eventNameLabel: "Metrik",
};

export const UEBA_PAGE_CONFIG: UebaPageConfig = {
  title: "User Behavior Analytics",
  description:
    "Deteksi anomali perilaku user berdasarkan baseline 30 hari. Ambang minimal 20 event per user supaya tidak ada false positive.",
  emptyTitle: "Belum ada anomali",
  emptyDescription:
    "Sistem sedang mempelajari baseline perilaku user. Anomali muncul setelah pola histogram atau IP baru terdeteksi.",
  tableHeaders: {
    actor: "Aktor",
    risk: "Risiko",
    anomalies: "Anomali",
    lastSeen: "Terakhir",
    action: "",
  },
  detailBackLabel: "Kembali ke daftar risiko",
  detailCopyActorLabel: "Salin id aktor",
  detailTitleTemplate: "Profil risiko {actorId}",
  detailBaselineTitle: "Baseline",
  detailAnomalyTitle: "Anomali terdeteksi",
  detailNoAnomaly: "Tidak ada anomali dalam 72 jam terakhir.",
  detailRecommendationsTitle: "Rekomendasi tindak lanjut",
  detailRecommendations: [
    "Paksa logout semua sesi bila risiko high/critical.",
    "Minta konfirmasi ulang dari user melalui kanal tepercaya.",
    "Tinjau audit log aksi sensitif dalam 24 jam terakhir.",
    "Blokir IP hash bila muncul burst login gagal.",
  ],
  baselineLabels: {
    available: "Baseline tersedia",
    unavailable: "Baseline belum stabil (butuh ≥ 20 event)",
    totalEvents: "Event",
    lastSeen: "Terakhir aktif",
    knownIps: "IP hash dikenal",
    knownDevices: "Perangkat dikenal",
  },
  levelLabels: {
    low: "Rendah",
    medium: "Sedang",
    high: "Tinggi",
    critical: "Kritis",
  },
  kindLabels: {
    new_ip: "IP baru",
    new_device: "Perangkat baru",
    unusual_hour: "Jam tidak wajar",
    high_volume: "Volume tidak wajar",
    failed_login_burst: "Burst login gagal",
    privilege_change: "Perubahan role",
  },
};

export interface CardinalityPageConfig {
  title: string;
  description: string;
  totalSeriesLabel: string;
  perTagLabel: string;
  maxTagKeysLabel: string;
  retentionLabel: string;
  otherValueLabel: string;
  unitLabel: string;
  routeHint: string;
  overflowHint: string;
}

/**
 * Copy untuk tampilan kontrol cardinality. Angka batasnya sendiri dibaca dari
 * `CARDINALITY_LIMITS` di `lib/cardinality.ts` supaya tidak ada duplikasi.
 */
export const CARDINALITY_PAGE_CONFIG: CardinalityPageConfig = {
  title: "Kontrol Cardinality",
  description:
    "Nilai tag yang tidak stabil dinormalisasi sebelum disimpan agar jumlah series time-series tetap terkendali.",
  totalSeriesLabel: "Batas series per metrik",
  perTagLabel: "Batas nilai unik per key",
  maxTagKeysLabel: "Batas jumlah key",
  retentionLabel: "Retensi event",
  otherValueLabel: "Nilai cadangan saat melewati batas",
  unitLabel: "Satuan",
  routeHint:
    "Tag route wajib lewat normalizeRoute() supaya /users/123 menjadi /users/:id.",
  overflowHint:
    "Tag yang melewati batas dilipat ke nilai cadangan dan tidak menambah series baru.",
};
