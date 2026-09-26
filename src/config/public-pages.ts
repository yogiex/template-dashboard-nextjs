export const landingConfig = {
  hero: {
    eyebrow: "Open template — Next.js 16 · Tailwind v4",
    headline: "Dashboard yang bekerja",
    headlineAccent: "secepat tim Anda.",
    subheadline:
      "Template Next.js + shadcn/ui dengan auth, keamanan berlapis, dan pola kode yang konsisten. Untuk tim yang tidak punya waktu menunggu.",
    primaryCta: { label: "Mulai Gratis", href: "/register" },
    secondaryCta: { label: "Masuk", href: "/login" },
    microcopy: "Tanpa kartu kredit · Setup 2 menit",
  },
  features: [
    {
      icon: "layout-dashboard",
      title: "Layout responsif",
      description:
        "Sidebar, topbar, dan konten yang beradaptasi di setiap layar.",
    },
    {
      icon: "shield-check",
      title: "Aman by design",
      description:
        "Validasi input, security headers, dan error taxonomy siap dari hari pertama.",
    },
    {
      icon: "zap",
      title: "Cepat & ringan",
      description:
        "Server Component default dengan client boundary sekecil mungkin.",
    },
  ],
  steps: [
    {
      title: "Clone template",
      description:
        "Salin repo, atur environment, jalankan satu perintah untuk development.",
    },
    {
      title: "Kustomisasi",
      description:
        "Ganti token warna, brand, dan copy tanpa menyentuh pola komponen.",
    },
    {
      title: "Kirim",
      description:
        "Linting, typecheck, dan build sudah terangkai. Tinggal deploy.",
    },
  ],
  faq: [
    {
      q: "Apakah ada uji coba gratis?",
      a: "Ya, template ini open source dan bisa langsung dipakai tanpa biaya.",
    },
    {
      q: "Bisa dipakai untuk produk komersial?",
      a: "Bisa, selama Anda memeriksa syarat lisensi pada repository.",
    },
    {
      q: "Teknologi apa saja yang dipakai?",
      a: "Next.js App Router, React, TypeScript, Tailwind CSS v4, dan shadcn/ui.",
    },
    {
      q: "Bagaimana keamanan ditangani?",
      a: "Security headers, validasi input Zod, dan session handling sudah disiapkan.",
    },
    {
      q: "Bisakah saya mengganti tema warna?",
      a: "Bisa. Semua warna memakai token semantic, jadi cukup ubah satu file CSS.",
    },
  ],
  cta: {
    title: "Siap mulai membangun?",
    description:
      "Gunakan template ini sebagai fondasi aplikasi dashboard Anda berikutnya.",
    primaryCta: { label: "Mulai Gratis", href: "/register" },
    secondaryCta: { label: "Lihat Halaman Masuk", href: "/login" },
  },
} as const;

export const aboutConfig = {
  title: "Tentang Dashboard",
  description:
    "Fondasi dashboard admin yang aman, cepat, dan mudah dikustomisasi untuk tim Anda.",
  intro: [
    "Dashboard dibangun sebagai template admin yang opinionated: keamanan, struktur folder, dan alur data sudah matures sejak hari pertama, sehingga tim Anda bisa fokus pada fitur produk.",
    "Semua warna, teks, dan navigasi memakai token semantic, jadi penyesuaian brand cukup menyentuh satu file CSS tanpa menyentuh pola komponen.",
  ],
  values: [
    {
      title: "Keamanan sejak awal",
      description:
        "Security headers, validasi input Zod, dan session handling sudah disiapkan di setiap boundary.",
    },
    {
      title: "Performa sebagai default",
      description:
        "Server Component secara default, client boundary sekecil mungkin, dan bundle terkendali.",
    },
    {
      title: "Mudah dirawat",
      description:
        "Struktur feature-first, penamaan konsisten, dan alur data yang terdokumentasi.",
    },
  ],
  valueIcons: ["security", "performance", "maintainability"] as const,
  principles: [
    {
      title: "Dokumentasi dulu",
      description:
        "Keputusan arsitektur ditulis sebelum kode, sehingga tidak ada pengetahuan yang hanya hidup di kepala satu orang.",
    },
    {
      title: "Boundary yang jelas",
      description:
        "Server Component secara default, client boundary sekecil mungkin, dan secret tidak pernah masuk browser.",
    },
    {
      title: "Kalau ragu, tunda",
      description:
        "Fitur yang kebutuhannya belum jelas tidak masuk lebih dulu. Lebih sedikit, tapi solid.",
    },
  ],
  cta: { label: "Hubungi kami", href: "/contact" },
} as const;

export const contactConfig = {
  title: "Hubungi kami",
  description:
    "Pertanyaan, masukan, atau permintaan kerja sama? Tulis di sini, kami membalas dalam 1×24 jam kerja.",
  channels: [
    { label: "Email", value: "support@example.com", href: "mailto:support@example.com" },
  ],
  faq: [
    {
      q: "Apakah template ini bisa dipakai untuk produk komersial?",
      a: "Bisa, selama Anda memeriksa syarat lisensi pada repository.",
    },
    {
      q: "Bisakah saya meminta konsultasi awal?",
      a: "Bisa, sertakan detail konteks produk Anda di pesan.",
    },
    {
      q: "Bagaimana cara melaporkan masalah keamanan?",
      a: "Kirim detail reproduksi minimal melalui form ini atau issue tracker repository.",
    },
  ],
} as const;

export const footerConfig = {
  tagline: "Dashboard modern untuk tim yang bergerak cepat.",
  columns: [
    {
      title: "Produk",
      links: [
        { href: "/#features", label: "Fitur" },
        { href: "/#faq", label: "Pertanyaan umum" },
      ],
    },
    {
      title: "Perusahaan",
      links: [
        { href: "/about", label: "Tentang" },
        { href: "/contact", label: "Kontak" },
      ],
    },
    {
      title: "Sumber Daya",
      links: [{ href: "/terms", label: "Syarat & Ketentuan" }],
    },
  ],
  legal: [
    { href: "/privacy", label: "Privasi" },
    { href: "/terms", label: "Ketentuan" },
  ],
} as const;

export interface LegalSection {
  heading: string;
  body: string[];
}

export interface LegalDoc {
  title: string;
  updatedAt: string;
  intro: string;
  sections: LegalSection[];
}

export const termsDoc: LegalDoc = {
  title: "Syarat & Ketentuan",
  updatedAt: "2025-01-01",
  intro:
    "Dengan menggunakan layanan ini, Anda menyetujui syarat dan ketentuan berikut. Placeholder — sesuaikan dengan kebutuhan aplikasi Anda.",
  sections: [
    {
      heading: "1. Penggunaan Layanan",
      body: [
        "Anda bertanggung jawab atas aktivitas yang terjadi di akun Anda dan untuk menjaga kerahasiaan kredensial Anda.",
      ],
    },
    {
      heading: "2. Akun Pengguna",
      body: [
        "Anda wajib memberikan informasi yang akurat saat pendaftaran. Satu orang atau entitas hanya boleh memiliki satu akun kecuali diizinkan lain.",
      ],
    },
    {
      heading: "3. Penghentian Layanan",
      body: [
        "Kami berhak menangguhkan atau menghentikan akses akun yang melanggar ketentuan ini.",
      ],
    },
  ],
};

export const privacyDoc: LegalDoc = {
  title: "Kebijakan Privasi",
  updatedAt: "2025-01-01",
  intro:
    "Kebijakan ini menjelaskan bagaimana kami mengumpulkan, menggunakan, dan melindungi data Anda. Placeholder — sesuaikan dengan kebutuhan aplikasi Anda.",
  sections: [
    {
      heading: "1. Data yang Kami Kumpulkan",
      body: [
        "Kami mengumpulkan informasi yang Anda berikan saat mendaftar (nama, email) serta data teknis minimum untuk keperluan operasional dan keamanan.",
      ],
    },
    {
      heading: "2. Penggunaan Data",
      body: [
        "Data digunakan untuk menyediakan layanan, keamanan akun, dan komunikasi terkait layanan. Kami tidak menjual data pribadi Anda.",
      ],
    },
    {
      heading: "3. Penyimpanan & Keamanan",
      body: [
        "Password disimpan dalam bentuk hash, bukan teks asli. Kami menerapkan kontrol akses dan enkripsi sesuai praktik terbaik industri.",
      ],
    },
    {
      heading: "4. Hak Anda",
      body: [
        "Anda berhak meminta akses, koreksi, atau penghapusan data pribadi Anda dengan menghubungi kami.",
      ],
    },
  ],
};
