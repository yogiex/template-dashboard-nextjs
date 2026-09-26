import "server-only";

import type { LogSourceTier, LogSourceType } from "@/features/log-management/lib/config";
import { LOG_SOURCE_FORECASTS } from "@/features/log-management/lib/config";

/**
 * TS-2 — Kebijakan generate log record (NIST SP 800-92 §3.2).
 *
 * Berisi: klasifikasi source, daftar event type yang boleh di-log, karakter
 * data wajib, deteksi key sensitif, frekuensi, handling saat logging gagal,
 * cleartext vs hashed, sinkronisasi jam, dan proteksi + monitoring.
 */

export type LogFrequency = "per_event" | "per_minute" | "per_hour" | "per_day";

export type SensitiveHandling = "cleartext" | "hashed" | "redacted" | "forbidden";

export type LogEventTypePolicy = {
  id: string;
  label: string;
  sourceType: LogSourceType;
  /** Event type yang boleh di-log; di luar daftar ini tidak masuk store. */
  allowed: boolean;
  frequency: LogFrequency;
  /** Karakter data yang wajib terisi pada event ini. */
  requiredCharacteristics: string[];
  optionalCharacteristics: string[];
  /** Key yang dianggap sensitif dan tidak boleh cleartext. */
  sensitiveKeys: string[];
};

export type SourceClassification = {
  sourceId: string;
  tier: LogSourceTier;
  rationale: string;
  eventTypeIds: string[];
};

/** Key yang memicu redaksi otomatis di metadata audit. */
export const SENSITIVE_KEY_PATTERNS: readonly RegExp[] = [
  /password/i,
  /passwd/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /private[_-]?key/i,
  /authorization/i,
  /cookie/i,
  /session[_-]?id/i,
  /otp/i,
  /mfa/i,
  /credit[_-]?card/i,
  /ssn/i,
  /nip/i,
  /nik/i,
];

export function containsSensitiveData(keys: readonly string[]): string[] {
  return keys.filter((key) => SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key)));
}

export const LOG_EVENT_TYPE_POLICIES: readonly LogEventTypePolicy[] = [
  {
    id: "auth.login",
    label: "Percobaan login",
    sourceType: "application-audit",
    allowed: true,
    frequency: "per_event",
    requiredCharacteristics: [
      "Waktu (UTC, ISO 8601)",
      "Jenis event: auth",
      "Aktor atau identifier yang sudah di-hash",
      "Sumber alamat sudah di-hash",
      "Hasil: sukses atau gagal",
    ],
    optionalCharacteristics: ["User agent", "Nama aplikasi klien", "Kode alasan kegagalan"],
    sensitiveKeys: ["email", "ip", "userAgent", "password", "otp", "mfaCode"],
  },
  {
    id: "auth.logout",
    label: "Logout dan penghentian sesi",
    sourceType: "application-audit",
    allowed: true,
    frequency: "per_event",
    requiredCharacteristics: ["Waktu", "Jenis event: auth", "Aktor", "Hasil"],
    optionalCharacteristics: ["Alasan logout"],
    sensitiveKeys: ["sessionId", "token"],
  },
  {
    id: "authz.role_change",
    label: "Perubahan role dan hak akses",
    sourceType: "application-audit",
    allowed: true,
    frequency: "per_event",
    requiredCharacteristics: [
      "Waktu",
      "Jenis event: authz",
      "Aktor pelaku dan target",
      "Role sebelum dan sesudah",
    ],
    optionalCharacteristics: ["Alasan perubahan", "Ticket terkait"],
    sensitiveKeys: [],
  },
  {
    id: "config.update",
    label: "Perubahan konfigurasi aplikasi",
    sourceType: "application-audit",
    allowed: true,
    frequency: "per_event",
    requiredCharacteristics: ["Waktu", "Jenis event: config", "Aktor", "Kunci konfigurasi", "Nilai lama dan baru"],
    optionalCharacteristics: ["Environment target"],
    sensitiveKeys: ["apiKey", "secret", "connectionString"],
  },
  {
    id: "data.export",
    label: "Ekspor atau unduhan data",
    sourceType: "application-audit",
    allowed: true,
    frequency: "per_event",
    requiredCharacteristics: ["Waktu", "Jenis event: data", "Aktor", "Jenis data", "Jumlah baris"],
    optionalCharacteristics: ["Format ekspor"],
    sensitiveKeys: ["payload", "email", "ip"],
  },
  {
    id: "server.action",
    label: "Pemanggilan Server Action",
    sourceType: "app-server",
    allowed: true,
    frequency: "per_event",
    requiredCharacteristics: ["Waktu", "Nama action", "Durasi", "Hasil"],
    optionalCharacteristics: ["requestId", "Nomor baris error"],
    sensitiveKeys: ["body", "headers", "cookie", "authorization"],
  },
  {
    id: "db.transaction",
    label: "Transaksi basis data",
    sourceType: "database",
    allowed: true,
    frequency: "per_event",
    requiredCharacteristics: ["Waktu", "Tabel", "Jenis operasi", "Aktor aplikasi"],
    optionalCharacteristics: ["Jumlah baris terdampak"],
    sensitiveKeys: ["values", "columnValues", "password"],
  },
  {
    id: "db.failed_login_query",
    label: "Query login basis data",
    sourceType: "database",
    allowed: true,
    frequency: "per_minute",
    requiredCharacteristics: ["Waktu", "Waktu durasi query", "Hasil"],
    optionalCharacteristics: ["User agent"],
    sensitiveKeys: ["parameter", "password"],
  },
  {
    id: "os.process_start",
    label: "Proses sistem mulai",
    sourceType: "os",
    allowed: true,
    frequency: "per_minute",
    requiredCharacteristics: ["Waktu", "Nama proses", "User proses", "Host"],
    optionalCharacteristics: ["Baris perintah"],
    sensitiveKeys: ["commandLine", "env"],
  },
  {
    id: "os.file_access",
    label: "Akses file penting",
    sourceType: "os",
    allowed: true,
    frequency: "per_hour",
    requiredCharacteristics: ["Waktu", "Path file", "Jenis akses", "Proses"],
    optionalCharacteristics: ["User efektif"],
    sensitiveKeys: ["content"],
  },
  {
    id: "network.connection",
    label: "Koneksi jaringan",
    sourceType: "network-device",
    allowed: true,
    frequency: "per_minute",
    requiredCharacteristics: ["Waktu", "Port dan protokol", "MAC address sudah di-hash"],
    optionalCharacteristics: ["Jumlah byte"],
    sensitiveKeys: ["payload", "ip"],
  },
  {
    id: "security.alert",
    label: "Peringatan keamanan",
    sourceType: "security-device",
    allowed: true,
    frequency: "per_event",
    requiredCharacteristics: ["Waktu", "Aturan yang cocok", "Severity", "Sumber"],
    optionalCharacteristics: ["Tindakan mitigasi"],
    sensitiveKeys: ["signature", "payload"],
  },
  {
    id: "cloud.iam_change",
    label: "Perubahan IAM penyedia cloud",
    sourceType: "cloud-infra",
    allowed: true,
    frequency: "per_event",
    requiredCharacteristics: ["Waktu", "Aktor", "Aksi IAM", "Sumber daya"],
    optionalCharacteristics: ["Region", "User agent penyedia"],
    sensitiveKeys: ["accessKeyId", "secretAccessKey", "token"],
  },
  {
    id: "app.debug_trace",
    label: "Trace debug sementara",
    sourceType: "app-server",
    allowed: false,
    frequency: "per_event",
    requiredCharacteristics: [],
    optionalCharacteristics: [],
    sensitiveKeys: ["body", "headers", "cookie", "env"],
  },
  {
    id: "packet.raw_capture",
    label: "Tangkapan paket mentah",
    sourceType: "network-device",
    allowed: false,
    frequency: "per_event",
    requiredCharacteristics: [],
    optionalCharacteristics: [],
    sensitiveKeys: ["payload", "payloadRaw", "mac", "ip"],
  },
  {
    id: "user.keystroke",
    label: "Ketikan pengguna",
    sourceType: "endpoint",
    allowed: false,
    frequency: "per_event",
    requiredCharacteristics: [],
    optionalCharacteristics: [],
    sensitiveKeys: ["keystrokes", "clipboard", "screenshot"],
  },
];

export function getAllowedEventTypes(): LogEventTypePolicy[] {
  return LOG_EVENT_TYPE_POLICIES.filter((policy) => policy.allowed);
}

export function getProhibitedEventTypes(): LogEventTypePolicy[] {
  return LOG_EVENT_TYPE_POLICIES.filter((policy) => !policy.allowed);
}

export function getEventTypePolicy(id: string): LogEventTypePolicy | null {
  return LOG_EVENT_TYPE_POLICIES.find((policy) => policy.id === id) ?? null;
}

/** Klasifikasi source diturunkan dari forecast, bukan duplikat. */
export function getSourceClassifications(): SourceClassification[] {
  return LOG_SOURCE_FORECASTS.map((forecast) => ({
    sourceId: forecast.id,
    tier: forecast.tier,
    rationale: forecast.useCase,
    eventTypeIds: LOG_EVENT_TYPE_POLICIES.filter(
      (policy) => policy.sourceType === forecast.type,
    ).map((policy) => policy.id),
  }));
}

export type SensitiveFieldDecision = {
  key: string;
  handling: SensitiveHandling;
  reason: string;
};

const HASH_ONLY_KEYS = new Set(["email", "ip", "mac", "hostname", "userAgent", "actorId"]);

export function decideSensitiveHandling(key: string): SensitiveFieldDecision {
  if (HASH_ONLY_KEYS.has(key)) {
    return {
      key,
      handling: "hashed",
      reason: "Identifier di-hash agar tetap dapat dikorelasikan tanpa menyimpan nilai asli.",
    };
  }

  if (containsSensitiveData([key]).length > 0) {
    return {
      key,
      handling: "redacted",
      reason: "Key sensitif: nilai dibuang sebelum penyimpanan.",
    };
  }

  return {
    key,
    handling: "cleartext",
    reason: "Key non-sensitif boleh disimpan apa adanya untuk keperluan investigasi.",
  };
}

export type GenerationPolicy = {
  failurePolicy: {
    /** Logging tidak boleh menggagalkan request pengguna. */
    blockRequest: boolean;
    fallback: string;
    alertCategory: string;
    minimumSeverity: "info" | "warning" | "critical";
  };
  cleartextVsHashed: {
    defaultRule: string;
    hashedFields: string[];
    neverStored: string[];
  };
  clockSync: {
    protocol: string;
    maxDriftSeconds: number;
    timezone: string;
    onDriftViolation: string;
  };
  protection: {
    integrityMechanism: string;
    confidentiality: string;
    availability: string;
    monitoring: string;
  };
  frequencyPolicy: {
    defaultFrequency: LogFrequency;
    combineRule: string;
    volumeControl: string;
  };
};

export const GENERATION_POLICY: GenerationPolicy = {
  failurePolicy: {
    blockRequest: false,
    fallback: "Queue event di memori dan kirim ulang saat proses berikutnya berjalan.",
    alertCategory: "log",
    minimumSeverity: "critical",
  },
  cleartextVsHashed: {
    defaultRule:
      "Data yang tidak dapat diidentifikasi ulang (nama event, hasil, durasi) disimpan cleartext; data yang dapat diidentifikasi ulang disimpan sebagai hash.",
    hashedFields: [...HASH_ONLY_KEYS],
    neverStored: ["password", "token", "otp", "mfaCode", "cookie", "authorization", "secret"],
  },
  clockSync: {
    protocol: "NTP",
    maxDriftSeconds: 1,
    timezone: "UTC",
    onDriftViolation: "Naikkan severity ke `critical` dan tandai event sebagai tidak tepercaya untuk rekonstruksi.",
  },
  protection: {
    integrityMechanism: "SHA-256 hash chain per entry (lihat `verifyAuditIntegrity()`).",
    confidentiality: "Redaksi metadata sensitif sebelum append; log tidak boleh memuat secret.",
    availability: "Batas 5000 entry dengan pencatatan entry yang terpotong (overflow) sebagai sinyal.",
    monitoring: "Event kategori `log` untuk setiap perubahan kebijakan dan kegagalan pencatatan.",
  },
  frequencyPolicy: {
    defaultFrequency: "per_event",
    combineRule:
      "Event berulang dari sumber yang sama digabung per interval agar volume turun tanpa kehilangan informasi penting.",
    volumeControl:
      "Sumber dengan frekuensi tinggi memakai interval per menit atau per jam, bukan per kejadian.",
  },
};
