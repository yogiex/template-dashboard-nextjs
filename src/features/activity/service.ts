import "server-only";

import {
  activityQuerySchema,
  activitySchema,
  type Activity,
  type ActivityPage,
  type ActivityQuery,
} from "@/features/activity/schema";

const now = Date.now();

const MOCK_ACTIVITY: Activity[] = [
  { id: "act_01", category: "data", actor: "Budi Santoso", action: "menghapus", target: "Produk #231", href: "/users", createdAt: new Date(now - 2 * 60_000) },
  { id: "act_02", category: "auth", actor: "Sari Wulandari", action: "masuk dari perangkat baru", target: "Chrome di macOS", createdAt: new Date(now - 45 * 60_000) },
  { id: "act_03", category: "config", actor: "Andi Pratama", action: "memperbarui", target: "Pengaturan notifikasi", href: "/settings", createdAt: new Date(now - 3 * 60 * 60_000) },
  { id: "act_04", category: "security", actor: "System", action: "memblokir", target: "Login dari IP 192.168.1.100", createdAt: new Date(now - 5 * 60 * 60_000) },
  { id: "act_05", category: "data", actor: "Dewi Lestari", action: "mengekspor", target: "Laporan Penjualan Q3", href: "/dashboard", createdAt: new Date(now - 26 * 60 * 60_000) },
  { id: "act_06", category: "system", actor: "Backup Service", action: "menyelesaikan", target: "Backup harian (2.3 GB)", createdAt: new Date(now - 2 * 24 * 60 * 60_000) },
  { id: "act_07", category: "auth", actor: "Budi Santoso", action: "mengganti kata sandi", target: "Akun sendiri", createdAt: new Date(now - 3 * 24 * 60 * 60_000) },
  { id: "act_08", category: "config", actor: "Maya Sari", action: "mengubah", target: "Tema aplikasi", createdAt: new Date(now - 4 * 24 * 60 * 60_000) },
  { id: "act_09", category: "data", actor: "Fajar Nugroho", action: "mengedit", target: "Memperbarui profil pengguna", createdAt: new Date(now - 5 * 24 * 60 * 60_000) },
  { id: "act_10", category: "security", actor: "System", action: "mendeteksi", target: "4 percobaan login gagal", createdAt: new Date(now - 6 * 24 * 60 * 60_000) },
];

const validatedItems: Activity[] = MOCK_ACTIVITY.map((item) => activitySchema.parse(item));

export function queryActivityFeed(input: unknown): ActivityPage {
  const parsed = activityQuerySchema.safeParse(input ?? {});
  if (!parsed.success) {
    return { items: [], total: 0, page: 1, pageSize: 25, totalPages: 1 };
  }

  const query = parsed.data;
  let items = [...validatedItems];

  if (query.category) {
    items = items.filter((item) => item.category === query.category);
  }

  items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 25;
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const paginated = items.slice(start, start + pageSize);

  return { items: paginated, total, page, pageSize, totalPages };
}
