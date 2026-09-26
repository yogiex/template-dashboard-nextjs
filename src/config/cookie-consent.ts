/**
 * Copy untuk banner persetujuan cookie.
 *
 * Banner ini hanya mekanisme persetujuan: template tidak memuat analytics, ads,
 * atau tracker pihak ketiga apa pun. Copy di sini harus tetap jujur — jangan
 * menjanjikan kategori cookie yang tidak benar-benar dipakai. `privacy.href`
 * hanya boleh menunjuk route yang benar-benar ada.
 */
export const cookieConsentCopy = {
  title: "Kami menggunakan cookie",
  description:
    "Kami menyimpan cookie dan teknologi serupa agar situs tetap berjalan dan pilihan Anda tidak hilang. Template ini belum memuat pelacak pihak ketiga; bila Anda menambahkan analytics, tahan skrip tersebut sampai persetujuan diberikan.",
  actions: {
    accept: "Terima semua",
    reject: "Tolak semua",
  },
  privacy: { label: "Kebijakan privasi", href: "/privacy" },
  dismiss: "Tutup untuk sekarang",
} as const;
