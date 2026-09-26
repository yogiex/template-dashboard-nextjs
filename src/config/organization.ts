/**
 * Konfigurasi dan data mock fitur org chart.
 *
 * PENTING: `ORGANIZATION_EMPLOYEES` adalah DATA MOCK untuk demo frontend.
 * Repo ini belum punya backend/database, jadi tidak ada data karyawan nyata
 * di sini. Jangan pakai nilai ini sebagai sumber kebenaran produksi, dan
 * jangan menaruh kredensial sungguhan di file ini.
 *
 * Seluruh copy Bahasa Indonesia untuk UI juga dikumpulkan di sini supaya
 * komponen tidak menulis teks inline.
 */

export interface OrganizationEmployeeSeed {
  id: string;
  name: string;
  role: string;
  department: string;
  email: string;
  avatarUrl?: string;
  managerId: string | null;
  directReports: number;
  location: string;
  joinedAt: string;
}

export interface OrganizationPageCopy {
  title: string;
  description: string;
  statsTitle: string;
  totalEmployeesLabel: string;
  departmentCountLabel: string;
  levelCountLabel: string;
  chartTitle: string;
  chartDescription: string;
  toolbarLabel: string;
  searchLabel: string;
  searchPlaceholder: string;
  searchClearLabel: string;
  departmentLabel: string;
  departmentAllLabel: string;
  directionLabel: string;
  directionVerticalLabel: string;
  directionHorizontalLabel: string;
  expandAllLabel: string;
  collapseAllLabel: string;
  fitViewLabel: string;
  resetLayoutLabel: string;
  noResultTitle: string;
  noResultDescription: string;
  clearFilterLabel: string;
  detailTitle: string;
  detailManagerLabel: string;
  detailTopManagerLabel: string;
  detailDirectReportsLabel: string;
  detailNoReportsLabel: string;
  detailLocationLabel: string;
  detailJoinedLabel: string;
  detailEmailLabel: string;
  detailManagerChainTitle: string;
  detailNoManagerLabel: string;
  detailSelectHint: string;
  avatarFallbackLabel: string;
  levelLabel: string;
  mockDataNotice: string;
}

/** Urutan departemen untuk filter; dataset mock sudah urut accordingly. */
export const ORGANIZATION_DEPARTMENTS = [
  "Executive",
  "Engineering",
  "Product",
  "Finance",
  "HR",
] as const;

/** 18 karyawan mock, hierarki 4 level, 5 departemen. */
export const ORGANIZATION_EMPLOYEES: OrganizationEmployeeSeed[] = [
  {
    id: "emp_001",
    name: "Budi Santoso",
    role: "Direktur Utama",
    department: "Executive",
    email: "budi.santoso@example.com",
    managerId: null,
    directReports: 4,
    location: "Jakarta Pusat",
    joinedAt: "2018-02-12T08:00:00.000Z",
  },
  {
    id: "emp_002",
    name: "Rina Kusuma",
    role: "Kepala Divisi Engineering",
    department: "Engineering",
    email: "rina.kusuma@example.com",
    managerId: "emp_001",
    directReports: 3,
    location: "Bandung, Jawa Barat",
    joinedAt: "2018-06-04T08:00:00.000Z",
  },
  {
    id: "emp_003",
    name: "Endra Wicaksono",
    role: "Kepala Divisi Product",
    department: "Product",
    email: "endra.wicaksono@example.com",
    managerId: "emp_001",
    directReports: 2,
    location: "Jakarta Selatan",
    joinedAt: "2019-01-21T08:00:00.000Z",
  },
  {
    id: "emp_004",
    name: "Sari Melati",
    role: "Kepala Divisi Finance",
    department: "Finance",
    email: "sari.melati@example.com",
    managerId: "emp_001",
    directReports: 1,
    location: "Jakarta Pusat",
    joinedAt: "2019-08-05T08:00:00.000Z",
  },
  {
    id: "emp_005",
    name: "Hesti Rahmawati",
    role: "Kepala Divisi HR",
    department: "HR",
    email: "hesti.rahmawati@example.com",
    managerId: "emp_001",
    directReports: 1,
    location: "Jakarta Pusat",
    joinedAt: "2020-03-16T08:00:00.000Z",
  },
  {
    id: "emp_006",
    name: "Andi Pratama",
    role: "Manajer Engineering",
    department: "Engineering",
    email: "andi.pratama@example.com",
    managerId: "emp_002",
    directReports: 3,
    location: "Bandung, Jawa Barat",
    joinedAt: "2019-05-13T08:00:00.000Z",
  },
  {
    id: "emp_007",
    name: "Dewi Anggraini",
    role: "Senior Backend Engineer",
    department: "Engineering",
    email: "dewi.anggraini@example.com",
    managerId: "emp_002",
    directReports: 0,
    location: "Yogyakarta",
    joinedAt: "2020-09-07T08:00:00.000Z",
  },
  {
    id: "emp_008",
    name: "Rizky Ramadhan",
    role: "Manajer Produk",
    department: "Product",
    email: "rizky.ramadhan@example.com",
    managerId: "emp_003",
    directReports: 2,
    location: "Jakarta Selatan",
    joinedAt: "2020-02-10T08:00:00.000Z",
  },
  {
    id: "emp_009",
    name: "Nadia Puspita",
    role: "Desainer UX",
    department: "Product",
    email: "nadia.puspita@example.com",
    managerId: "emp_003",
    directReports: 0,
    location: "Surabaya, Jawa Timur",
    joinedAt: "2021-04-19T08:00:00.000Z",
  },
  {
    id: "emp_010",
    name: "Taufik Hidayat",
    role: "Manajer Keuangan",
    department: "Finance",
    email: "taufik.hidayat@example.com",
    managerId: "emp_004",
    directReports: 1,
    location: "Jakarta Pusat",
    joinedAt: "2020-11-02T08:00:00.000Z",
  },
  {
    id: "emp_011",
    name: "Maya Puspitasari",
    role: "People Partner",
    department: "HR",
    email: "maya.puspitasari@example.com",
    managerId: "emp_005",
    directReports: 1,
    location: "Bandung, Jawa Barat",
    joinedAt: "2021-01-25T08:00:00.000Z",
  },
  {
    id: "emp_012",
    name: "Fajar Nugroho",
    role: "Frontend Engineer",
    department: "Engineering",
    email: "fajar.nugroho@example.com",
    managerId: "emp_006",
    directReports: 0,
    location: "Bandung, Jawa Barat",
    joinedAt: "2021-07-12T08:00:00.000Z",
  },
  {
    id: "emp_013",
    name: "Ratna Sari",
    role: "QA Engineer",
    department: "Engineering",
    email: "ratna.sari@example.com",
    managerId: "emp_006",
    directReports: 0,
    location: "Yogyakarta",
    joinedAt: "2022-03-07T08:00:00.000Z",
  },
  {
    id: "emp_014",
    name: "Yoga Pratama",
    role: "Data Engineer",
    department: "Engineering",
    email: "yoga.pratama@example.com",
    managerId: "emp_006",
    directReports: 0,
    location: "Jakarta Selatan",
    joinedAt: "2022-09-19T08:00:00.000Z",
  },
  {
    id: "emp_015",
    name: "Citra Ayu",
    role: "Product Designer",
    department: "Product",
    email: "citra.ayu@example.com",
    managerId: "emp_008",
    directReports: 0,
    location: "Surabaya, Jawa Timur",
    joinedAt: "2022-01-24T08:00:00.000Z",
  },
  {
    id: "emp_016",
    name: "Bagus Firmansyah",
    role: "Business Analyst",
    department: "Product",
    email: "bagus.firmansyah@example.com",
    managerId: "emp_008",
    directReports: 0,
    location: "Jakarta Selatan",
    joinedAt: "2022-06-13T08:00:00.000Z",
  },
  {
    id: "emp_017",
    name: "Lintang Kumala",
    role: "Accountant",
    department: "Finance",
    email: "lintang.kumala@example.com",
    managerId: "emp_010",
    directReports: 0,
    location: "Jakarta Pusat",
    joinedAt: "2023-02-06T08:00:00.000Z",
  },
  {
    id: "emp_018",
    name: "Rama Danu",
    role: "Talent Acquisition",
    department: "HR",
    email: "rama.danu@example.com",
    managerId: "emp_011",
    directReports: 0,
    location: "Yogyakarta",
    joinedAt: "2023-08-14T08:00:00.000Z",
  },
];

export const ORGANIZATION_COPY: OrganizationPageCopy = {
  title: "Struktur Organisasi",
  description:
    "Lihat hierarki perusahaan dalam empat level: dari-direktur, kepala divisi, manajer, sampai anggota tim.",
  statsTitle: "Ringkasan tim",
  totalEmployeesLabel: "Total karyawan",
  departmentCountLabel: "Departemen",
  levelCountLabel: "Jumlah level",
  chartTitle: "Diagram organisasi",
  chartDescription:
    "Geser diagram untuk menjelajah, klik kartu karyawan untuk melihat detail.",
  toolbarLabel: "Kontrol diagram",
  searchLabel: "Cari karyawan",
  searchPlaceholder: "Cari nama, jabatan, atau email...",
  searchClearLabel: "Bersihkan pencarian",
  departmentLabel: "Departemen",
  departmentAllLabel: "Semua departemen",
  directionLabel: "Arah diagram",
  directionVerticalLabel: "Atas ke bawah",
  directionHorizontalLabel: "Kiri ke kanan",
  expandAllLabel: "Buka semua",
  collapseAllLabel: "Tutup semua",
  fitViewLabel: "Pas ke layar",
  resetLayoutLabel: "Atur ulang tata letak",
  noResultTitle: "Karyawan tidak ditemukan",
  noResultDescription:
    "Coba kata kunci lain atau pilih departemen yang berbeda.",
  clearFilterLabel: "Bersihkan filter",
  detailTitle: "Detail karyawan",
  detailManagerLabel: "Atasan langsung",
  detailTopManagerLabel: "Atasan tertinggi",
  detailDirectReportsLabel: "Laporan langsung",
  detailNoReportsLabel: "Tidak ada laporan langsung.",
  detailLocationLabel: "Lokasi",
  detailJoinedLabel: "Bergabung sejak",
  detailEmailLabel: "Email",
  detailManagerChainTitle: "Rantai atasan",
  detailNoManagerLabel: "Tidak ada atasan langsung.",
  detailSelectHint: "Pilih kartu karyawan untuk melihat detail.",
  avatarFallbackLabel: "Inisial nama",
  levelLabel: "Level",
  mockDataNotice: "Data contoh untuk demo, bukan data karyawan nyata.",
};

/** Template angka yang butuh penyisipan nilai saat render. */
export const ORGANIZATION_FORMAT = {
  employeesTemplate: "{count} karyawan",
  directReportsTemplate: "{count} orang",
  levelTemplate: "Level {level}",
  joinedTemplate: "Bergabung {date}",
  /**
   * Locale untuk `Intl.NumberFormat`/`Intl.DateTimeFormat`. Angka dan tanggal
   * dihitung sekali di modul komponen, bukan di dalam JSX.
   */
  numberLocale: "id-ID",
  dateLocale: "id-ID",
} as const;
