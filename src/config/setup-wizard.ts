import type { SetupWizardConfig } from "@/features/setup-wizard/schema";

export const SETUP_WIZARD_CONFIG: SetupWizardConfig = {
  title: "Penyiapan Awal",
  description: "Lengkapi konfigurasi dasar aplikasi Anda dalam beberapa langkah.",
  steps: [
    {
      id: "profile",
      title: "Profil",
      description: "Tentukan nama dan detail profil Anda.",
    },
    {
      id: "team",
      title: "Tim",
      description: "Undang anggota tim dan tetapkan peran.",
    },
    {
      id: "preferences",
      title: "Preferensi",
      description: "Atur notifikasi dan tampilan.",
    },
    {
      id: "review",
      title: "Selesai",
      description: "Tinjau dan konfigurasi awal Anda.",
    },
  ],
  nextLabel: "Lanjut",
  backLabel: "Kembali",
  finishLabel: "Selesai",
  skipLabel: "Lewati",
  successLabel: "Penyiapan awal selesai (mock).",
  profileStepTitle: "Profil Anda",
  profileStepDesc: "Informasi ini akan ditampilkan di seluruh aplikasi.",
  nameLabel: "Nama",
  namePlaceholder: "Masukkan nama lengkap",
  teamStepTitle: "Anggota Tim",
  teamStepDesc: "Tambahkan kolaborator ke workspace Anda.",
  inviteEmailLabel: "Email Undangan",
  inviteEmailPlaceholder: "nama@perusahaan.com",
  inviteRoleLabel: "Peran",
  inviteButtonLabel: "Undang",
  preferencesStepTitle: "Preferensi",
  preferencesStepDesc: "Personalisasi pengalaman Anda.",
  emailNotificationsLabel: "Notifikasi Email",
  pushNotificationsLabel: "Notifikasi Push",
  weeklyDigestLabel: "Ringkasan Mingguan",
  reviewStepTitle: "Tinjauan",
  reviewStepDesc: "Pastikan semua informasi sudah benar.",
  infoAlert:
    "Mode demo — penyiapan awal hanya tersimpan di browser dan tidak dikirim ke server.",
} as const;
