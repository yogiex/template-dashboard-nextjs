import "server-only";

/**
 * TS-1 — Prakiraan perubahan inventaris log (NIST SP 800-92 §3.1).
 *
 * Angka `estimatedDailyMB` adalah ASUMSI PERENCANAAN, bukan traffic terukur.
 * Halaman menampilkannya dengan label eksplisit lewat `LOG_POLICY_COPY`.
 */

export type LogSourceType =
  | "application-audit"
  | "app-server"
  | "database"
  | "os"
  | "network-device"
  | "security-device"
  | "cloud-infra"
  | "endpoint";

export type LogSourceTier = "required" | "recommended" | "not-recommended" | "prohibited";

export type LogSourceForecast = {
  id: string;
  type: LogSourceType;
  label: string;
  tier: LogSourceTier;
  infrastructure: string;
  useCase: string;
  /** Asumsi perencanaan volume harian, bukan hasil pengukuran. */
  estimatedDailyMB: number;
  requirements: string[];
  workRoles: string[];
};

export const LOG_SOURCE_FORECASTS: readonly LogSourceForecast[] = [
  {
    id: "audit-trail",
    type: "application-audit",
    label: "Audit trail aplikasi",
    tier: "required",
    infrastructure: "In-process, dikirim via `logAudit()` ke store in-memory",
    useCase: "Rekonstruksi tindakan pengguna dan perubahan konfigurasi",
    estimatedDailyMB: 8,
    requirements: [
      "Hash chain tamper-evidence per entry",
      "Redaksi PII dan secret sebelum penyimpanan",
      "Actor, resource, dan requestId wajib terisi",
    ],
    workRoles: ["admin", "editor"],
  },
  {
    id: "auth-log",
    type: "application-audit",
    label: "Log autentikasi",
    tier: "required",
    infrastructure: "In-process, event kategori `auth`",
    useCase: "Deteksi brute force, login gagal, dan anomali perangkat",
    estimatedDailyMB: 4,
    requirements: [
      "Identifier dan IP dalam bentuk hash, bukan cleartext",
      "Tidak boleh menyimpan password, token, atau OTP",
      "Result wajib: success / failure / error",
    ],
    workRoles: ["admin"],
  },
  {
    id: "app-runtime",
    type: "app-server",
    label: "Log runtime aplikasi",
    tier: "recommended",
    infrastructure: "Logger terstruktur, kategori `log`",
    useCase: "Latensi Server Action, error tak tertangani, dan rate limit hit",
    estimatedDailyMB: 5,
    requirements: [
      "Tanpa PII dan tanpa nilai request body",
      "Wajib punya requestId untuk korelasi",
      "Severity error naik ke `critical` bila berulang",
    ],
    workRoles: ["admin", "editor"],
  },
  {
    id: "authorization",
    type: "application-audit",
    label: "Log otorisasi dan perubahan role",
    tier: "required",
    infrastructure: "In-process, kategori `authz`",
    useCase: "Bukti perubahan hak akses dan penolakan akses",
    estimatedDailyMB: 1,
    requirements: ["Actor sebelum dan sesudah wajib dicatat", "Resource type/id wajib"],
    workRoles: ["admin"],
  },
  {
    id: "db-transaction",
    type: "database",
    label: "Log transaksi basis data",
    tier: "recommended",
    infrastructure: "Log engine basis data, kategori `data`",
    useCase: "Audit trail perubahan data dan akses data sensitif",
    estimatedDailyMB: 12,
    requirements: ["Tanpa nilai kolom sensitif", "Record id dan statement hash wajib"],
    workRoles: ["admin", "editor"],
  },
  {
    id: "os-system",
    type: "os",
    label: "Log sistem operasi",
    tier: "recommended",
    infrastructure: "syslog host aplikasi",
    useCase: "Restart, perubahan hak akses file, dan proses mencurigakan",
    estimatedDailyMB: 6,
    requirements: ["Waktu sinkron dengan NTP", "Tidak menyimpan isi environment variable"],
    workRoles: ["admin"],
  },
  {
    id: "network-device",
    type: "network-device",
    label: "Log perangkat jaringan",
    tier: "not-recommended",
    infrastructure: "syslog terpusat (belum terhubung di template ini)",
    useCase: "Koneksi masuk/keluar dan perubahan routing",
    estimatedDailyMB: 20,
    requirements: ["MAC address di-hash", "Batas volume per jam wajib diterapkan"],
    workRoles: ["admin"],
  },
  {
    id: "endpoint-edr",
    type: "endpoint",
    label: "Log endpoint dan EDR",
    tier: "not-recommended",
    infrastructure: "Agen endpoint (di luar scope template frontend)",
    useCase: "Deteksi malware dan perubahan mencurigakan per workstation",
    estimatedDailyMB: 15,
    requirements: ["Hostname di-hash", "Kirim per interval, bukan per event"],
    workRoles: ["admin"],
  },
  {
    id: "cloud-provider",
    type: "cloud-infra",
    label: "Log penyedia cloud",
    tier: "recommended",
    infrastructure: "Audit log API penyedia (belum terhubung)",
    useCase: "Perubahan IAM, bucket, dan firewall di sisi penyedia",
    estimatedDailyMB: 10,
    requirements: ["Hanya event write/delete yang disimpan", "Token akses tidak boleh masuk log"],
    workRoles: ["admin"],
  },
  {
    id: "raw-packet-capture",
    type: "network-device",
    label: "Tangkapan paket mentah",
    tier: "prohibited",
    infrastructure: "Tidak boleh dikonfigurasi",
    useCase: "Tidak ada use case yang sah untuk sistem ini",
    estimatedDailyMB: 0,
    requirements: [
      "Dilarang karena payload pengguna tidak diperlukan untuk investigasi",
      "Dilarang karena data yang tertangkap berada di luar boundary sistem",
    ],
    workRoles: [],
  },
  {
    id: "keystroke-content",
    type: "endpoint",
    label: "Log ketikan dan konten dokumen",
    tier: "prohibited",
    infrastructure: "Tidak boleh dikonfigurasi",
    useCase: "Tidak ada use case yang sah; hanya memunculkan risiko privasi",
    estimatedDailyMB: 0,
    requirements: [
      "Dilarang karena berisi data pengguna yang tidak diperlukan",
      "Dilarang karena nilainya tidak dapat diredaksi secara andal",
    ],
    workRoles: [],
  },
];

export type ForecastTotals = {
  sourceCount: number;
  requiredCount: number;
  prohibitedCount: number;
  estimatedDailyMB: number;
  estimatedDailyGB: number;
};

export function getForecastTotals(
  forecasts: readonly LogSourceForecast[] = LOG_SOURCE_FORECASTS,
): ForecastTotals {
  const estimatedDailyMB = forecasts.reduce(
    (sum, forecast) => sum + forecast.estimatedDailyMB,
    0,
  );

  return {
    sourceCount: forecasts.length,
    requiredCount: forecasts.filter((forecast) => forecast.tier === "required").length,
    prohibitedCount: forecasts.filter((forecast) => forecast.tier === "prohibited").length,
    estimatedDailyMB,
    estimatedDailyGB: Math.round((estimatedDailyMB / 1024) * 100) / 100,
  };
}

export function getForecastByTier(tier: LogSourceTier): LogSourceForecast[] {
  return LOG_SOURCE_FORECASTS.filter((forecast) => forecast.tier === tier);
}
