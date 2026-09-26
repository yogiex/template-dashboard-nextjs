export const METRIC_NAMES = {
  LOGIN_ATTEMPT: "auth.login.attempt",
  LOGIN_SUCCESS: "auth.login.success",
  LOGIN_FAILURE: "auth.login.failure",
  MFA_CHALLENGE: "auth.mfa.challenge",
  MFA_SUCCESS: "auth.mfa.success",
  MFA_FAILURE: "auth.mfa.failure",
  RATE_LIMIT_HIT: "security.rate_limit",
  ACCESS_DENIED: "security.access_denied",
  PAGE_VIEW: "nav.page_view",
  COMMAND_MENU_OPEN: "nav.command_menu.open",
  USER_CREATE: "data.user.create",
  USER_UPDATE: "data.user.update",
  USER_DELETE: "data.user.delete",
  CONTACT_MESSAGE: "data.contact.message",
  SERVER_ACTION_LATENCY: "app.server_action.latency",
  /**
   * Golden signals + runtime, penamaan mengikuti OpenTelemetry semantic
   * conventions supaya nama ini bisa langsung dipakai saat backend exporter
   * (OTLP/Prometheus) dipasang.
   */
  HTTP_SERVER_REQUEST_DURATION: "http.server.request.duration",
  HTTP_SERVER_REQUEST_COUNT: "http.server.request.count",
  HTTP_SERVER_ERROR_COUNT: "http.server.error.count",
  HTTP_SERVER_ACTIVE_REQUESTS: "http.server.active.requests",
  NODEJS_EVENT_LOOP_LAG: "nodejs.event_loop.lag",
  NODEJS_MEMORY_HEAP_USED_BYTES: "nodejs.memory.heap_used_bytes",
  NODEJS_MEMORY_RSS_BYTES: "nodejs.memory.rss_bytes",
  PROCESS_CPU_USER_MS: "process.cpu.user_ms",
  PROCESS_UPTIME_SECONDS: "process.uptime_seconds",
  OBSERVABILITY_INGEST_BYTES: "observability.ingest.bytes",
  OBSERVABILITY_COST_USD: "observability.cost.usd",
} as const;

export type MetricName = (typeof METRIC_NAMES)[keyof typeof METRIC_NAMES];

/** Satuan pengukuran; metrik tanpa entry berarti dimensionless. */
export const METRIC_UNITS: Partial<Record<MetricName, string>> = {
  [METRIC_NAMES.HTTP_SERVER_REQUEST_DURATION]: "s",
  [METRIC_NAMES.HTTP_SERVER_REQUEST_COUNT]: "1",
  [METRIC_NAMES.HTTP_SERVER_ERROR_COUNT]: "1",
  [METRIC_NAMES.HTTP_SERVER_ACTIVE_REQUESTS]: "1",
  [METRIC_NAMES.NODEJS_EVENT_LOOP_LAG]: "ms",
  [METRIC_NAMES.NODEJS_MEMORY_HEAP_USED_BYTES]: "By",
  [METRIC_NAMES.NODEJS_MEMORY_RSS_BYTES]: "By",
  [METRIC_NAMES.PROCESS_CPU_USER_MS]: "ms",
  [METRIC_NAMES.PROCESS_UPTIME_SECONDS]: "s",
  [METRIC_NAMES.OBSERVABILITY_INGEST_BYTES]: "By",
  [METRIC_NAMES.OBSERVABILITY_COST_USD]: "USD",
  [METRIC_NAMES.SERVER_ACTION_LATENCY]: "ms",
};

/**
 * Kunci tag standar OpenTelemetry. Nilai tag sebaiknya selalu dinormalisasi
 * lewat `normalizeRoute()`/`normalizeMethod()` sebelum dipakai.
 */
export const OTEL_ATTRIBUTE_KEYS = {
  METHOD: "http.method",
  ROUTE: "http.route",
  STATUS_CODE: "http.status_code",
  SERVICE_NAME: "service.name",
  DEPLOYMENT_ENVIRONMENT: "deployment.environment",
} as const;

export type OtelAttributeKey =
  (typeof OTEL_ATTRIBUTE_KEYS)[keyof typeof OTEL_ATTRIBUTE_KEYS];

export const METRIC_DESCRIPTIONS: Record<MetricName, string> = {
  [METRIC_NAMES.LOGIN_ATTEMPT]: "Percobaan login masuk.",
  [METRIC_NAMES.LOGIN_SUCCESS]: "Login berhasil (termasuk yang lanjut ke MFA).",
  [METRIC_NAMES.LOGIN_FAILURE]: "Login gagal karena kredensial salah.",
  [METRIC_NAMES.MFA_CHALLENGE]: "Login berhenti di langkah MFA.",
  [METRIC_NAMES.MFA_SUCCESS]: "Kode MFA terverifikasi.",
  [METRIC_NAMES.MFA_FAILURE]: "Kode MFA salah atau kedaluwarsa.",
  [METRIC_NAMES.RATE_LIMIT_HIT]: "Request ditolak karena rate limit.",
  [METRIC_NAMES.ACCESS_DENIED]: "Akses ditolak oleh kontrol otorisasi.",
  [METRIC_NAMES.PAGE_VIEW]: "Halaman dashboard dibuka.",
  [METRIC_NAMES.COMMAND_MENU_OPEN]: "Command menu dibuka.",
  [METRIC_NAMES.USER_CREATE]: "User dibuat.",
  [METRIC_NAMES.USER_UPDATE]: "User diperbarui.",
  [METRIC_NAMES.USER_DELETE]: "User dihapus.",
  [METRIC_NAMES.CONTACT_MESSAGE]: "Pesan formulir kontak diterima.",
  [METRIC_NAMES.SERVER_ACTION_LATENCY]: "Durasi eksekusi Server Action.",
  [METRIC_NAMES.HTTP_SERVER_REQUEST_DURATION]:
    "Durasi penanganan request server dalam detik.",
  [METRIC_NAMES.HTTP_SERVER_REQUEST_COUNT]: "Jumlah request yang diterima server.",
  [METRIC_NAMES.HTTP_SERVER_ERROR_COUNT]:
    "Jumlah request yang berakhir dengan status error.",
  [METRIC_NAMES.HTTP_SERVER_ACTIVE_REQUESTS]:
    "Jumlah request yang sedang diproses pada saat sampling.",
  [METRIC_NAMES.NODEJS_EVENT_LOOP_LAG]:
    "Penundaan event loop Node.js dalam milidetik.",
  [METRIC_NAMES.NODEJS_MEMORY_HEAP_USED_BYTES]:
    "Memori heap Node.js yang sedang dipakai.",
  [METRIC_NAMES.NODEJS_MEMORY_RSS_BYTES]: "Memori resident set proses Node.js.",
  [METRIC_NAMES.PROCESS_CPU_USER_MS]:
    "Akumulasi waktu CPU proses pada mode user.",
  [METRIC_NAMES.PROCESS_UPTIME_SECONDS]: "Lama proses berjalan dalam detik.",
  [METRIC_NAMES.OBSERVABILITY_INGEST_BYTES]:
    "Jumlah byte telemetry yang dikirim ke collector.",
  [METRIC_NAMES.OBSERVABILITY_COST_USD]:
    "Estimasi biaya ingestion telemetry dalam dolar Amerika.",
};
