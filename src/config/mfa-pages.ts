import type { MfaMethod } from "@/features/auth/schema";

export interface MfaChallengePageConfig {
  title: string;
  /** Gunakan placeholder `{email}`; diganti email ter-mask di server. */
  descriptionTemplate: string;
  otpGroupLabel: string;
  submitLabel: string;
  submittingLabel: string;
  resendLabel: string;
  resendSentLabel: string;
  backupCodePrompt: string;
  backupCodeLabel: string;
  backupCodeHref: string;
  backToLoginLabel: string;
  demoHint: string;
  invalidSessionMessage: string;
}

export interface MfaBackupCodePageConfig {
  title: string;
  description: string;
  codeLabel: string;
  codePlaceholder: string;
  submitLabel: string;
  submittingLabel: string;
  backToChallengeLabel: string;
  backToChallengeHref: string;
  demoHint: string;
}

export interface MfaMethodCardConfig {
  method: MfaMethod;
  title: string;
  description: string;
  badge?: string;
}

export interface MfaSetupTotpConfig {
  title: string;
  description: string;
  qrLabel: string;
  manualEntryLabel: string;
  copySecretLabel: string;
  copiedLabel: string;
  codeLabel: string;
  confirmLabel: string;
  submittingLabel: string;
  backLabel: string;
  demoHint: string;
}

export interface MfaSetupEmailConfig {
  title: string;
  descriptionTemplate: string;
  sendCodeLabel: string;
  sentMessage: string;
  resendLabel: string;
  codeLabel: string;
  confirmLabel: string;
  submittingLabel: string;
  backLabel: string;
  demoHint: string;
}

export interface MfaBackupCodesConfig {
  title: string;
  description: string;
  warning: string;
  copyLabel: string;
  copiedLabel: string;
  downloadLabel: string;
  confirmLabel: string;
  doneLabel: string;
}

export interface SecuritySettingsConfig {
  title: string;
  description: string;
  statusCardTitle: string;
  activeStatusTemplate: string;
  activeBackupCodesTemplate: string;
  inactiveStatus: string;
  disableTitle: string;
  disableDescription: string;
  passwordLabel: string;
  disableLabel: string;
  disablingLabel: string;
  disableSuccessMessage: string;
  setupTitle: string;
  setupDescription: string;
  methods: MfaMethodCardConfig[];
  totp: MfaSetupTotpConfig;
  email: MfaSetupEmailConfig;
  backupCodes: MfaBackupCodesConfig;
  enabledTitle: string;
  enabledDescription: string;
}

export const MFA_CHALLENGE_PAGE_CONFIG: MfaChallengePageConfig = {
  title: "Verifikasi dua langkah",
  descriptionTemplate:
    "Masukkan 6 digit kode dari aplikasi authenticator atau kode yang kami kirim ke {email}.",
  otpGroupLabel: "Kode verifikasi",
  submitLabel: "Verifikasi",
  submittingLabel: "Memverifikasi...",
  resendLabel: "Kirim ulang kode",
  resendSentLabel: "Kode baru dikirim.",
  backupCodePrompt: "Tidak bisa akses authenticator?",
  backupCodeLabel: "Pakai backup code",
  backupCodeHref: "/login/mfa/backup",
  backToLoginLabel: "Kembali ke masuk",
  demoHint:
    "Mode demo: kode 123456 diterima, selain kode asli dari authenticator app.",
  invalidSessionMessage: "Sesi verifikasi tidak valid atau sudah berakhir.",
};

export const MFA_BACKUP_CODE_PAGE_CONFIG: MfaBackupCodePageConfig = {
  title: "Gunakan backup code",
  description:
    "Masukkan salah satu backup code yang Anda simpan saat mengaktifkan MFA. Setiap kode hanya bisa dipakai sekali.",
  codeLabel: "Backup code",
  codePlaceholder: "XXXX-XXXX",
  submitLabel: "Verifikasi kode",
  submittingLabel: "Memverifikasi...",
  backToChallengeLabel: "Kembali ke kode OTP",
  backToChallengeHref: "/login/mfa",
  demoHint:
    "Mode demo: kode berformat XXXX-XXXX apa pun akan diterima, jadi alur bisa dicoba tanpa daftar kode asli.",
};

export const SECURITY_SETTINGS_CONFIG: SecuritySettingsConfig = {
  title: "Autentikasi dua faktor",
  description:
    "Tambah lapisan keamanan ekstra untuk akun Anda. Direkomendasikan untuk semua akun dengan akses admin.",
  statusCardTitle: "Status",
  activeStatusTemplate: "Aktif sejak {date} ({method}).",
  activeBackupCodesTemplate: "Sisa backup code: {count} dari 10.",
  inactiveStatus: "Belum aktif. Login hanya melewati satu langkah.",
  disableTitle: "Nonaktifkan MFA",
  disableDescription:
    "MFA dinonaktifkan setelah kata sandi akun dikonfirmasi. Backup code yang tersisa ikut tidak berlaku.",
  passwordLabel: "Kata sandi akun",
  disableLabel: "Nonaktifkan MFA",
  disablingLabel: "Memproses...",
  disableSuccessMessage: "MFA dinonaktifkan. Login kembali hanya satu langkah.",
  setupTitle: "Aktifkan MFA",
  setupDescription:
    "Pilih metode. Kode OTP akan diminta setiap kali Anda masuk setelah kata sandi benar.",
  methods: [
    {
      method: "totp",
      title: "Authenticator app",
      description:
        "Gunakan Google Authenticator, Authy, atau 1Password. Bekerja offline dan tidak bergantung pada email.",
      badge: "Direkomendasikan",
    },
    {
      method: "email",
      title: "Email OTP",
      description:
        "Terima kode 6-digit lewat email setiap kali masuk. Cocok kalau authenticator app tidak tersedia.",
    },
  ],
  totp: {
    title: "Scan QR dengan authenticator",
    description:
      "Buka Google Authenticator, Authy, atau 1Password, lalu pindai kode di bawah.",
    qrLabel: "QR code enrolment authenticator",
    manualEntryLabel: "Tidak bisa memindai? Masukkan secret manual:",
    copySecretLabel: "Salin secret",
    copiedLabel: "Tersalin",
    codeLabel: "Masukkan kode 6-digit dari authenticator untuk konfirmasi.",
    confirmLabel: "Aktifkan MFA",
    submittingLabel: "Memverifikasi...",
    backLabel: "Ganti metode",
    demoHint: "Mode demo: kode 123456 juga diterima untuk mencoba alur ini.",
  },
  email: {
    title: "Kirim kode ke email",
    descriptionTemplate: "Kami akan mengirim kode 6-digit ke {email}.",
    sendCodeLabel: "Kirim kode",
    sentMessage:
      "Kode sudah dikirim. Periksa kotak masuk dan folder spam sebelum mencoba kode berikutnya.",
    resendLabel: "Kirim ulang kode",
    codeLabel: "Masukkan kode yang Anda terima.",
    confirmLabel: "Aktifkan MFA",
    submittingLabel: "Memverifikasi...",
    backLabel: "Ganti metode",
    demoHint: "Mode demo: kode 123456 diterima tanpa pengiriman email sungguhan.",
  },
  backupCodes: {
    title: "Simpan backup code",
    description:
      "Simpan 10 kode ini di tempat aman. Setiap kode hanya bisa dipakai sekali untuk masuk tanpa authenticator.",
    warning:
      "Kode hanya ditampilkan sekali. Kalau hilang, Anda tidak bisa melihatnya lagi — hanya bisa generate ulang.",
    copyLabel: "Salin semua",
    copiedLabel: "Tersalin",
    downloadLabel: "Unduh .txt",
    confirmLabel:
      "Saya sudah menyimpan backup code di tempat aman dan mengerti kode ini tidak bisa dilihat lagi.",
    doneLabel: "Selesai",
  },
  enabledTitle: "MFA aktif",
  enabledDescription:
    "Autentikasi dua faktor sudah aktif. Anda akan diminta kode verifikasi setiap kali masuk.",
};
