export const landingConfig = {
  hero: {
    badge: "Open template — siap dipakai",
    headline: "Dashboard modern untuk aplikasi Anda",
    description:
      "Template Next.js + shadcn/ui dengan auth, keamanan berlapis, dan pola kode yang konsisten. Clone, kustomisasi, langsung kirim.",
    primaryCta: { label: "Mulai Gratis", href: "/register" },
    secondaryCta: { label: "Masuk", href: "/login" },
  },
  features: [
    {
      title: "Siap produksi",
      description:
        "Security headers, validasi input, dan error handling berstandar RFC 9457 sejak hari pertama.",
    },
    {
      title: "Pola yang konsisten",
      description:
        "Struktur folder, penamaan, dan alur data terdokumentasi — mudah di-maintain jangka panjang.",
    },
    {
      title: "Dark mode & responsif",
      description:
        "Tampilan adaptif desktop hingga mobile dengan tema terang dan gelap.",
    },
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
