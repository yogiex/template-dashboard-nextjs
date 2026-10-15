/**
 * Copy user-facing untuk modul Scheduling.
 *
 * Sumber kebenaran tunggal untuk label, alert, dan opsi form. Jangan taruh
 * copy ini inline di komponen (ARCHITECTURE §14.7).
 */
export const SCHEDULING_CONFIG = {
  title: "Scheduling",
  description:
    "Kelola jadwal harian, agenda mingguan, pengulangan, dan reminder.",
  infoAlert:
    "Mode demo — jadwal disimpan di browser ini (localStorage). Tidak ada sinkronisasi kalender eksternal.",
  actions: {
    create: "Buat Jadwal",
    edit: "Ubah Jadwal",
    delete: "Hapus",
    download: "Unduh .ics",
    reset: "Reset Demo",
  },
  views: {
    month: "Bulan",
    week: "Minggu",
    day: "Hari",
  },
  controls: {
    viewLabel: "Tampilan kalender",
  },
  navigation: {
    previous: "Sebelumnya",
    next: "Berikutnya",
    today: "Hari ini",
    selectedDay: "Agenda Hari Terpilih",
    upcoming: "Agenda Berikutnya",
    empty: "Belum ada jadwal pada periode ini.",
  },
  details: {
    time: "Waktu",
    location: "Lokasi",
    attendees: "Peserta",
    reminders: "Reminder",
    recurrence: "Pengulangan",
    description: "Deskripsi",
    none: "Tidak ada",
    allDay: "Sepanjang hari",
    recurringInstance: "Ini adalah satu instance dari jadwal berulang.",
  },
  form: {
    createTitle: "Buat Jadwal Baru",
    editTitle: "Ubah Jadwal",
    description:
      "Gunakan waktu lokal. Konflik dengan jadwal lain akan terdeteksi otomatis.",
    label: {
      title: "Judul",
      description: "Deskripsi",
      location: "Lokasi",
      category: "Kategori",
      start: "Mulai",
      end: "Selesai",
      allDay: "Sepanjang hari",
      recurrence: "Pengulangan",
      interval: "Interval",
      until: "Sampai",
      reminders: "Reminder",
      attendees: "Peserta (dipisah koma)",
    },
    placeholder: {
      title: "Ringkasan jadwal",
      description: "Tambahkan detail, agenda, atau tautan…",
      location: "Ruang rapat atau URL",
      attendees: "budi@acme.co, sari@acme.co",
      until: "Pilih tanggal selesai",
    },
    submitCreate: "Simpan Jadwal",
    submitUpdate: "Perbarui Jadwal",
    cancel: "Batal",
    error: {
      summary: "Periksa kembali isian berikut:",
      generic: "Input tidak valid.",
      conflict: "Jadwal bertabrakan dengan jadwal lain.",
      saveFailed: "Gagal menyimpan jadwal.",
    },
    success: {
      created: "Jadwal dibuat.",
      updated: "Jadwal diperbarui.",
      deleted: "Jadwal dihapus.",
      reset: "Data demo scheduling direset.",
      downloaded: "File .ics diunduh.",
    },
  },
  categories: {
    meeting: "Rapat",
    focus: "Fokus",
    release: "Rilis",
    personal: "Pribadi",
  },
  recurrence: {
    none: "Tidak berulang",
    daily: "Harian",
    weekly: "Mingguan",
    monthly: "Bulanan",
  },
  reminders: {
    onTime: "Tepat waktu",
    tenMinutes: "10 menit sebelum",
    thirtyMinutes: "30 menit sebelum",
    oneHour: "1 jam sebelum",
    oneDay: "1 hari sebelum",
  },
  summary: {
    total: "Total jadwal",
    recurring: "Berulang",
    reminders: "Punya reminder",
    today: "Hari ini",
  },
} as const;
