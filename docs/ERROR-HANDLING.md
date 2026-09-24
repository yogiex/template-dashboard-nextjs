# Standar Penanganan Kesalahan — RFC 9457

Status: Standar proyek
Format transport: Problem Details for HTTP APIs (RFC 9457)

Dokumen ini menetapkan cara aplikasi Next.js 16 memetakan kegagalan menjadi problem detail yang konsisten, mudah dipahami pengguna, dan dapat dikorelasikan dengan log server. Standar ini adalah kontrak teknis, bukan klaim bahwa autentikasi, database, atau layanan observabilitas tertentu sudah tersedia. Integrasi yang disebut sebagai contoh harus diimplementasikan atau diganti sesuai infrastruktur aktual.

## 1. Prinsip

1. **Satu model, banyak transport.** Error yang dapat dipulihkan atau kontrak API direpresentasikan sebagai RFC 9457 Problem Details. Halaman Server Component dan Client Component boleh memiliki presentasi UI sendiri, tetapi harus memakai semantik, kode, dan `traceId` yang sama.
2. **Gagal cepat, validasi di batas.** Input eksternal tidak tepercaya. Validasi dilakukan pada batas Route Handler, Server Action, form, dan setiap service yang dipanggil langsung. Operasi tidak boleh dilanjutkan setelah validasi gagal.
3. **Pesan aman dan spesifik.** `title` stabil dan tidak membocorkan domain. `detail` menjelaskan satu masalah dalam Bahasa Indonesia. Detail teknis, token, query SQL, stack trace, payload, dan pesan penyedia eksternal tidak boleh dikirim ke klien.
4. **Klasifikasi stabil.** Tujuh kode pada bagian 3 adalah satu-satunya klasifikasi yang dikirim lintas lapisan. Exception atau status internal dipetakan ke salah satu kode tersebut; jangan membuat kode ad hoc per layar.
5. **Status HTTP berasal dari kode.** Pemetaan di bagian 3 bersifat wajib. Respons tetap memakai media type `application/problem+json` dan body berupa object Problem Details.
6. **Satu insiden, satu `traceId`.** `traceId` dibuat atau diterima di boundary request, diteruskan ke seluruh operasi async, dicantumkan di Problem Details, dan dipakai sebagai kunci korelasi pada log, trace, dan UI. Jangan membocorkan identifier internal selain `traceId` yang memang diperlukan.
7. **Error dapat di|club dengan aman.** Jangan mengembalikan `stack`, `cause`, atau error object mentah. Error asli hanya dicatat pada log server.
8. **Sisi klien tidak memetakan status sendirian.** Domain, service, adapter, Route Handler, dan Server Action memakai klasifikasi yang sama. UI boleh memetakan `code` ke state visual, tetapi tidak boleh menebak kategori dari teks pesan.
9. **Kegagalan tak terduga menjadi internal.** Jalur yang tidak menangani error akan menghasilkan `INTERNAL_ERROR`, bukan error domain baru.
10. **Idempotensi adalah tanggung jawab pemanggil.** `conflict` atau `rate_limited` dapat memerlukan konfirmasi, backoff, atau penggunaan ulang idempotency key. Standar ini tidak menetapkan perilaku idempotensi pada server.

## 2. Bentuk Problem Details

Problem Details minimum adalah object JSON dengan member berikut:

- `type`: URI referensi dokumentasi atau definisi error. Harus berupa URI absolut dan stabil.
- `title`: ringkasan singkat dan stabil dalam Bahasa Indonesia.
- `status`: kode status HTTP numerik.
- `detail`: penjelasan khusus untuk kegagalan ini dalam Bahasa Indonesia.
- `instance`: URI yang mengidentifikasi request khusus yang gagal. Gunakan request path yang sudah tersedia tanpa memasukkan query string sensitif.
- `traceId`: member extension untuk korelasi dukungan dan log server.

Contoh respons:

```http
HTTP/1.1 409 Conflict
Content-Type: application/problem+json
```

```json
{
  "type": "https://example.com/problems/concurrency-conflict",
  "title": "Konflik konkurensi",
  "status": 409,
  "detail": "Data sudah diubah oleh pengguna lain. Muat ulang data lalu coba lagi.",
  "instance": "/api/projects/proj_123",
  "traceId": "01J2X7YQ8N4K6M3P9R0S2T5V7W"
}
```

Ketentuan:

- Gunakan media type `application/problem+json`, bukan `application/json`, untuk Route Handler yang mengembalikan error.
- `type` harus stabil untuk setiap kode dan tidak berubah hanya karena teks atau status HTTP berubah.
- `title` boleh digunakan sebagai label UI. `detail` boleh ditampilkan pada kondisi yang menerima respons.
- `instance` boleh diomit jika tidak ada URI permintaan yang aman dan relevan.
- Tambahkan extension hanya jika diperlukan. Nama extension harus stabil, tidak boleh membocorkan rahasia, dan tidak boleh mengubah makna member RFC 9457.
- Client harus mengabaikan member tambahan yang tidak dikenal agar tetap kompatibel.

## 3. Taksonomi tujuh kode

Klasifikasi berikut adalah kontrak bersama. Tabel menunjukkan status default; adapter HTTP tidak boleh mengganti status hanya karena pesan tertentu.

| Kode | Status HTTP | Arti | Kondisi contoh | Perilaku UI default |
| --- | ---: | --- | --- | --- |
| `VALIDATION_ERROR` | 400 | Input malformed, schema tidak valid, atau parameter wajib hilang | JSON tidak valid, ID kosong, field wajib tidak diisi | Tampilkan error per field bila metadata tersedia; jangan melakukan mutasi |
| `UNAUTHENTICATED` | 401 | Identitas tidak dapat dibuktikan | Sesi atau kredensial tidak valid/expired | Minta login atau aksi login; sertakan `WWW-Authenticate` bila relevan |
| `FORBIDDEN` | 403 | Identitas diketahui tetapi tidak berwenang | Akses ke sumber atau operasi ditolak | Tampilkan forbidden tanpa membocorkan keberadaan/rahasia sumber |
| `NOT_FOUND` | 404 | Sumber yang diminta tidak ada atau tidak terlihat oleh pemanggil | ID tidak ditemukan atau sumber milik orang lain | Tampilkan state kosong/404; jangan ubah menjadi forbidden |
| `CONFLICT` | 409 | Permintaan bertentangan dengan state saat ini | Optimistic concurrency gagal, state transition tidak valid, duplikasi | Minta muat ulang atau konfirmasi; jangan ulangi otomatis |
| `RATE_LIMITED` | 429 | Terlalu banyak permintaan | Rate limit atau quota sementara | Tunggu dan gunakan backoff; hormati `Retry-After` bila dikirim |
| `INTERNAL_ERROR` | 500 | Kegagalan tak terduga atau dependensi penting gagal | Bug, exception tidak dikenal, layanan hilir gagal tanpa klasifikasi aman | State global yang aman; log `traceId`; jangan tampilkan detail internal |

Tidak ada kode 422, 502, 503, atau 504 sebagai kode aplikasi tambahan. Jika service internal memerlukan status HTTP seperti itu, petakan ke `INTERNAL_ERROR` pada kontrak publik. Penyebab yang dapat dipulihkan dan spesifik harus dipetakan ke kode yang lebih tepat, misalnya validasi ke `VALIDATION_ERROR` atau konflik ke `CONFLICT`.

### Aturan pemetaan

- Pesan atau status dari library tidak boleh bocor langsung ke UI.
- `401` berarti “tidak diketahui pemanggil”; `403` berarti “pemanggil dikenal tetapi tidak boleh melakukan ini”.
- `404` juga dapat digunakan untuk mencegah pembocoran keberadaan sumber. Jangan mengembalikan `403` hanya karena sumber milik pihak lain jika kebijakan aplikasi menyamarkannya sebagai tidak ditemukan.
- Timeout, koneksi gagal, dan layanan yang tidak tersedia bersifat internal dari perspektif pengguna. Gunakan `INTERNAL_ERROR` dengan `traceId`, kecuali ada kontrak publik retry yang telah disepakati.
- Kesalahan validasi dapat memiliki extension `errors`, tetapi data tersebut hanya berisi nama field dan pesan aman yang boleh ditampilkan.

Contoh extension validasi:

```json
{
  "type": "https://example.com/problems/validation-error",
  "title": "Validasi gagal",
  "status": 400,
  "detail": "Periksa kembali isian yang ditandai.",
  "instance": "/api/projects",
  "traceId": "01J2X7YQ8N4K6M3P9R0S2T5V7W",
  "errors": {
    "name": "Nama proyek wajib diisi."
  }
}
```

## 4. Desain `AppError`

`AppError` adalah error domain yang sudah dinormalisasi. Constructor menerima kode, detail aman, status dari kode, dan `cause` internal opsional. Jangan menerima `stack` atau data mentah dari pengguna sebagai pesan publik.

```ts
export const ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
] as const

export type ErrorCode = (typeof ERROR_CODES)[number]

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
}

export type ProblemDetails = {
  type: string
  title: string
  status: number
  detail: string
  instance?: string
  traceId: string
  errors?: Record<string, string>
}

export class AppError extends Error {
  readonly code: ErrorCode
  readonly status: number
  readonly title: string
  readonly errors?: Record<string, string>
  readonly traceId?: string

  constructor(options: {
    code: ErrorCode
    detail: string
    title?: string
    errors?: Record<string, string>
    traceId?: string
    cause?: unknown
  }) {
    const title = options.title ?? defaultTitle(options.code)
    super(options.detail, { cause: options.cause })
    this.name = 'AppError'
    this.code = options.code
    this.status = STATUS_BY_CODE[options.code]
    this.title = title
    this.errors = options.errors
    this.traceId = options.traceId
  }
}

function defaultTitle(code: ErrorCode) {
  return {
    VALIDATION_ERROR: 'Validasi gagal',
    UNAUTHENTICATED: 'Autentikasi diperlukan',
    FORBIDDEN: 'Akses ditolak',
    NOT_FOUND: 'Sumber tidak ditemukan',
    CONFLICT: 'Permintaan bertentangan',
    RATE_LIMITED: 'Terlalu banyak permintaan',
    INTERNAL_ERROR: 'Terjadi kesalahan internal',
  }[code]
}
```

URI `type` harus dipetakan oleh adapter/project ke dokumentasi yang dikendalikan tim, misalnya `https://example.com/problems/validation-error`. Ganti domain contoh tersebut dengan domain RFC resmi yang disepakati; jangan menjadikan URL contoh sebagai domain produksi.

Aturan pemakaian:

- Service membuat `AppError` hanya untuk kegagalan yang memiliki kategori stabil.
- Adapter database, HTTP, atau autentikasi memetakan error mentah ke `AppError` di boundary integrasi.
- `cause` untuk kebutuhan diagnosa; jangan serialisasinya.
- Jangan membuat subclass untuk setiap pesan. Subclass hanya masuk akal jika menambah data domain yang aman atau hooks pemetaan yang nyata.
- Jangan melempar `AppError` dari dalam komponen UI.
- Jangan menyimpan password, token, cookie, payload lengkap, query database, atau identifier yang tidak diperlukan di `detail` maupun `errors`.

## 5. Pembuatan `traceId` dan korelasi

Logging minimal harus menghasilkan satu record per kegagalan dengan bentuk berikut:

```text
timestamp=... level=error code=... traceId=... message=... cause=...
```

`cause` pada log boleh memuat informasi teknis sesuai kebijakan retensi, tetapi tidak boleh disalin ke respons. Gunakan logger terstruktur yang tersedia di proyek; jangan menambahkan logger atau platform observabilitas sebagai asumsi.

Aturan praktis:

1. Di edge/boundary, gunakan `traceparent` yang valid atau ID tracing yang sudah tersedia.
2. Jika tidak ada ID upstream, buat UUID v4 atau format ULID yang memang disepakati.
3. Simpan ID pada `AsyncLocalStorage` untuk request server agar helper di kedalaman alur dapat mengambilnya.
4. Pada setiap client-visible error, sertakan ID yang sama pada `traceId`.
5. Di UI, tampilkan “Kode dukungan: <traceId>” hanya jika ada alur dukungan; jangan menjadikan `traceId` sebagai mekanisme otorisasi.
6. Hapus traceId dari log saat retensi berakhir. Pastikan ID tidak mengandung data pribadi.
7. Pada multi-instance deployment, teruskan correlation context yang sama di setiap network hop.

## 6. Route Handler Next.js 16

Gunakan `Response.json` dan set header content type. `params` pada handler dinamis bersifat promise pada Next.js 16, sehingga harus di-`await`.

```ts
import { AppError } from '@/lib/error'

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(
  request: Request,
  { params }: RouteContext,
): Promise<Response> {
  const traceId = getTraceId(request)

  try {
    const { id } = await params

    if (!id) {
      throw new AppError("VALIDATION_ERROR", {
        message: "Parameter id wajib diisi.",
      })
    }

    const project = await loadProject(id, { traceId })

    if (!project) {
      throw new AppError("NOT_FOUND", {
        message: "Proyek tidak ditemukan.",
      })
    }

    return Response.json({ data: project }, { status: 200 })
  } catch (error) {
    return problemResponse(error, request, traceId)
  }
}
```

Adapter response harus menjadi satu-satunya tempat yang membuat body `application/problem+json`:

```ts
export function problemResponse(
  error: unknown,
  request: Request,
  traceId: string,
): Response {
  const problem = toProblemDetails(error, {
    instance: new URL(request.url).pathname,
    traceId,
  })

  return Response.json(problem, {
    status: problem.status,
    headers: {
      'Content-Type': 'application/problem+json',
    },
  })
}
```

`toProblemDetails` harus:

- menggunakan `AppError.code`, `title`, `status`, dan `detail` ketika error sudah dinormalisasi;
- memetakan `VALIDATION_ERROR` ke `400` dan kode lainnya sesuai tabel;
- menghasilkan `INTERNAL_ERROR` untuk `unknown`, termasuk error dari dependency;
- selalu menyertakan `traceId` yang valid;
- tidak mengembalikan `cause`, `stack`, atau input mentah;
- tidak membuat status 200 dengan property `error` di body.

Route Handler dapat mengembalikan `Response` biasa; `NextResponse` tidak diwajibkan. Jangan mengembalikan `NextResponse.json` dengan `application/json` untuk problem detail. Endpoint yang tidak memiliki handler atau method yang tidak didukung harus tetap mengikuti middleware/error boundary atau contract frontend yang sama.

## 7. Server Action envelope

Server Action dipanggil melalui React/Next.js dan return value-nya berada dalam hasil action, bukan otomatis menjadi HTTP Problem Details dari Route Handler. Karena itu gunakan envelope seragam berikut untuk hasil yang gagal:

```ts
type ActionError = {
  code: ErrorCode
  message: string
  traceId: string
  errors?: Record<string, string>
}

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: ActionError }
```

Contoh action generik yang belum mengasumsikan auth atau database:

```ts
'use server'

import { AppError, type ErrorCode } from '@/lib/error'

type ActionError = {
  code: ErrorCode
  message: string
  traceId: string
  fieldErrors?: Record<string, string[]>
}

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: ActionError }

export async function createProject(
  input: { name: string },
): Promise<ActionResult<{ id: string }>> {
  const traceId = createTraceId()

  try {
    const name = input.name.trim()

    if (!name) {
      throw new AppError("VALIDATION_ERROR", {
        fieldErrors: { name: ["Nama proyek wajib diisi."] },
      })
    }

    const project = await createProjectRecord({ name }, { traceId })

    return {
      success: true,
      data: { id: project.id },
    }
  } catch (error) {
    return actionFailure(error, traceId)
  }
}
```

`actionFailure` harus mengembalikan `success: false`, bukan melempar error domain ke `error.tsx`, karena `error.tsx` biasanya diperlakukan sebagai kegagalan render/transport yang lebih umum. Server Action juga tidak boleh mengembalikan data domain mentah, error database, atau seluruh object hasil mutasi.

```ts
export function actionFailure(
  error: unknown,
  traceId: string,
): ActionResult<never> {
  if (error instanceof AppError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.userMessage,
        traceId,
        fieldErrors: error.fieldErrors,
      },
    }
  }

  logError({ error, traceId, code: 'INTERNAL_ERROR' })

  return {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Terjadi kesalahan internal. Coba lagi sebentar.',
      traceId,
    },
  }
}
```

Untuk FormData, validasi `FormData` menjadi object domain sebelum memanggil operasi. Jangan mengandalkan validasi client. Server Action juga harus memeriksa autentikasi dan otorisasi bila fitur membutuhkannya; standar ini tidak menyatakan bahwa provider auth sudah tersedia. Instalasi provider auth dan DAL harus ditentukan oleh arsitektur aplikasi.

Kontrol flow Next.js seperti `redirect()` dan `notFound()` dapat bekerja dengan mekanisme exception internal framework. Jangan menelan exception tersebut di `catch` yang broadened tanpa stadium yang jelas. Munculkan ulang error kontrol flow, atau pindahkan pemrosesan error ke point yang memang tidak membungkus navigasi.

## 8. State UI

UI harus membaca `code` dan `traceId`, bukan melakukan parsing `detail` atau `status`. Semua komponen yang menjalankan mutasi harus punya state berikut:

| State | Kondisi | Perilaku |
| --- | --- | --- |
| `idle` | Belum ada aksi | Tampilkan form atau Konten normal |
| `pending` | Action/Request berjalan | Nonaktifkan aksi duplikat, pertahankan input, tampilkan progress |
| `success` | `success: true` atau HTTP 2xx | Tampilkan hasil, reset form bila sesuai, invalidate/revalidate data bila perlu |
| `field-error` | `VALIDATION_ERROR` dengan `errors` | Fokuskan field pertama bila aman, pertahankan input, tampilkan pesan per field |
| `unauthenticated` | `UNAUTHENTICATED` | Arahkan ke login atau minta autentikasi ulang |
| `forbidden` | `FORBIDDEN` | Tampilkan state akses ditolak tanpa detail internal |
| `empty` | `NOT_FOUND` | Tampilkan state tidak ditemukan atau empty state yang sesuai |
| `conflict` | `CONFLICT` | Minta muat ulang atau konfirmasi; jangan retry otomatis |
| `rate-limited` | `RATE_LIMITED` | Tampilkan jeda, gunakan backoff, hormati `Retry-After` |
| `unexpected` | `INTERNAL_ERROR` atau code tak dikenal | Tampilkan pesan generik, offers retry yang aman, sertakan traceId untuk dukungan |
| `navigation` | Redirect atau navigasi framework | Jangan anggap sebagai error; biarkan router bekerja |

Aturan presentasi:

- Tombol tetap dapat dinonaktifkan selama `pending` untuk mencegah duplikasi, tetapi jangan menghapus input pengguna.
- Jangan menjadikan toast sebagai satu-satunya saluran error; error penting harus terlihat di area yang fokus.
- `NOT_FOUND` untuk daftar boleh dipresentasikan sebagai empty state, bukan error modal.
- Retry hanya aman jika operasi dirancang idempoten. Jangan retry `POST` mutasi tanpa idempotency key.
- Jangan menangani `INTERNAL_ERROR` dengan retry otomatis yang membuat traffic loop.
- Hapus state error ketika pengguna memperbaiki input atau memulai aksi baru.
- Server-rendered `not-found.tsx`, `forbidden.tsx`, dan `error.tsx` dapat dipakai sebagai fallback navigasi bila konfigurasi serta dukungan Next.js proyek mengaktifkannya, tetapi envelope action harus tetap menjadi sumber state untuk mutasi.

## 9. Contoh parsing client

Client tidak boleh redefining error berdasarkan status HTTP saja jika `code` tersedia. Parser defensif tetap diperlukan untuk response framework, proxy, dan service yang tidak memakai kontrak ini.

```ts
export async function readProblem(response: Response) {
  const body = await response.json().catch(() => null)

  if (!body || typeof body !== 'object') {
    return {
      code: 'INTERNAL_ERROR' as const,
      message: 'Respons kesalahan tidak valid.',
      traceId: response.headers.get('x-trace-id') ?? undefined,
    }
  }

  const allowed = new Set([
    'VALIDATION_ERROR',
    'UNAUTHENTICATED',
    'FORBIDDEN',
    'NOT_FOUND',
    'CONFLICT',
    'RATE_LIMITED',
    'INTERNAL_ERROR',
  ])

  return {
    code: allowed.has(body.code) ? body.code : 'INTERNAL_ERROR',
    message: typeof body.message === 'string' ? body.message : 'Terjadi kesalahan internal.',
    traceId: typeof body.traceId === 'string' ? body.traceId : undefined,
  }
}
```

Untuk contract RFC 9457, code dapat dikirim sebagai member extension `code`; contoh ini sengaja menggunakan payload internal action yang ringkas. Jangan mengganti field `detail` RFC dengan `message` pada Route Handler. Jika memakai `detail` di client, lakukan fallback yang sama dan validasi tipe.

## 10. Checklist per task

### Taxonomy dan kontrak
- [ ] Error dipetakan ke tepat satu dari tujuh `ErrorCode`.
- [ ] Status HTTP mengikuti tabel resmi.
- [ ] `type`, `title`, `detail`, `instance`, dan `traceId` stabil serta aman.
- [ ] Tidak ada stack, token, query, payload, atau detail dependency yang dikembalikan.

### Boundary dan validasi
- [ ] Route Handler memvalidasi body, query, header, dan parameter dinamis.
- [ ] `params` dinamis pada Next.js 16 di-`await`.
- [ ] Server Action memvalidasi `FormData`/input di server.
- [ ] Otorisasi dilakukan bila task membutuhkan identitas/akses; provider yang digunakan terdokumentasi.
- [ ] Mutasi memiliki perilaku duplikasi dan retry yang disepakati.

### Observability
- [ ] `traceId` dibuat/diambil di boundary dan diteruskan ke log.
- [ ] Log server mencatat `code`, `traceId`, dan cause tanpa membocorkan secret.
- [ ] Client menampilkan traceId pada state yang membutuhkan dukungan.
- [ ] Correlation dapat dicari lintas Route Handler, Server Action, service, dan dependency.

### UI dan aksesibilitas
- [ ] `idle`, `pending`, `success`, serta seluruh failure state tersedia.
- [ ] Input tidak hilang saat gagal.
- [ ] Error penting tidak hanya ditampilkan lewat toast.
- [ ] Fokus, label, dan live region memenuhi kebutuhan aksesibilitas.
- [ ] Conflict meminta tindakan pengguna; rate limit menghormati backoff.

### Verifikasi
- [ ] Ada test untuk mapping setiap kode dan unknown error.
- [ ] Ada test yang memastikan respons error memakai `application/problem+json`.
- [ ] Ada test untuk sanitasi `cause`, stack, token, dan pesan internal.
- [ ] Ada test untuk `traceId` yang sama pada log dan Problem Details.
- [ ] Lint dan typecheck project lulus setelah perubahan.
