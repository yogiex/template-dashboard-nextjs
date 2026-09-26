# 09 — Testing

## Status Saat Ini: Vitest + Testing Library (dalam proses_setup)

Verifikasi terhadap `package.json` dan `vitest.config.ts` (2026-09-25). **Status ini bergerak** — cek ulang sebelum menulis laporan:

```bash
npm test               # runner: vitest run
find src -name "*.test.ts*"
```

Fakta yang stabil:

- Script: `test` (`vitest run`), `test:watch`, `test:coverage`. **Belum ada** script `typecheck` — pakai `npx tsc --noEmit`.
- `vitest.config.ts`: `environment: "jsdom"`, `globals: true`, `setupFiles: ["./src/test/setup.ts"]`, `include: ["src/**/*.test.{ts,tsx}"]`, alias `@` → `src`, stub `server-only` → `src/test/server-only-stub.ts`, coverage v8 ke `./coverage`.
- Test yang ada saat ini hanya unit test untuk util murni di `src/lib/` (`color`, `error`, `parse-breadcrumb`, `password-strength`, `redact`, `search-params`). Belum ada test untuk service, action, atau komponen.
- `.github/workflows/ci.yml` **belum punya langkah test** — hanya lint, typecheck, build. Kalau menambah cakupan test berarti workflow itu ikut harus diperbarui (dan itu perubahan yang perlu dikonfirmasi user).

Konsekuensi yang harus diterima:

- **Jalankan `npm test` sebelum mengklaim apa pun soal test.** Kalau keluar `No test files found` (code 1) berarti belum ada test — laporkan apa adanya, jangan menulis "test lulus".
- File test harus berada di `src/**/*.test.ts(x)` agar terbaca `include`.
- Modul yang meng-`import "server-only"` aman di test berkat stub di `vitest.config.ts`; jangan membuat workaround lain.
- Gulung balik bila config rusak: hapus `vitest.config.ts` + `src/test/` dan script `test*` di `package.json` sekaligus.

### Verifikasi yang WAJIB dijalankan sebelum menyatakan selesai

```bash
npm run lint          # eslint (script resmi)
npx tsc --noEmit      # typecheck (script TIDAK ada, pakai npx)
npm test              # vitest run — hanya bila kamu menyentuh kode yang punya test
npm run build         # build produksi
```

Semuanya wajib hijau. Kalau salah satu gagal, laporkan kegagalannya — jangan merapikan report, jangan menurunkan threshold, jangan menghapus test yang gagal.

## Strategi Kedepan (REKOMENDASI — BELUM DITERAPKAN)

Bagian ini **rekomendasi**, bukan deskripsi kondisi repo. Jangan menulis di laporan bahwa tool ini sudah terpasang.

Tool yang disarankan, berikut alasannya:

| Tool | Peran | Alasan |
| --- | --- | --- |
| `vitest` | Unit + integration test, runner utama | Cepat, kompatibel dengan Vite yang sudah dipakai Next.js, `vi.mock()` mudah untuk `server-only` — **sudah terpasang** |
| `@vitest/coverage-v8` | Coverage | Native, tanpa instrumentasi tambahan — **sudah terpasang** |
| `@testing-library/react` + `@testing-library/user-event` | Test komponen | Menguji perilaku yang dilihat user, bukan implementasi internal — **sudah terpasang** |
| `@playwright/test` | E2E | Satu-satunya cara memverifikasi guard `(dashboard)`, Server Action, dan form multi-langkah end-to-end — **belum terpasang** |
| `msw` | Mock network | Memisahkan test dari bentuk respons eksternal — **belum terpasang** |

### Konsekuensi dari konfigurasi yang sudah ada

- `environment: "jsdom"` sudah global, jadi test util murni tidak perlu override; kalau butuh `node`, pakai `// @vitest-environment node` per-file.
- Alias `@/*` sudah dicocokkan dengan `tsconfig.json` oleh `vite-tsconfig-paths` + alias eksplisit.
- Script yang masih belum ada dan berguna: `"typecheck"`, `"test:e2e"` (perlu Playwright).


## Piramida Test

Repo ini **bukan** aplikasi dengan logika bisnis berat; yang paling berisiko adalah akses data dan boundary keamanan. Maka bentuk piramidanya tidak bisa memakai default:

```
            /\   E2E (Playwright)      ~5   alur kritis saja:
           /  \  login, guard, aksi     
          /----\ admin, IDOR            
         / Unit \ + Integration  ~40    service, schema, RBAC, rate limit,
        /--------\ rate limit, audit   validasi, error mapping
       /   Fast   \                    formatter, redactor, parser
      /____________\            
```

- **Tidak perlu** snapshot test berlebihan. Snapshot pada komponen besar menghasilkan diff besar, cepat basi, dan nilainya rendah.
- **Prioritaskan test negatif** (401/403/404/IDOR) daripada test positif. Bagian yang paling jarang gagal justru bagian negatif.

## Checklist Wajib per Fitur

Setiap fitur baru **wajib** punya test untuk Minimal cases berikut — bukan hanya happy path. Centang yang tidak berlaku dengan alasan tertulis di PR.

- [ ] **Happy path** — input valid menghasilkan output/state yang diharapkan.
- [ ] **Invalid input** — input di luar schema ditolak dengan `fieldErrors` yang benar per field.
- [ ] **401 Unauthorized** — tanpa session, Server Action / Route Handler / route privat menolak.
- [ ] **403 Forbidden** — session ada tetapi role/permission kurang (default deny).
- [ ] **404 Not Found** — resource ID yang tidak ada, dan ID dengan format tidak valid dibedakan perilakunya.
- [ ] **IDOR / cross-tenant** — user A **tidak bisa** baca/ubah/hapus resource milik user B meski sudah terautentikasi. Ini test yang paling sering terlewat.
- [ ] **Rate limit** — request ke-N+1 pada endpoint sensitif ditolak dengan `AppError` yang benar.
- [ ] **Conflict** — pelanggaran unique constraint (mis. email duplikat) menghasilkan code `CONFLICT`, bukan `500`.

Tambahan sesuai konteks:

- [ ] Tidak ada data sensitif di payload error yang dikembalikan ke client.
- [ ] `logger` tidak menulis password/token/session id pada alur gagal.
- [ ] Side effect (audit event, metric) tercatat pada success **dan** failure.

## Contoh: Test Service

Pola yang mengikuti `src/features/user/service.ts` — service melempar `AppError` dengan kode, jadi test cukup memeriksa kode error, bukan pesan string.

```ts
import { beforeEach, describe, expect, it } from "vitest";

import {
  createUser,
  deleteUser,
  getUserById,
} from "@/features/user/service";
import { AppError } from "@/lib/error";

async function expectAppError(
  run: () => Promise<unknown>,
  code: string,
): Promise<void> {
  await expect(run()).rejects.toBeInstanceOf(AppError);
  await run().catch((error: unknown) => {
    expect((error as AppError).code).toBe(code);
  });
}

describe("user service", () => {
  beforeEach(() => {
    // service saat ini menyimpan state di module scope (mock in-memory).
    // Saat backend nyata terpasang, ganti dengan reset database per test.
  });

  it("membuat user dari input valid", async () => {
    const user = await createUser({
      name: "Budi Santoso",
      email: "Budi@Acme.co",
      role: "editor",
      status: "active",
    });

    expect(user.id).toMatch(/^usr_/);
    expect(user.email).toBe("budi@acme.co"); // dinormalisasi lowercase
  });

  it("menolak email duplikat dengan CONFLICT", async () => {
    await createUser({
      name: "A",
      email: "kembar@acme.co",
      role: "viewer",
      status: "active",
    });

    await expectAppError(
      () =>
        createUser({
          name: "B",
          email: "kembar@acme.co",
          role: "viewer",
          status: "active",
        }),
      "CONFLICT",
    );
  });

  it("menolak input yang gagal validasi dengan VALIDATION_ERROR", async () => {
    await expectAppError(
      () => createUser({ name: "", email: "bukan-email" }),
      "VALIDATION_ERROR",
    );
  });

  it("mengembalikan NOT_FOUND untuk id yang tidak ada", async () => {
    await expectAppError(() => getUserById("usr_99999"), "NOT_FOUND");
  });

  it("menolak id dengan format tidak valid", async () => {
    await expectAppError(() => deleteUser({ id: "../../etc/passwd" }), "VALIDATION_ERROR");
  });
});
```

## Contoh: Test IDOR / Cross-Tenant

Authorization ada dua lapis: `requireSession()` lalu verifikasi kepemilikan. Yang wajib diuji adalah lapis kedua.

```ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/rbac", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/rbac")>();
  return {
    ...actual,
    // Sesi user B, sedangkan resource dimiliki user A.
    requireSession: vi.fn(async () => ({ id: "usr_B", role: "admin" })),
  };
});

describe("IDOR pada resource milik user lain", () => {
  it("menolak update resource yang bukan milik session", async () => {
    // service nyata harus membandingkan session.id dengan resource.ownerId
    // sebelum menulis. Kovensinya: tolak meski role admin.
    await expect(
      updateUserAsSession({ id: "usr_A", name: "Diubah" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("menolak delete resource milik tenant lain", async () => {
    await expect(
      deleteResourceAsSession({ id: "res_tenant_lain" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("tidak membocorkan keberadaan resource (404, bukan 403)", async () => {
    // Untuk resource milik user lain, balas NOT_FOUND supaya penyerang
    // tidak bisa memetakan ID yang ada.
    await expect(
      getResourceAsSession({ id: "usr_A" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
```

> Catatan: contoh di atas memakai fungsi helper yang **belum ada** di repo.-second, saat backend terpasang, implementasi nyata harus memanggil `service.ts` yang sudah melakukan pengecekan kepemilikan. Yang dicatat di sini adalah *apa yang harus diuji*, bukan kode yang bisa langsung dijalankan.

## Checklist Sebelum Merge (setelah test tooling ada)

- [ ] Happy path + seluruh kasus negatif di checklist di atas ter-cover.
- [ ] Tidak ada `expect` yang hanya mengulang implementasi (snapshot of internal state).
- [ ] Test tidak bergantung pada urutan eksekusi (`randomize`, atau reset state per test).
- [ ] Tidak ada secret, token, atau data mock yang menyerupai kredensial produksi di fixture.
- [ ] Fixture `demo@example.com` / `password123` hanya untuk demo lokal, tidak di-commit ke test yang akan berjalan di CI publik.
- [ ] `npm run lint` + `npx tsc --noEmit` + `npm run build` tetap hijau.

## Jangan

- ❌ `npm test` — script-nya tidak ada. Menjalankannya = klaim palsu.
- ❌ "Semua test lulus" sebagai bukti keamanan — tanpa test runner, bukti yang ada hanya lint + typecheck + build.
- ❌ Test hanya happy path — bug yang ditemukan user hampir selalu jalur negatif.
- ❌ Mock `@/lib/rbac` sehingga `requireSession()` selalu `admin`, lalu menyimpulkan otorisasi aman.
- ❌ Snapshot test untuk komponen besar — diff besar, nilai rendah, mudah stale.
- ❌ `await new Promise(r => setTimeout(r, ...))` untuk menunggu — gunakan `waitFor`.
- ❌ Test yang bergantung pada `localStorage`/timezone/urutan locale tanpa reset eksplisit.
- ❌ Menambah dependency test tanpa persetujuan eksplisit user (lihat `11-workflows.md` § Menambah Dependency).
- ❌ Menyesuaikan threshold coverage ke bawah agar CI hijau.
