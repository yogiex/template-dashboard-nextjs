export const MFA_SETTINGS_CONFIG = {
  title: "Autentikasi Dua Faktor (MFA)",
  description: "Lindungi akun dengan kata sandi satu kali dari aplikasi authenticator.",
  infoAlert:
    "Mode demo — secret dan kode verifikasi dikelola di browser; bukan production.",
  infoAlertProduction:
    "Pada production, secret disimpan berbasis backend dan kode dikirim via TOTP, bukan mock.",
  status: {
    enrolled: "MFA Aktif",
    notEnrolled: "MFA Belum Aktif",
  },
  enroll: {
    startLabel: "Mulai Enroll",
    qrTitle: "Pindai QR dengan aplikasi authenticator",
    manualLabel: "Atau masukkan kode manual:",
    codeLabel: "Kode Verifikasi",
    codePlaceholder: "000000",
    verifyLabel: "Verifikasi Kode",
    verifiedLabel: "MFA berhasil diaktifkan (mock).",
    mockHint: "Hint mock: gunakan kode 123456.",
    cancelLabel: "Batal",
  },
  backup: {
    title: "Kode Backup",
    regenerateLabel: "Regenerasi",
    regenerateNote: "Kode lama menjadi tidak valid setelah regenerasi.",
    copyLabel: "Salin Semua",
    downloadLabel: "Unduh (.txt)",
    copyLabelSuccess: "Kode backup disalin.",
  },
  trust: {
    label: "Percaya Perangkat Ini",
    description:
      "Perangkat ini tidak akan diminta kode MFA selama 30 hari.",
    savedLabel: "Preferensi perangkat diproses (mock).",
  },
  disable: {
    buttonLabel: "Nonaktifkan MFA",
    disabledLabel: "MFA dinonaktifkan (mock).",
    confirmWord: "DISABLE",
  },
} as const;
