/**
 * Copy user-facing untuk fitur Log Management (NIST SP 800-92).
 *
 * Semua teks di halaman `/settings/logs/**` berasal dari file ini; komponen
 * tidak boleh menulis string tampil inline. Nilai kebijakan (hari retensi,
 * metode disposal, level akses) TIDAK ada di sini — itu milik
 * `src/features/log-management/lib/*` karena bukan copy, melainkan data policy.
 */

export interface LogNavItem {
  title: string;
  href: string;
  description: string;
}

export interface LogManagementPageConfig {
  title: string;
  description: string;
  mockAlert: string;
  navLabel: string;
  sections: {
    forecast: LogNavItem;
    sources: LogNavItem;
    retention: LogNavItem;
    access: LogNavItem;
    disposal: LogNavItem;
  };
  kpis: {
    entries: string;
    entriesHint: string;
    errors24h: string;
    capacity: string;
    capacityHint: string;
    integrity: string;
    integrityHint: string;
  };
  forecastTitle: string;
  forecastDescription: string;
  forecastColumns: {
    source: string;
    tier: string;
    infrastructure: string;
    dailyVolume: string;
    workRoles: string;
  };
  forecastTotalsTitle: string;
  forecastTotalsNote: string;
  generationTitle: string;
  generationDescription: string;
  generationEmpty: string;
  classificationTitle: string;
  classificationDescriptionTemplate: string;
  handlingTitle: string;
  handlingDescription: string;
  hashedFieldsLabel: string;
  neverStoredLabel: string;
  clockLabel: string;
  clockValueTemplate: string;
  failureLabel: string;
  failureValueTemplate: string;
  accessModeTitle: string;
  accessModeDescription: string;
  accessProtectionTitle: string;
  accessProtectionDescription: string;
  accessLoggingTitle: string;
  accessLoggingDescription: string;
  preservationTitle: string;
  preservationDescription: string;
  accessMonitoringTitle: string;
  accessMonitoringDescription: string;
  storageOpsTitle: string;
  storageOpsDescription: string;
  correlationTitle: string;
  dataReductionTitle: string;
  formatTitle: string;
  confidentialityLabel: string;
  integrityLabel: string;
  availabilityLabel: string;
  protectionTitle: string;
  protectionDescription: string;
  disposalPreventionTitle: string;
  disposalPreventionDescription: string;
  disposalVerificationTitle: string;
  disposalVerificationDescription: string;
  columns: {
    eventType: string;
    status: string;
    frequency: string;
    requiredCharacteristics: string;
    sensitiveKeys: string;
    transfer: string;
    transferMethod: string;
    control: string;
    value: string;
    appliesTo: string;
    mode: string;
    additionalControls: string;
    condition: string;
    response: string;
    target: string;
    method: string;
    standard: string;
    rationale: string;
    monitoring: string;
    prevention: string;
    enforced: string;
    verificationStep: string;
    automated: string;
    event: string;
    category: string;
    result: string;
    actor: string;
    timestamp: string;
  };
  retentionTitle: string;
  retentionDescription: string;
  retentionColumns: {
    category: string;
    tier: string;
    days: string;
    rationale: string;
    basis: string;
  };
  storageTitle: string;
  storageDescription: string;
  storageEntriesLabel: string;
  storageSizeLabel: string;
  storageUsageLabel: string;
  storageLimitLabel: string;
  storageDroppedLabel: string;
  storageStorageNote: string;
  accessTitle: string;
  accessDescription: string;
  accessColumns: {
    role: string;
    level: string;
    scope: string;
    conditions: string;
  };
  disposalTitle: string;
  disposalDescription: string;
  disposalColumns: {
    category: string;
    method: string;
    standard: string;
    retention: string;
    grace: string;
  };
  disposalQueueTitle: string;
  disposalQueueDescription: string;
  disposalQueueEmpty: string;
  disposalQueueColumns: {
    id: string;
    category: string;
    status: string;
    scheduled: string;
    eligible: string;
    action: string;
  };
  analysisTitle: string;
  analysisDescription: string;
  analysisEmpty: string;
  analysisColumns: {
    rule: string;
    severity: string;
    matches: string;
    detail: string;
  };
  monitoringTitle: string;
  monitoringDescription: string;
  monitoringColumns: {
    check: string;
    status: string;
    observed: string;
  };
  incidentTitle: string;
  incidentDescription: string;
  reportTitle: string;
  reportDescription: string;
  integrityTitle: string;
  integrityDescription: string;
  integrityNeverVerified: string;
  integrityVerifiedAt: string;
  integrityEntriesChecked: string;
  integrityResult: string;
  integrityLastHash: string;
  integrityCopyHashLabel: string;
  integrityIntact: string;
  integrityValueUnknown: string;
  integrityValueOk: string;
  integrityValueBrokenTemplate: string;
  integrityEntryCountTemplate: string;
  integrityBrokenTemplate: string;
  verifyLabel: string;
  verifyRunning: string;
  sweepLabel: string;
  sweepRunning: string;
  approveLabel: string;
  completeLabel: string;
  approveRunning: string;
  completeRunning: string;
  actionFeedback: string;
  productionDisabled: string;
}

export interface LogPolicyCopy {
  tierLabels: Record<string, string>;
  storageTierLabels: Record<string, string>;
  levelLabels: Record<string, string>;
  severityLabels: Record<string, string>;
  statusLabels: Record<string, string>;
  resultLabels: Record<string, string>;
  frequencyLabels: Record<string, string>;
  approvedLabels: Record<string, string>;
  permissionLabels: Record<string, string>;
  methodLabels: Record<string, string>;
  confidentialityLabels: Record<string, string>;
  dispositionNote: string;
  frequencyNote: string;
  sensitiveNote: string;
  failurePolicyNote: string;
  clockNote: string;
  monitoringNote: string;
  dataReductionNote: string;
  transferNote: string;
  correlationNote: string;
  protectionNote: string;
  remoteAccessNote: string;
  accessLoggingNote: string;
  preservationNote: string;
  storageMonitoringNote: string;
  reportNote: string;
  incidentNote: string;
  integrityNote: string;
}

export const LOG_MANAGEMENT_PAGE_CONFIG: LogManagementPageConfig = {
  title: "Log Management",
  description:
    "Kelola sumber log, kebijakan retensi, level akses, dan disposal berdasarkan NIST SP 800-92.",
  mockAlert:
    "Data halaman ini MOCK. Angka berasal dari audit store in-memory (maks 5000 entry) yang kosong saat server restart — bukan SIEM, S3, atau ClickHouse sungguhan. Policy di bawah adalah konfigurasi rencana, belum dieksekusi backend.",
  navLabel: "Bagian log management",
  sections: {
    forecast: {
      title: "Ringkasan",
      href: "/settings/logs",
      description: "Perkiraan perubahan inventaris log dan status kesehatan store.",
    },
    sources: {
      title: "Sumber log",
      href: "/settings/logs/sources",
      description: "Klasifikasi source, event type, dan karakter data wajib.",
    },
    retention: {
      title: "Retensi",
      href: "/settings/logs/retention",
      description: "Tier penyimpanan, transfer, korelasi, dan kapasitas.",
    },
    access: {
      title: "Akses",
      href: "/settings/logs/access",
      description: "Level akses per role, sting, dan pemantauan akses.",
    },
    disposal: {
      title: "Disposal",
      href: "/settings/logs/disposal",
      description: "Metode penghapusan, verifikasi, dan antrian disposal.",
    },
  },
  kpis: {
    entries: "Entry log tercatat",
    entriesHint: "Di store in-memory, bukan log infrastructure nyata.",
    errors24h: "Event gagal (24 jam)",
    capacity: "Kapasitas terpakai",
    capacityHint: "Estimasi JSON entry terhadap batas store.",
    integrity: "Status rantai hash",
    integrityHint: "Dihitung ulang dari hash chain saat request.",
  },
  forecastTitle: "Prakiraan perubahan inventaris log",
  forecastDescription:
    "Perkiraan volume harian per source. Angka adalah asumsi perencanaan yang harus dikalibrasi ulang setelah backend tersedia.",
  forecastColumns: {
    source: "Source",
    tier: "Klasifikasi",
    infrastructure: "Infrastruktur",
    dailyVolume: "Volume/hari",
    workRoles: "Work role",
  },
  forecastTotalsTitle: "Total prakiraan volume",
  forecastTotalsNote:
    "Total ini penjumlahan asumsi perencanaan, bukan traffic terukur.",
  generationTitle: "Event type dan karakter data",
  generationDescription:
    "Daftar event yang boleh di-log beserta karakter data wajib dan frekuensinya.",
  generationEmpty: "Belum ada source yang diklasifikasi.",
  classificationTitle: "Klasifikasi source",
  classificationDescriptionTemplate:
    "{count} source dengan tingkat klasifikasi NIST SP 800-92.",
  handlingTitle: "Penanganan data, kegagalan logging, dan jam",
  handlingDescription:
    "Aturan yang berlaku saat record dibuat dan saat logging gagal.",
  hashedFieldsLabel: "Field yang di-hash",
  neverStoredLabel: "Tidak boleh disimpan",
  clockLabel: "Sinkronisasi jam",
  clockValueTemplate: "{protocol}, toleransi {drift} detik, zona {timezone}",
  failureLabel: "Saat logging gagal",
  failureValueTemplate:
    "Logging tidak memblokir request: {fallback}",
  accessModeTitle: "Mode akses",
  accessModeDescription:
    "Perbedaan kontrol untuk akses langsung, remote, dan tidak langsung.",
  accessProtectionTitle: "Proteksi akses",
  accessProtectionDescription:
    "Kontrol wajib yang berlaku per role sebelum log boleh dibuka.",
  accessLoggingTitle: "Pencatatan akses",
  accessLoggingDescription:
    "Setiap akses ke log menghasilkan event dengan severity minimal tertentu.",
  preservationTitle: "Urutan preservasi",
  preservationDescription:
    "Sumber preservation dengan prioritas tertinggi hingga terendah.",
  accessMonitoringTitle: "Pemantauan akses",
  accessMonitoringDescription:
    "Pola akses yang dianggap mencurigakan beserta level eskalasinya.",
  storageOpsTitle: "Transfer, korelasi, dan data reduction",
  storageOpsDescription:
    "Kebijakan transfer antar tier, aturan korelasi, dan pengurangan volume.",
  correlationTitle: "Aturan korelasi",
  dataReductionTitle: "Data reduction",
  formatTitle: "Format log",
  confidentialityLabel: "Kerahasiaan",
  integrityLabel: "Integritas",
  availabilityLabel: "Ketersediaan",
  protectionTitle: "Proteksi CIA pada storage",
  protectionDescription:
    "Kontrol kerahasiaan, integritas, dan ketersediaan untuk log yang disimpan.",
  disposalPreventionTitle: "Pencegahan penghapusan tidak sah",
  disposalPreventionDescription:
    "Kontrol yang mencegah penghapusan tanpa otorisasi. Kolom status jujur soal apa yang benar-benar dijalankan di template ini.",
  disposalVerificationTitle: "Langkah verifikasi disposal",
  disposalVerificationDescription:
    "Langkah wajib sebelum dan sesudah media disanitasi sesuai NIST SP 800-88.",
  columns: {
    eventType: "Event type",
    status: "Status",
    frequency: "Frekuensi",
    requiredCharacteristics: "Karakter data wajib",
    sensitiveKeys: "Key sensitif",
    transfer: "Transfer",
    transferMethod: "Metode transfer",
    control: "Kontrol",
    value: "Nilai",
    appliesTo: "Role",
    mode: "Mode",
    additionalControls: "Kontrol tambahan",
    condition: "Kondisi",
    response: "Tindakan",
    target: "Target respons",
    method: "Metode",
    standard: "Standar",
    rationale: "Alasan",
    monitoring: "Pemantauan",
    prevention: "Pencegahan",
    enforced: "Dijalankan di template",
    verificationStep: "Langkah",
    automated: "Otomatis",
    event: "Event",
    category: "Kategori",
    result: "Hasil",
    actor: "Aktor",
    timestamp: "Waktu",
  },
  retentionTitle: "Kebijakan retensi per kategori",
  retentionDescription:
    "Tier hot/warm/cold/archive, alasan retensi, dan dasar regulasi per kategori event.",
  retentionColumns: {
    category: "Kategori",
    tier: "Tier",
    days: "Masa simpan",
    rationale: "Alasan",
    basis: "Dasar",
  },
  storageTitle: "Kapasitas store saat ini",
  storageDescription:
    "Semua angka dihitung dari audit store in-memory. Tidak ada storage log eksternal yang terhubung.",
  storageEntriesLabel: "Entry tersimpan",
  storageSizeLabel: "Perkiraan ukuran JSON",
  storageUsageLabel: "Pakai batas store",
  storageLimitLabel: "Batas maksimum entry",
  storageDroppedLabel: "Entry terpotong (overflow)",
  storageStorageNote:
    "Perkiraan ukuran dihitung dari panjang JSON tiap entry, bukan sizeof objek atau ukuran disk.",
  accessTitle: "Level akses log per role",
  accessDescription:
    "Matriks akses terhadap log beserta syarat tambahan (MFA, sesi, jaringan, jam kerja).",
  accessColumns: {
    role: "Role",
    level: "Level akses",
    scope: "Cakupan",
    conditions: "Syarat",
  },
  disposalTitle: "Kebijakan disposal per kategori",
  disposalDescription:
    "Metode penghapusan, standar acuan, masa simpan, dan grace period sebelum penghapusan dieksekusi.",
  disposalColumns: {
    category: "Kategori",
    method: "Metode",
    standard: "Standar",
    retention: "Retensi",
    grace: "Grace period",
  },
  disposalQueueTitle: "Antrian disposal",
  disposalQueueDescription:
    "Item yang dijadwalkan dihapus setelah masa retensi habis. Penghapusan nyata butuh backend storage; di sini hanya status antrian yang direkam.",
  disposalQueueEmpty: "Belum ada item disposal terjadwal.",
  disposalQueueColumns: {
    id: "ID",
    category: "Kategori",
    status: "Status",
    scheduled: "Dijadwalkan",
    eligible: "Layak dihapus",
    action: "Aksi",
  },
  analysisTitle: "Hasil analisis log (Chapter 5)",
  analysisDescription:
    "Aturan deteksi dihitung dari event audit nyata di store. Nilai kosong berarti tidak ada pola yang cocok, bukan placeholder.",
  analysisEmpty: "Belum ada data yang cukup untuk menjalankan aturan analisis.",
  analysisColumns: {
    rule: "Aturan",
    severity: "Severity",
    matches: "Pencocokan",
    detail: "Detail",
  },
  monitoringTitle: "Pemantauan log",
  monitoringDescription:
    "KondisiDiam, error rate, kapasitas, dan integritas, semuanya dihitung dari store.",
  monitoringColumns: {
    check: "Pemeriksaan",
    status: "Status",
    observed: "Observasi",
  },
  incidentTitle: "Integrasi incident response",
  incidentDescription:
    "Alur eskalasi dari temuan analisis ke tim incident response beserta ambang severity.",
  reportTitle: "Laporan kepatuhan",
  reportDescription:
    "Ringkasan yang bisa diekspor; angkanya sama persis dengan yang dihitung di halaman ini.",
  integrityTitle: "Integritas log (hash chain)",
  integrityDescription:
    "Setiap entry audit berantai hash. Verifikasi dihitung ulang dari isi store, bukan dari teks statis.",
  integrityNeverVerified: "Belum pernah diverifikasi pada sesi server ini.",
  integrityVerifiedAt: "Verifikasi terakhir (server)",
  integrityEntriesChecked: "Entry diperiksa",
  integrityResult: "Hasil",
  integrityLastHash: "Hash terakhir",
  integrityCopyHashLabel: "Salin hash terakhir",
  integrityIntact: "Rantai hash utuh.",
  integrityValueUnknown: "-",
  integrityValueOk: "Utuh",
  integrityValueBrokenTemplate: "Rusak #{index}",
  integrityEntryCountTemplate:
    "{total} / {max} entry ({percent}%), {size} KB JSON, {dropped} entry terpotong.",
  integrityBrokenTemplate: "Rantai rusak pada indeks {index}.",
  verifyLabel: "Verifikasi sekarang",
  verifyRunning: "Memverifikasi...",
  sweepLabel: "Jalankan sweep disposal",
  sweepRunning: "Menjalankan...",
  approveLabel: "Setujui",
  completeLabel: "Tandai selesai",
  approveRunning: "Menyetujui...",
  completeRunning: "Menyelesaikan...",
  actionFeedback: "Aksi tidak tersedia di produksi.",
  productionDisabled: "Scheduler disposal dan verifikasi otomatis dinonaktifkan di produksi.",
};

export const LOG_POLICY_COPY: LogPolicyCopy = {
  tierLabels: {
    required: "Wajib",
    recommended: "Disarankan",
    "not-recommended": "Tidak disarankan",
    prohibited: "Dilarang",
  },
  storageTierLabels: {
    hot: "Hot",
    warm: "Warm",
    cold: "Cold",
    archive: "Arsip",
  },
  levelLabels: {
    none: "Tidak ada",
    "read-own": "Baca log sendiri",
    "read-category": "Baca per kategori",
    "read-all": "Baca semua log",
    admin: "Administrasi log",
  },
  severityLabels: {
    info: "Info",
    warning: "Peringatan",
    critical: "Kritis",
  },
  resultLabels: {
    success: "Sukses",
    failure: "Gagal",
    error: "Error",
  },
  approvedLabels: {
    required: "Wajib",
    "not-recommended": "Belum dijalankan",
  },
  permissionLabels: {
    allowed: "Boleh",
    prohibited: "Dilarang",
  },
  statusLabels: {
    scheduled: "Terjadwal",
    approved: "Disetujui",
    completed: "Selesai",
    rejected: "Ditolak",
  },
  frequencyLabels: {
    per_event: "Per kejadian",
    per_minute: "Per menit",
    per_hour: "Per jam",
    per_day: "Per hari",
  },
  methodLabels: {
    "crypto-shredding": "Crypto shredding",
    "secure-delete": "Secure delete",
    overwrite: "Overwrite",
    "physical-destruction": "Destruksi fisik",
  },
  confidentialityLabels: {
    low: "Rendah",
    medium: "Sedang",
    high: "Tinggi",
  },
  dispositionNote:
    "Metode mengikuti NIST SP 800-88 Rev.1 (Guidelines for Media Sanitization). Untuk log yang kuncinya sudah di-destruksi, crypto shredding dipilih karena tidak butuh pembongkaran fisik media.",
  frequencyNote:
    "Frekuensi minimal menjaga kontinuity untuk investigasi, sedangkan log gabungan mengurangi volume tanpa kehilangan informasi penting.",
  sensitiveNote:
    "Data sensitif disimpan dalam bentuk cleartext hanya bila dibutuhkan untuk investigasi; field yang bisa dihitung ulang (identifier, IP) disimpan sebagai hash. Deteksi key sensitif berjalan otomatis di redaksi metadata.",
  failurePolicyNote:
    "Kegagalan menulis log tidak boleh menggagalkan request pengguna; sistem menaikkan level severity dan mengirim notifikasi ke kanal operasional.",
  clockNote:
    "NTP wajib sinkron dengan toleransi drift 1 detik antar host.",
  monitoringNote:
    "Log harus diproteksi dari modifikasi tidak sah. Pemantauan dilakukan lewat event kategori `log` dan alarm saat verifikasi rantai gagal.",
  dataReductionNote:
    "Data reduction: agregasi, thresholding, sampling, dan eliminasi duplikasi dijalankan di lapisan ingestion sebelum penyimpanan.",
  transferNote:
    "Transfer antar storage tier memakai protokol terenkripsi, dan transfer tercatat di eventCategory = `log`.",
  correlationNote:
    "Correlation rules berjalan di atas store yang sama dan menggabungkan berdasarkan `requestId`, aktor, dan jendela waktu 5 menit.",
  protectionNote:
    "Proteksi CIA: enkripsi saat transit dan saat disimpan, kontrol akses berbasis role, serta jejak audit untuk setiap perubahan kebijakan.",
  remoteAccessNote:
    "Akses remote dibatasi lewat allowlist jaringan dan VPN; akses indirect (via BI/alert dashboard) tetap harus diaudit.",
  accessLoggingNote:
    "Setiap akses ke log (query, export, perubahan retention) dicatat sebagai eventCategory = `log` dengan severity minimal `info`.",
  preservationNote:
    "Preservation order berlaku bila ada permintaan legal hold: `legal-hold > incident` > kebijakan retensi normal, dan disposal diblokir selama hold aktif.",
  storageMonitoringNote:
    "Monitoring storage memonitor persentase pemakaian, laju pertumbuhan, dan entry yang terpotong karena batas store.",
  reportNote:
    "Laporan disusun dari angka yang sama dengan halaman ini; tidak ada angka hardcode di dalam laporan.",
  incidentNote:
    "Temuan kritis membuat insiden Tier 1 dengan target respons 30 menit dan wajib post-mortem.",
  integrityNote:
    "Verifikasi memakai `verifyAuditIntegrity()` yang menghitung ulang hash tiap entry. Belum pernah dipanggil berarti belum diverifikasi.",
};
