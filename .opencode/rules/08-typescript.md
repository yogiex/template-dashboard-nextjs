# 08 — TypeScript

> Rules ini untuk AI agent yang mengerjakan task di repo ini.
> Opsi di bawah disalin apa adanya dari `tsconfig.json` working tree.
> Referensi: `docs/CONVENTIONS.md` §TypeScript, `docs/ARCHITECTURE.md` §10.3, §14.4.

## 1. Strict Mode

`tsconfig.json` saat ini:

| Opsi | Nilai | Arti |
| --- | --- | --- |
| `strict` | `true` | semua strict family aktif |
| `target` | `ES2017` | jangan pakai API yang lebih baru tanpa Polyfill/build check |
| `lib` | `dom`, `dom.iterable`, `esnext` | | 
| `module` | `esnext`, `moduleResolution: bundler` | tidak ada CommonJS style |
| `allowJs` | `true`, tapi `checkJs` tidak aktif | file `.js` tidak di-typecheck |
| `skipLibCheck` | `true` | error di `node_modules` diabaikan |
| `noEmit` | `true` | Next.js yang melakukan build |
| `esModuleInterop` | `true` | | 
| `isolatedModules` | `true` | **wajib** `import type` untuk type-only |
| `jsx` | `react-jsx` | tanpa import React |
| `incremental` | `true` | | 
| `resolveJsonModule` | `true` | | 
| `plugins` | `[{ name: "next" }]` | | 
| `paths` | `@/*` → `./src/*` | alias wajib `@/`, bukan `~/` atau relatif jauh |
| `include` | `next-env.d.ts`, `**/*.ts(x)`, `.next/types/**`, `.next/dev/types/**`, `**/*.mts` | File `.next/types` ikut di-typecheck — janganurface error dari sana |
| `exclude` | `node_modules` | |

Konsekuensi `isolatedModules`: `export { SomeType }` tanpa `type` akan gagal saat
build. Selalu `export type { … }`.

**Tidak ada `typecheck` script** — verifikasi type dilakukan lewat `npx tsc --noEmit`
atau `npm run build`. Test runner (Vitest) sudah terpasang; jalankan `npm test` bila
menyentuh kode yang punya test. Urutan wajib: `npm run lint`, `npx tsc --noEmit`,
`npm run build` sebelum menyatakan selesai.

## 2. Sepuluh Aturan

### 2.1 Jangan pakai `any`

`any` mematikan seluruh benefit `strict`. Gunakan `unknown` untuk data yang belum
divalidasi lalu persempit dengan Zod atau type guard.

```ts
// Salah
export async function someAction(input: any) {}

// Benar
export async function someAction(input: unknown) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return err;
  const data: z.infer<typeof schema> = parsed.data;
}
```

Assertion yang muncul di kode upstream (mis. `("" as never)` di
`src/components/ui/form.tsx:31` untuk `getFieldState`) **tidak boleh ditiru** di
kode fitur.

### 2.2 `import type` untuk type-only

```ts
import { z } from "zod";
import type { User, UserQuery } from "@/features/user/schema";
import { type FieldErrors } from "@/lib/error";
```

Hindari juga import yang hanya dipakai sebagai tipe tapi ditulis sebagai nilai
(`import { User } from …` lalu hanya dipakai di anotasi) — `verbatimModuleSyntax`
akan complain.

### 2.3 Jangan pakai type assertion untuk menjinakkan compiler

Assertion **`as`**, `satisfies` (sebagai pengganti longgaran), dan `!` hanya sah
bila dibenarkan oleh validasi, type guard, atau batas integrasi yang memang
diketahui. Kalau butuh `as`, pertimbangkan mengubah skema atau tipe sumbernya.

```ts
// Salah: membohongi compiler
const role = "admin" as UserRole;
const user = data as User;
const count = maybeArray.length!;

// Benar: persempit dengan guard
if (!Array.isArray(data)) throw new AppError("VALIDATION_ERROR");
if (!user) return null;
```

Nilai enum/union yang memang berasal dari kode sendiri boleh disempitkan lewat
helper type guard, bukan lewat assertion.

### 2.4 Pakai discriminated union untuk state multi-fase

```ts
export type LoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: User[] }
  | { status: "error"; code: ErrorCode; message: string };
```

Lalu exhaustif tanpa `else` ending:

```ts
function render(state: LoadState) {
  switch (state.status) {
    case "idle":
      return null;
    case "loading":
      return <Skeleton />;
    case "success":
      return <UserTable users={state.data} />;
    case "error":
      return <ErrorState message={state.message} />;
  }
}
```

Pola yang sama sudah dipakai untuk hasil Server Action di `src/features/auth/actions.ts`
(`success` + `error` + `mfaRequired`).

### 2.5 `interface` vs `type`

- `interface` untuk **bentuk object** (props, options, config) yang bisa di-*extend*.
  Props komponen named: `interface LoginFormProps { … }`.
- `type` untuk union, primitive tunggal, mapped/conditional type, dan bentuk yang
  tidak butuh deklarasi merging.
- Primitive tunggal tidak perlu type baru sama sekali — tulis inline.

```ts
export interface PasswordInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
}

export type ThemeVars = Partial<Record<ThemeVarName, string>>;
export type StatIconName = keyof typeof statIconMap;
```

### 2.6 Tandai `readonly` pada tipe yang tidak berubah

Konvensi yang sudah dipakai di `src/lib/error.ts`:

```ts
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly fieldErrors?: FieldErrors;

  get status(): number { /* … */ }
  get userMessage(): string { /* … */ }
}
```

Konstanta array enum-ish selalu `as const` supaya tidak bisa di-mutate:

```ts
export const AUDIT_SEVERITIES = ["info", "warning", "critical"] as const;
export type AuditSeverity = (typeof AUDIT_SEVERITIES)[number];
```

### 2.7 Manfaatkan utility type

```ts
type LogContext = Record<string, unknown>;                  // src/lib/logger.ts
type ReadonlySession = Readonly<SessionUser>;
type UserPatch = Partial<Omit<User, "id" | "createdAt">>;
type ActorEmail = NonNullable<AuditEventInput["actor"]>["email"]; // src/features/audit/types.ts
type ColorPreset = (typeof PRESET_COLORS)[number];           // src/config/appearance.ts
```

Gunakan `Awaited<…>` untuk hasil `Promise` yang perlu dipakai sinkron, dan
`ReturnType<typeof fn>` saat tipe balik fungsi utils sulit ditulis manual
(mis. `ComponentProps<typeof NextThemesProvider>` di `theme-provider.tsx`).

### 2.8 Pisahkan `z.input` dan `z.output` untuk form

Zod 3 (`zod@^3.25`) membedakan bentuk **sebelum** dan **sesudah** parsing.
`react-hook-form` + `zodResolver` butuh ketiganya:

```ts
export const loginFormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  rememberMe: z.boolean().default(false), // ada default → input boleh string, output wajib boolean
});

export type LoginFormInput  = z.input<typeof loginFormSchema>;  // untuk form/client
export type LoginFormValues = z.output<typeof loginFormSchema>; // untuk nilai setelah parse
```

```tsx
const form = useForm<z.input<typeof loginFormSchema>, unknown, LoginFormValues>({
  resolver: zodResolver(loginFormSchema),
  defaultValues: { email: "", password: "", rememberMe: false },
});
```

Di server, selalu pakai `z.output` (hasil `parse`/`safeParse`) — itulah tipe yang
sudah dipersempit otomatis. Jangan menambahkan tipe kedua kalau tidak ada coercion.

### 2.9 `const` + union, bukan `enum`

```ts
// Benar (pola repo)
export const ERROR_CODES = [
  "VALIDATION_ERROR", "UNAUTHENTICATED", "FORBIDDEN",
  "NOT_FOUND", "CONFLICT", "RATE_LIMITED", "INTERNAL_ERROR",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

// Dihindari
enum ErrorCode { ValidationError, Unauthenticated }
```

`enum` hanya dipertimbangkan bila memang butuh pola enum kompatibel dengan kode lain
yang sudah ada. Untuk role di `src/lib/rbac.ts` dan `src/config/roles.ts`, tetap
union string.

### 2.10 Non-null assertion (`!`) hanya untuk hal yang dibuktikan logika

```ts
// Hindari
const value = map.get(id)!.value;

// Baik: guard eksplisit
const entry = map.get(id);
if (!entry) throw new AppError("NOT_FOUND");
```

Yang masih boleh: `document.getElementById` setelah dirender server, atau
`.current!` pada ref yang dijamin ada. Kalau perlu `!`, tuliskan komentar alasan.

## 3. File yang Butuh Type Eksplisit

Tambahkan anotasi tipe eksplisit di boundary publik ini:

| Lokasi | Yang perlu tipe |
| --- | --- |
| `src/features/*/actions.ts` | signature fungsi `export async function xAction(input: unknown): Promise<XActionState>`; `XActionState`/`XActionStateSuccess` diekspor sebagai `type` |
| `src/features/*/service.ts` | nilai balik setiap fungsi exported |
| `src/features/*/schema.ts` | setiap schema punya `z.input`/`z.output` type yang di-export |
| `src/features/*/lib/*.ts` | parameter fungsi helper yang dipanggil lintas fitur |
| `src/lib/*.ts` | semua export (`RateLimitOptions`, `ProblemResponseOptions`, `RequestContext`, `LogContext`, dll.) |
| `src/config/*.ts` | interface config + type turunan (`NavItem`, `NavGroup`, `StatIconName`) |
| komponen yang mengexport API | `interface <Nama>Props` (lihat `docs/CONVENTIONS.md` §Komponen) |
| `src/app/**/page.tsx` | tipe `params`/`searchParams` (Promise) saat memang tidak generik |

Di dalam fungsi lokal, biarkan inferensi bekerja. Anotasi `const x: Foo = …` di
badan fungsi biasanya tanda bahwa tipe sebenarnya salah di tempat lain.

## 4. Error Handling dan Type

- Error diklasifikasi lewat `ErrorCode` (`src/lib/error.ts`), bukan `instanceof` berantai.
  `AppError` membawa `fieldErrors?: FieldErrors = Record<string, string[]>`.
- Guard: `if (!(error instanceof AppError)) …`, dan `catch` capturing `unknown` —
  jangan menuliskan tipe error secara manual, itu jarang benar.
- Predikat `field is keyof T` untuk memvalidasi nama field dari server:

```ts
function isLoginField(field: string): field is keyof LoginFormValues {
  return field === "email" || field === "password" || field === "rememberMe";
}
```

- Saat memetakan `issue.path[0]` dari Zod, periksa dulu `typeof field === "string"`
  karena `path` bisa berisi `number | symbol`.

## 5. Jangan

- Jangan `any`, termasuk `as any` dan `Array<any>`.
- Jangan `// @ts-ignore` / `@ts-expect-error` tanpa alasan tertulis; kalau memang perlu, tulis FIXME dengan-issue link.
- Jangan nonaktifkan `strict` atau menambah `"strict": false` di `tsconfig.json` demi build hijau.
- Jangan menambah `suppressImplicitAnyIndexErrors` atau opsi lain yang melemahkan checking.
- Jangan `import … from "@/lib/utils"` — file itu tidak ada; `cn` datang dari package `cn`.
- Jangan `enum` untuk data runtime.
- Jangan assertion untuk "menjinakkan" compiler; ubah skema atau tipe sumbernya.
- Jangan kirim `Date`, `Map`, class instance, atau callback server ke Client Component sebagai prop — hanya data serializable.
- Jangan lupa `import type` di file yang juga di-`isolatedModules`.
- Jangan skip `npm run build`; itu satu-satunya verifikasi tipe yang nyata di repo ini.
