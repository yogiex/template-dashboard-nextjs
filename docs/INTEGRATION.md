# Integration Handbook — Menghubungkan Template ke Backend Asli

> Panduan resmi untuk pengguna template: mengganti mock service menjadi API atau database-mu sendiri. Template ini **frontend-only by design**. Semua logic yang biasanya ada di backend sudah disiapkan dengan pola validasi, error taxonomy, dan RBAC guard. Isi titik integrasinya tanpa mengganti UI atau schema.
>
> Target integrasi dasar: **≤ 30 menit** dengan checklist di §6.

---

## 1. Prinsip yang Perlu Dipahami Dulu

Template memisahkan kode menjadi dua zona:

```text
┌──────────────────────────────────────────────────────────────┐
│ ZONA AMAN (jangan diubah untuk integrasi data)               │
│ - UI: components/ dan features/*/components/                │
│ - Schema/type: features/*/schema.ts dan types.ts             │
│ - Error contract: lib/error.ts dan lib/api.ts               │
│ - Halaman: app/                                              │
│ - searchParams: lib/search-params.ts                          │
├──────────────────────────────────────────────────────────────┤
│ ZONA INTEGRASI (isi backend-mu di sini)                     │
│ - Service: features/*/service.ts                             │
│ - Session/RBAC: lib/rbac.ts                                  │
│ - Rate limit: lib/rate-limit.ts                              │
│ - Server actions: features/*/actions.ts (opsional)            │
└──────────────────────────────────────────────────────────────┘
```

**Aturan emas:** selama service mengembalikan data dengan kontrak yang sama, komponen, validasi, dan error handling tetap bekerja tanpa perubahan satu baris pun.

**Kenapa adapter service?** Backend dapat berubah tanpa ada notifikasi. Parse response di service membuat perubahan tersebut terdeteksi di satu tempat, bukan menjadi bug di banyak komponen.

**Kenapa kontrak error harus dijaga?** Halaman memang harus memiliki fallback, tetapi mutasi yang gagal perlu erreurs yang bisa dipetakan ke `AppError`. Mock dashboard, roles, notifications, dan settings memakai fallback; user service memakai `AppError` untuk konflik, validasi, dan resource yang tidak ditemukan. Jangan menjadikan service satu pola tanpa alasan—pertahankan semantik yang sudah digunakan feature.

---

## 2. Peta Titik Integrasi

| Fitur | File service aktual | Kontrak return | Aksi terkait |
|---|---|---|---|
| User (list/CRUD) | `src/features/user/service.ts` | `UserListResult`, `User`, atau `void` | `src/features/user/actions.ts` |
| Roles | `src/features/roles/service.ts` | `RolesListResult` | Read-only |
| Dashboard | `src/features/dashboard/service.ts` | `DashboardStats` | — |
| Notifications | `src/features/notification/service.ts` | `Notification[]` dan state read localStorage | — |
| Login page/auth | `src/features/auth/service.ts` | `LoginPageConfig`, hasil reset, atau `void` | `src/features/auth/actions.ts` |
| Session/RBAC | `src/lib/rbac.ts` | `SessionUser` atau throw `AppError` | Semua action mutasi |
| Rate limit | `src/lib/rate-limit.ts` | void atau throw `AppError("RATE_LIMITED")` | Action auth/mutasi |
| Appearance | `src/features/settings/service.ts` | localStorage yang sudah tervalidasi | — |

**File yang tidak perlu disentuh hanya untuk mengganti sumber data:**

- `src/app/**`
- `src/components/**`
- `src/features/*/components/**`
- `src/features/*/schema.ts` dan `features/*/types.ts`
- `src/lib/error.ts`
- `src/lib/api.ts`
- `src/lib/search-params.ts`

Perhatikan: folder role pada checkout ini adalah `features/roles` (plural), bukan `features/role`. Gunakan path aktual saat mengganti service.

Tidak ditemukan marker `TODO(backend-plug)` di `src/` pada audit F5. Jika kamu menambah marker baru, daemonkan di tabel ini.

---

## 3. Kontrak Wajib yang Harus Dipertahankan

### 3.1 — Validasi keluar-masuk service

Schema Zod harus berada di batas server. Untuk list user, `UserListResult` saat ini adalah interface TypeScript. Jika backend mengembalikan JSON, tambahkan runtime schema terlebih dahulu, misalnya:

```typescript
const userListResultSchema = z.object({
  data: z.array(userSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalPages: z.number().int().positive(),
});
```

Lalu parse response di service:

```typescript
const raw: unknown = await response.json();
const parsed = userListResultSchema.safeParse(raw);

if (!parsed.success) {
  logger.error("user.list.api_invalid", parsed.error);
  throw new AppError("INTERNAL_ERROR", {
    message: "user.api: response tidak sesuai schema",
  });
}

return parsed.data;
```

Jangan mengembalikan `unknown` atau response mentah ke komponen.

### 3.2 — Error taxonomy

Hanya ada tujuh kode yang dijamin di `src/lib/error.ts`:

`VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, dan `INTERNAL_ERROR`.

Petakan status/error backend ke taxonomy ini. Jangan membuat error code baru atau meneruskan format backend mentah ke UI. Lihat `docs/ERROR-HANDLING.md`.

### 3.3 — Pesan client

`AppError.userMessage` adalah pesan generik yang aman untuk UI. `message` internal hanya untuk log server dan jangan dikirim ke client.

Jika memakai server action, pertahankan envelope:

```text
{ success: true }
{ success: false, error: { code, message, fieldErrors? } }
```

`message` client harus berasal dari pesan generik taxonomy atau pesan validasi field yang memang aman. Jangan mengirim `error.message`, stack trace, query, atau response backend mentah.

### 3.4 — Auth check di setiap action

Middleware bukan satu-satunya penjaga. Setiap action mutasi tetap memanggil `requireSession()` dan `requireRole()` sesuai batas sensitivitasnya. Jangan mengandalkan redirect UI atau halaman saja.

---

## 4. Contoh Konversi Lengkap — User Service (mock → REST API)

**Sebelum (mock):**

```typescript
export async function getUsers(query: UserQuery): Promise<UserListResult> {
  // filter, sort, paginate array mock
}
```

**Sesudah (REST API):**

```typescript
import { z } from "zod";

import { userSchema } from "@/features/user/schema";
import { AppError } from "@/lib/error";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";

const userListResultSchema = z.object({
  data: z.array(userSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalPages: z.number().int().positive(),
});

function toApiError(response: Response): AppError {
  const statusMap: Record<number, AppError["code"]> = {
    400: "VALIDATION_ERROR",
    401: "UNAUTHENTICATED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    409: "CONFLICT",
    429: "RATE_LIMITED",
  };

  return new AppError(statusMap[response.status] ?? "INTERNAL_ERROR", {
    message: `user.api: ${response.status} ${response.statusText}`,
  });
}

export async function getUsers(query: UserQuery): Promise<UserListResult> {
  try {
    const search = new URLSearchParams({
      q: query.q,
      page: String(query.page),
      pageSize: String(query.pageSize),
      sort: query.sort,
      dir: query.dir,
      ...(query.role ? { role: query.role } : {}),
    });

    const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/users?${search}`, {
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });

    if (!response.ok) throw toApiError(response);

    const raw: unknown = await response.json();
    const parsed = userListResultSchema.safeParse(raw);

    if (!parsed.success) {
      logger.error("user.list.api_invalid", parsed.error);
      throw new AppError("INTERNAL_ERROR", {
        message: "user.api: response tidak sesuai schema",
      });
    }

    return parsed.data;
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error("user.list.network", error);
    throw new AppError("INTERNAL_ERROR", { cause: error });
  }
}
```

Tambahkan `NEXT_PUBLIC_API_URL` ke `src/lib/env.ts` dan `.env.example` hanya jika nilainya memang aman untuk browser. Untuk token/cookie rahasia, gunakan URL server-only atau session cookie, bukan header secret di client.

**Yang tidak berubah:** `UserTable`, toolbar, pagination, dan `users/page.tsx` tetap bekerja selama `UserListResult` tidak berubah.

**Catatan arsitektur:** untuk API yang membutuhkan cookie session, fetch dari server component, server action, atau route handler server. Jangan memanggil API ber-auth dari client component.

---

## 5. Menghubungkan Session, RBAC, dan Rate Limit

### `src/lib/rbac.ts`

Ganti placeholder `requireSession()` dengan session provider asli:

```typescript
export async function requireSession(): Promise<SessionUser> {
  const session = await getMySession();

  if (!session) {
    throw new AppError("UNAUTHENTICATED");
  }

  return {
    id: session.userId,
    role: mapRole(session.role),
  };
}
```

`SessionUser["role"]` saat ini adalah `"admin" | "editor" | "viewer"`. Jika backend memakai nama lain, petakan di `lib/rbac.ts`; jangan hanya mengubah union tanpa menyinkronkan `userRoleSchema`, role definitions, dan form options.

### `src/lib/rate-limit.ts`

Implementasi sekarang bersifat in-memory dan hanya cocok untuk satu proses. Untuk multi-instance, ganti implementasi `enforceRateLimit()` dengan Redis/Upstash atau provider lain. Pertahankan kontrak: fungsi melempar `AppError("RATE_LIMITED")` ketika limit terlampaui.

### Feature auth

`src/features/auth/service.ts` masih memiliki placeholder untuk register dan reset password. Ganti operasi tersebut dengan provider auth/database, tetap validasi input di `src/features/auth/schema.ts`, dan jangan mengembalikan detail provider ke client.

---

## 6. Checklist Recycle (≤ 30 menit)

### Fase A — Identitas (5 menit)

- [ ] Ganti nama dan deskripsi di `src/config/site.ts`.
- [ ] Ganti landing di `src/config/public-pages.ts`.
- [ ] Ganti konten login di `src/config/login-page.ts`.
- [ ] Ganti favicon di `src/app/favicon.ico`.
- [ ] Opsional: ubah preset brand di `src/config/appearance.ts`.

### Fase B — Navigasi dan fitur (5 menit)

- [ ] Sesuaikan `sidebarNav` di `src/config/site.ts`.
- [ ] Pastikan command menu mengikuti navigasi sidebar.
- [ ] Sesuaikan metadata KPI di `src/config/dashboard.ts`.
- [ ] Sesuaikan permission catalog di `src/config/roles.ts`.

### Fase C — Backend (15 menit)

- [ ] Tambahkan URL/API env yang diperlukan ke `src/lib/env.ts` dan `.env.example`.
- [ ] Ganti service yang dibutuhkan; service yang belum diganti tetap boleh memakai mock.
- [ ] Sambungkan session asli di `src/lib/rbac.ts`.
- [ ] Ganti `src/lib/rate-limit.ts` jika deployment multi-instance.
- [ ] Validasi setiap response eksternal dengan schema Zod.

### Fase D — Finalisasi (5 menit)

- [ ] Hapus route/feature yang tidak dipakai, lalu hapus juga nav dan import-nya.
- [ ] Update `README.md` dan dokumentasi environment project baru.
- [ ] Jalankan `npm run lint && npm run build`.
- [ ] Tes login/session → dashboard → satu operasi CRUD.
- [ ] Audit sisa mock dan marker integrasi:

```bash
grep -rn "TODO(backend-plug)" src/ || true
grep -rn "MOCK_\|mock" src/features/*/service.ts
```

---

## 7. Skenario Umum

### Backend bukan REST, melainkan GraphQL atau gRPC

Kontrak return tidak berubah. Ubah mekanisme fetch atau client di service, tetap parse hasilnya dengan schema Zod, dan tetap petakan error ke `AppError`.

### Ingin memakai client-side data fetching

Boleh, tetapi validasi response tetap memakai schema yang sama, error tetap melalui taxonomy, dan server authorization tetap menjadi sumber kebenaran. Hapus server pagination hanya dalam commit terpisah agar mudah direview.

### Tidak membutuhkan sebuah fitur

Hapus `features/<fitur>/`, route terkait, nav, dan import. Karena alur utama page → service → schema satu arah, verify dengan `npm run build`.

### Role dan permission berbeda

1. Petakan role backend di `src/lib/rbac.ts`.
2. Sinkronkan `userRoleSchema` di `src/features/user/schema.ts`.
3. Sinkronkan `src/features/roles/schema.ts`, `src/config/roles.ts`, serta pilihan form.
4. Uji `requireRole()` pada setiap mutasi sensitif.

---

## 8. Jangan Lakukan Ini

- Jangan menghapus validasi Zod di action supaya lebih cepat; client bukan penjaga tunggal.
- Jangan meneruskan `error.message`, stack trace, query, atau response backend mentah ke client.
- Jangan merender data API tanpa `safeParse`.
- Jangan menyimpan secret atau token di `NEXT_PUBLIC_*`; nilai tersebut dapat masuk browser bundle.
- Jangan memanggil API ber-auth dari client component jika bisa dipanggil dari server.
- Jangan menganggap UI redirect atau menu tersembunyi sebagai authorization.
- Jangan mengganti taxonomy error dengan string error baru di feature.

---

## 9. Referensi Silang

| Topik | Dokumen |
|---|---|
| Arsitektur dan alur data | `docs/ARCHITECTURE.md` |
| Error handling RFC 9457 | `docs/ERROR-HANDLING.md` |
| Keamanan OWASP | `docs/SECURITY.md` |
| Konvensi kode | `docs/CONVENSIONS.md` |
| Performance budget | `docs/PERFORMANCE.md` |
| Setup dan environment | `docs/SETUP.md` |
