# 06 — Security

> Rules ini berlaku untuk AI agent yang mengerjakan task di repo ini.
> Semua klaim diverifikasi terhadap working tree. Status kontrol yang **benar-benar
> ada** ada di `docs/SECURITY-CHECKLIST.md` (163 item); persyaratan ada di
> `docs/SECURITY.md`; register threat ada di `docs/THREAT-MODEL.md`; prosedur
> insiden ada di `docs/INCIDENT-RESPONSE.md`.
> Kalau antara dokumen dan kode berbeda, **kode yang menang** — dan perbarui dokumennya.

## 0. Kondisi Repo yang Harus Diketahui Dulu

Aplikasi ini **frontend-only**. Yang benar-benar ada:

| Kontrol | Status | Bukti |
| --- | --- | --- |
| Security headers + CSP statis | ✅ ada | `next.config.ts` |
| Rate limiter in-memory (sliding window) | ✅ ada | `src/lib/rate-limit.ts` |
| Logger pino + redactor PII/secret | ✅ ada | `src/lib/logger.ts`, `src/lib/redact.ts` |
| `AppError` taxonomy + problem+json | ✅ ada | `src/lib/error.ts`, `src/lib/api.ts` |
| Env validator typed (Zod) | 🟡 sangat kecil | `src/lib/env.ts` hanya `NODE_ENV` + `NEXT_PUBLIC_APP_URL` |
| RBAC helper | 🟡 parsial | `src/lib/rbac.ts`: `requireSession()` mengembalikan `{ id: "usr_placeholder", role: "admin" }` |
| Audit log writer (`logAudit`) | 🟡 parsial | `src/features/audit/lib/log-audit.ts` + store berantai hash, tapi **dipakai terbatas** |
| `proxy.ts` / `middleware.ts` | ❌ **tidak ada sama sekali** | tidak ada file di root repo |
| Session / cookie session | ❌ tidak ada | satu-satunya cookie `mfa_pending` (`src/features/auth/mfa-session.ts`) |
| Database | ❌ tidak ada | semua service pakai `Map`/array in-memory |
| Route Handler | ❌ tidak ada | tidak ada `route.ts` di repo |
| Alerting | ❌ tidak ada | deteksi UEBA hanya dievaluasi in-process |

Konsekuensi untuk agent: jangan menulis komentar seperti "sesi sudah tervalidasi"
atau "database dicek ownership". Keduanya belum ada. Pola integrasi backend ada di
`docs/INTEGRATION.md`, dan jangan mengarang API, tabel, atau env var.

## 1. Threat Model Ringkas

Metodologi: STRIDE per aset, trust boundary nyata. Versi penuh di
`docs/THREAT-MODEL.md` (draft, review per sprint). Aset dan boundary yang relevan
untuk perubahan harian:

```
[Browser] --form/params/cookie--> [Next.js Server Action / RSC]
                                     |--> [store in-memory]  (audit, metrik, ueba, users, auth)
                                     |--> [log pino (stdout)]
[nginx] --X-Forwarded-For--> [Next.js]
[process.env] --> [Next.js]
```

| ID | Boundary | Yang melintas | Kepercayaan |
| --- | --- | --- | --- |
| TB1 | Browser → Next (Server Action/RSC) | form body, `params`, `searchParams`, cookie | **Tidak dipercaya** |
| TB2 | Next → store in-memory | objek JS | Terpercaya (server) |
| TB3 | Next → log | string terstruktur | Terpercaya (redactor aktif) |
| TB4 | Proxy → aplikasi | `X-Forwarded-For`, `X-Real-IP` | Sebagian dipercaya |
| TB6 | Env → proses | `process.env` | Terpercaya penuh, hanya 2 var divalidasi |

Threat paling relevan untuk fitur baru (lihat `THREAT-001`, `THREAT-002`):

- **THREAT-001** akses dashboard tanpa autentikasi — likelihood 5, kontrol guard masih todo.
- **THREAT-002** otorisasi hanya di sebagian boundary — helper ada, pemanggil sedikit.

## 2. Trust Boundary

Boundary yang wajib dijaga di setiap perubahan:

1. **Server Action / Route Handler** — tempat semua input eksternal masuk. Validasi,
   auth, authz, rate limit, dan audit terjadi **sebelum** memanggil service.
2. **`service.ts`** — satu-satunya pintu data. `import "server-only"` sudah menjadi
   konvensi di service yang ada (`src/features/user/service.ts`, `src/features/auth/service.ts`).
3. **Client Component** — hanya menerima data serializable, tidak pernah menentukan akses.

Aturan: **proxy/middleware bukan security boundary.** Ia hanya guard awal (redirect).
Dasarnya: `requireSession()` + `requireRole()` harus dipanggil ulang di
setiap action/service. Kalau `requireSession()` masih placeholder, kontrol apa pun yang
bergantung padanya tidak boleh dianggap kontrol nyata.

## 3. Validasi Input (Zod di Server)

- Semua boundary eksternal divalidasi dengan Zod **di server**: `FormData`/body,
  `params`, `searchParams`, cookie, dan hasil `fetch` eksternal.
- Pola di repo ini: action menerima `input: unknown`, langsung `schema.safeParse(input)`.

```ts
// src/features/*/actions.ts
import { z } from "zod";

const loginFormSchema = z.object({
  email: z.string().min(1).email().max(254),
  password: z.string().min(8).max(72),
  rememberMe: z.boolean().default(false),
});

export async function someAction(input: unknown): Promise<ActionState> {
  const result = loginFormSchema.safeParse(input);

  if (!result.success) {
    const fieldErrors = result.error.issues.reduce<FieldErrors>(
      (errors, issue) => {
        const field = issue.path[0];
        if (typeof field === "string") {
          errors[field] = [...(errors[field] ?? []), issue.message];
        }
        return errors;
      },
      {},
    );
    return { success: false, error: { code: "VALIDATION_ERROR", fieldErrors } };
  }

  const data = result.data; // tipe sudah narrowed oleh Zod, bukan `any`
  // …bisnis…
}
```

- `params`/`searchParams` adalah **Promise** di App Router modern; parse setelah `await`:

```ts
const search = auditQuerySchema.safeParse(await searchParams);
```

- Batasi panjang, format, enum, dan nilai yang diizinkan di dalam schema
  (lihat `src/features/audit/schema.ts` dan `src/features/auth/schema.ts`).
- Validasi client (`zodResolver` + react-hook-form) hanya untuk feedback cepat; tidak
  menggantikan validasi server.
- Jangan pernah memakai `dangerouslySetInnerHTML`.
- Jangan memakai input user untuk membentuk URL, redirect, atau nama file tanpa allowlist.

## 4. Auth & Authz per Action dan Service

Helper yang tersedia (`src/lib/rbac.ts`):

```ts
import { requireRole, requireSession } from "@/lib/rbac";

export async function createUserAction(input: unknown) {
  const session = await requireSession();
  requireRole(session, "admin");
  enforceRateLimit("global", "create-user");
  // …service
}
```

Aturan:

- `requireSession()` + `requireRole()` dipanggil **di dalam** setiap action yang
  memutasikan atau membaca data sensitif. Contoh yang benar sudah ada di
  `src/features/user/actions.ts` dan `src/features/roles/actions.ts`.
- Default deny. Role ada di `ROLE_HIERARCHY`: `viewer < editor < admin`
  (`src/lib/rbac.ts`). Permission catalog ada di `src/config/roles.ts`
  (`PERMISSION_CATALOG`, `isValidPermissionId`).
- `role/` dan `roles/` **belum dikonsolidasikan** — jangan menambah fitur role/permission
  baru sebelum duplikasi itu diputuskan.
- Halaman yang membaca data sensitif wajib punya pemeriksaan role di server, bukan
  hanya `noindex`/UI. Saat ini `/users`, `/settings/ueba`, `/settings/observability`
  belum punya guard (lihat `AUTHZ-08` di checklist).
- **TODO/rencana** (lihat `docs/INTEGRATION.md`): pasang `proxy.ts` sebagai guard awal,
  ganti `requireSession()` dengan session provider nyata, dan jadikan default-deny.
  Jangan menulis kode seolah session sudah ada.

## 5. Ownership Check / IDOR

- Verifikasi **kepemilikan resource**, bukan hanya authentication. Role check saja
  tidak mencegah user A membaca/mengubah data user B.
- Di service, cek kepemilikan sebelum mengembalikan atau memutasi baris:

```ts
// src/features/<fitur>/service.ts
import "server-only";

import { AppError } from "@/lib/error";

function requireOwnership(sessionUserId: string, ownerId: string): void {
  if (sessionUserId !== ownerId) {
    // 404 lebih aman daripada 403 untuk resource milik orang lain.
    throw new AppError("NOT_FOUND");
  }
}
```

- Status saat ini: **belum ada** ownership check (`AUTHZ-07` ❌). Jangan tulis di
  dokumentasi/komentar bahwa `getUserById` sudah aman.
- Uji negatif: akses route privat, action, dan resource milik user lain harus ditolak.

## 6. Rate Limit

`src/lib/rate-limit.ts` menyediakan sliding window counter in-memory:

```ts
enforceRateLimit(identifier, purpose, options?)  // lempar AppError("RATE_LIMITED")
getRateLimitState(identifier, purpose, options?)  // baca status, tanpa mencatat
resetRateLimit(identifier, purpose, options?)      // testing/ops
```

- Default: 5 percobaan / 60 detik per identifier per purpose.
- `purpose` **wajib** spesifik per operasi; key bucket sudah memasukkan purpose,
  window, dan max (`bucketKey`).
- Pola yang sudah dipakai di repo: limit per identitas **dan** limit global.
  Contoh `src/features/auth/actions.ts`:

```ts
enforceRateLimit(requestContext.ipHash, "login-ip", MFA_RATE_LIMIT);
enforceRateLimit(String(result.data.email), "login", MFA_RATE_LIMIT);

enforceRateLimit("global", "register");
enforceRateLimit("global", "create-user");
```

- Jangan bocorkan angka threshold ke user; `AppError` sudah memakai pesan generik.
- Batasi pemanggil: **TODO** — store in-memory hilang saat restart dan tidak berlaku
  lintas instance. Batas/retrofit (Redis, lockout akun `AUTH-08`) ada di
  `docs/INTEGRATION.md`.
- Setiap hit rate limit pada jalur sensitif sebaiknya dicatat sebagai audit
  `category: "security"` (pola `auditRateLimitHit()` di `src/features/auth/actions.ts`).

## 7. Audit Event

Pintu tunggal: `logAudit()` di `src/features/audit/lib/log-audit.ts`.

```ts
import { logAudit } from "@/features/audit/lib/log-audit";

void logAudit({
  action: "user.update",
  category: "authz",
  severity: "warning",
  result: "success",
  source: "user-actions",
  actor: { id: session.id, role: session.role },
  resource: { type: "user", id: data.id },
});
```

- Kategori yang valid (`AUDIT_CATEGORIES` di `src/features/audit/schema.ts`):
  `auth`, `authz`, `data`, `config`, `security`, `log`.
  Severity: `info | warning | critical`. Result: `success | failure | error`.
- Sifat `logAudit`: tidak pernah melempar exception, selalu validasi input, selalu
  memaksa redaksi metadata, selalu entry berantai hash. Jangan bungkus dengan
  `try/catch` yang swallowing diam-diam, dan jangan menganggap return `null` berarti gagal.
- Entry yang wajib dicatat: login sukses/gagal, verifikasi MFA, rate limit hit,
  perubahan role/permission, mutasi data user, perubahan config, penghapusan log.
- Status: `logAudit` sudah terpakai di `src/features/auth/actions.ts`,
  `src/features/roles/actions.ts`, dan `src/features/log-management/**`, tetapi belum
  di semua boundary. Audit log juga **belum persisten** dan belum punya halaman viewer
  (lihat `docs/THREAT-MODEL.md` THREAT-001 & `docs/INCIDENT-RESPONSE.md` §1.3).
- `verifyAuditIntegrity()` ada di `src/features/audit/service.ts` untuk Cek rantai hash.

## 8. Secret Handling

- Secret hanya di `.env.local` lokal atau secret manager deployment. **Jangan commit `.env*`.**
- `.env.example` hanya berisi nama variabel dan contoh non-secret.
- Semua var yang sampai browser wajib berawalan `NEXT_PUBLIC_` dan dianggap publik.
- Akses env lewat validator typed di `src/lib/env.ts`:

```ts
import { env } from "@/lib/env";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url(),      // TODO: hanya saat backend benar-benar ada
});
const appEnv = parseEnv(serverEnvSchema, process.env);
```

- `env.NEXT_PUBLIC_APP_URL` dipakai sebagai **salt** hashing di `src/lib/redact.ts`;
  jagalah nilainya tidak berubah-ubah kalau konsistensi hash IP/email dibutuhkan.
- Kredensial demo (`demo@example.com` / `password123`) hanya untuk demo; **jangan dipakai ulang**
  di kode baru.
- Secret yang pernah bocor (log, screenshot, issue) harus dirotasi dan token/session lama di-invalidate.

## 9. No PII di Log

Jangan pernah log password, token, cookie, session ID, kode OTP, backup code, atau
body mentah. Konvensi repo:

```ts
import { logger } from "@/lib/logger";

logger.warn("auth.login_failed", { reason: "INVALID_CREDENTIALS" });
// `reason` hanya berisi ErrorCode — tidak pernah nilai rahasia.

logger.error("request.failed", error, { code, traceId });
```

- Semua context dilewatkan `redactTags()` dari `src/lib/redact.ts` (otomatis di
  wrapper `logger`), sehingga: key sensitif **dibuang**, IP **di-hash** (sha256 truncated
  + salt), email **dimask**, user-agent **dipotong 120 char**, nilai lain dipotong 200 char.
- Untuk konteks request aman gunakan `getRequestContext()` / `getSafeRequestContext()`
  (`src/lib/request-context.ts`) yang hanya menyimpan `ipHash` dan user-agent terpotong.
- Jangan kirim `err` mentah ke client; `problemResponse()` (`src/lib/api.ts`) sudah
  mengembalikan `application/problem+json` generik + `X-Trace-Id` tanpa stack trace.

## 10. Header Keamanan

Semua header di `next.config.ts`, berlaku untuk `/(.*)`:

| Header | Nilai |
| --- | --- |
| `X-DNS-Prefetch-Control` | `on` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `X-Permitted-Cross-Domain-Policies` | `none` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `Cross-Origin-Resource-Policy` | `same-origin` |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `Content-Security-Policy` | CSP statis, `default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`, `script-src/style-src 'unsafe-inline'`, `upgrade-insecure-requests` (prod) |

Plus: `poweredByHeader: false`, `productionBrowserSourceMaps: false`, `output: "standalone"`.

Catatan penting:

- CSP memakai `'unsafe-inline'`, **bukan nonce**, demi menjaga static generation
  landing page. Hanya `'unsafe-eval'` yang dev-only.
- **TODO/rencana**: ganti ke pola nonce di `proxy.ts` setelah static generation tidak
  jadi prioritas (lihat komentar di `next.config.ts` dan `docs/INTEGRATION.md`).
- Jangan menambah header tanpa alasan tertulis; jangan mengurangi yang ada.
- Header bersifat global, jadi perubahan di sini memengaruhi semua route.

## 11. Merge Gate Checklist

Checklist penuh: `docs/SECURITY.md` §"Checklist Sebelum Merge" (14 item). Ringkas:

- [ ] Input eksternal tervalidasi di **server**, bukan hanya client.
- [ ] `requireSession()`/`requireRole()` dipanggil di action/service sensitif baru.
- [ ] Ownership resource diverifikasi (IDOR) — atau gap-nya dicatat eksplisit.
- [ ] Tidak ada secret/PII di source, log, dan response.
- [ ] `enforceRateLimit()` dipasang pada operasi baru yang rawan brute force/abuse.
- [ ] `logAudit()` dipasang untuk mutasi dan kegagalan keamanan.
- [ ] Error production generik; tidak ada stack trace/query/env yang bocor.
- [ ] Header keamanan masih sesuai; tidak ada perubahan(next.config.ts) tanpa catatan.
- [ ] Dependency + `package-lock.json` ditinjau; CI memakai `npm ci`.
- [ ] `npm run lint` dan `npm run build` hijau.

## 12. Tabel "Kalau Ragu"

| Situasi | Jawaban |
| --- | --- |
| "Cukup validasi di client form?" | Tidak. Zod `safeParse` di server action. |
| "Sudah login berarti boleh akses semua?" | Tidak. `requireRole` + ownership check per resource. |
| "Middleware sudah protecting route?" | `proxy.ts` belum ada. Guard hanya di action/service. |
| "Rate limit-nya cukup pakai in-memory?" | Cukup untuk template/dev; production lintas instance butuh store eksternal (`docs/INTEGRATION.md`). |
| "Bisa log body request buat debug?" | Tidak. Pakai `logger` + context yang sudah diredaksi. |
| "Bisa kirim pesan error asli ke user?" | Pakai `AppError` dengan kode yang benar; pesan user generik. |
| "Bisa tambah field env baru?" | Ya, lewat validator Zod di `src/lib/env.ts`, bukan `process.env` telanjang. |
| "Perlu `proxy.ts` baru?" | Sabar dulu; guard di action tetap wajib walau nanti `proxy.ts` ditambahkan. |
| "Ini vulnerability baru, harus lapor?" | Ya, ikuti `docs/INCIDENT-RESPONSE.md` (severity ladder P1–P4). |
| "Semua sudah selesai?" | Cek `docs/SECURITY-CHECKLIST.md` (55 item masih ❌). |

## Referensi

- `docs/SECURITY.md` — persyaratan (OWASP Top 10).
- `docs/SECURITY-CHECKLIST.md` — tracker status per kontrol (✅/🟡/❌).
- `docs/THREAT-MODEL.md` — STRIDE, trust boundary, register threat.
- `docs/INCIDENT-RESPONSE.md` — prosedur dan severity ladder.
- `docs/INTEGRATION.md` — pola integrasi backend/DB/email (untuk semua TODO di atas).
- `docs/ERROR-HANDLING.md` — taksonomi error dan problem+json.
