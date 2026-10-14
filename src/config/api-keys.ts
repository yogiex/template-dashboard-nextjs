export const API_KEYS_CONFIG = {
  title: "API Keys",
  description: "Kelola token akses untuk integrasi dan otomatisasi.",
  infoAlert:
    "Mode demo — key hanya disimpan secara lokal; secret mentah tidak akan ditampilkan ulang setelah dialog ditutup.",
  securityWarning:
    "Simpan key di lokasi aman; kehilangan key memerlukan regenerasi.",
  createLabel: "Buat API Key",
  nameLabel: "Nama",
  namePlaceholder: "mis. production-webhook",
  scopesLabel: "Scopes",
  scopesHelp: "Pilih minimal satu scope.",
  createdLabel: "API key berhasil dibuat. Salin sekarang.",
  copyLabel: "Salin",
  copiedLabel: "Disalin.",
  revokeLabel: "Revoke",
  revokedLabel: "API key dicabut (mock).",
  empty: {
    title: "Belum ada API key",
    description: "Buat key pertama Anda untuk mulai integrasi.",
  },
  revokedBadge: "Dicabut",
  activeBadge: "Aktif",
  maskedPrefixNote: "Hanya prefix yang ditampilkan.",
  columns: {
    name: "Nama",
    key: "Key",
    scopes: "Scopes",
    createdAt: "Dibuat",
    lastUsed: "Terakhir Dipakai",
    status: "Status",
  },
  scopesCatalog: {
    "read:users": "Baca daftar pengguna",
    "write:users": "Ubah pengguna",
    "read:organization": "Baca organisasi",
    "write:organization": "Ubah organisasi",
    "read:audit": "Baca audit log",
    "write:webhooks": "Kirim webhook",
    "read:metrics": "Baca metrik",
  } as Record<string, string>,
  revokeConfirm:
    "Mencabut key akan membuatnya tidak valid. Tindakan ini tidak dapat dibatalkan.",
} as const;
