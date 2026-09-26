# 03 — Komponen

Status: diverifikasi terhadap kode repo pada 2026-09 (Next.js 16.3.6 App Router, React 19.2.8, `@base-ui/react` primitive + `class-variance-authority`, Tailwind v4, `react-hook-form` + `zodResolver` + `zod`).

Dokumen acuan: `docs/ARCHITECTURE.md`, `docs/PERFORMANCE.md` §3, `docs/CONVENTIONS.md`.

> Koreksi draft: primitive di repo ini **Base UI** (`@base-ui/react/*`), bukan Radix, dan bukan komponen shadcn "upstream" apa adanya — `components.json` memakai style `base-nova`. Akibatnya komponen polymorphic memakai prop **`render={...}`**, bukan `asChild`. `Button` sudah memakai `render` (`src/components/ui/button.tsx:42-55`).

## Decision Tree: Server vs Client

Jawab dari atas ke bawah. Kriteria yang pertama "ya" menentukan jawabannya.

```
Perlu interaksi (useState, event handler, onClick, onChange)?        → Client
Perlu browser API (window, document, localStorage, navigator)?       → Client
Pakai library client-only (recharts, @xyflow/react, cmdk, qrcode)?   → Client
Form interaktif / optimistic UI / polling?                            → Client
Perlu context client (useTheme, react-hook-form, sonner)?            → Client
─────────────────────────────────────────────────────────────────────────────
Hanya async fetch / baca data / kredensial / token / markup statis?    → Server (default)
Formatting, parsing, komputasi murni?                                → Server
Hanya menerima children lalu merender struktur?                      → Server
```

Aturan tambahan:

- **Server Component adalah default.** `src/app/layout.tsx` dan seluruh page/layout tidak pernah punya `"use client"` hanya karena satu child interaktif.
- Menambahkan `async` **tidak** necessitates `"use client"`. Async Server Component tetap Server Component.
- `"use client"` adalah batas **modul**: apa pun yang di-import dan dirender langsung file itu ikut masuk client bundle sehingga wildcard import harus dihindari.
- Client Component hanya menerima props **serializable** dari server: primitive, array, plain object, React element. Tanpa function, token, atau entity database.
- Jangan pernah import `@/features/*/service.ts` (ber-`import "server-only"`) dari file client.
- TypeScript: `"use client"` harus berada di baris pertama file, sebelum import apa pun, dengan titik kama di akhir (`"use client";`).

## Anatomi Server Component

Pola yang dipakai repo: `type` props → `export const metadata` → `export const dynamic` bila perlu → komponen `async default` → `await params/searchParams` → early return `notFound()` → baca config → baca data → render.

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { UEBA_PAGE_CONFIG } from "@/config/observability";
import { RiskBadge } from "@/features/ueba/components/risk-badge";
import { getUserRiskProfile } from "@/features/ueba/service";

export const metadata: Metadata = {
  title: "Profil Risiko",
  description: "Detail anomali dan baseline untuk satu aktor.",
};

export const dynamic = "force-dynamic";

type UebaActorPageProps = {
  params: Promise<{ actorId: string }>;
};

export default async function UebaActorPage({ params }: UebaActorPageProps) {
  const config = UEBA_PAGE_CONFIG;
  const { actorId } = await params;
  const profile = getUserRiskProfile(actorId);

  if (!profile) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight">
            {config.detailTitleTemplate.replace("{actorId}", profile.actorId)}
          </h2>
          <RiskBadge level={profile.level} score={profile.riskScore} />
        </div>
        <Button variant="outline" className="h-9" render={<Link href="/settings/ueba" />}>
          {config.detailBackLabel}
        </Button>
      </div>
    </div>
  );
}
```

Yang wajib dijaga:

- `params` / `searchParams` selalu `await`.
- Copy dari `config`, bukan string literal (judul statis yang benar-benarCopy editorial boleh literal, misalnya `"Aktivitas terbaru"` di page UEBA).
- Server Component boleh punya `metadata` export; jangan buat `<head>` manual.
- Ownership `<main>`: `PageShell` (dashboard) dan `AuthShell` sudah menyediakan `<main>`. Halaman yang memakai `PageShell` **tidak boleh** menambah `<main>` sendiri.
- Format tanggal/angka di server (`toLocaleString("id-ID")`), bukan di client.
- Parallelkan I/O independen dengan `Promise.all` sebelum `await` yang penting.

## Anatomi Client Component

Pola leaf interaktif: `"use client"` → import hook pustaka → type props → komponen dengan state lokal → handler memanggil Server Action lewat prop/import `"use server"`, selalu dibungkus `try/catch`.

```tsx
"use client";

import { useState } from "react";
import { Check, Laptop, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

const themes = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Laptop },
] as const;

export function ThemeToggle() {
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  return (
    <div className="relative">
      <button
        type="button"
        className="inline-flex size-9 items-center justify-center rounded-md text-foreground transition-colors hover:bg-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/50"
        onClick={() => setOpen((value) => !value)}
        aria-label="Pilih tema"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Sun className="size-4 dark:hidden" aria-hidden="true" />
        <Moon className="hidden size-4 dark:block" aria-hidden="true" />
      </button>
      {open ? (
        <div className="absolute right-0 z-10 mt-2 w-36 rounded-lg border bg-popover p-1 shadow-md">
          {themes.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => {
                  setTheme(item.value);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
              >
                <Icon className="size-4" aria-hidden="true" />
                {item.label}
                {theme === item.value ? <Check className="ml-auto size-4" aria-hidden="true" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
```

Yang wajib dijaga:

- Batasi client leaf. Jangan menaruh `"use client"` pada layout, provider, atau subtree besar untuk satu interaksi.
- `key` list harus stabil (nilai domain), bukan index — kecuali list skeleton statis.
- Warna lewat **token semantic** (`bg-muted`, `text-foreground`, `border-destructive/30`), jangan hex, jangan `emerald-500` hardcode, jangan arbitrary value.
- State fokus/hover/disabled harus terlihat (token `focus-visible:ring-*` sudah ada di primitive).

## Pattern Client Wrapper + Server Children

Kalau client component hanya butuh shell interaktif (dialog, sheet, popover, tabs) tapi isinya server-rendered, teruskan `children` agar subtree server **tidak** ikut jadi client.

```tsx
"use client";

import type { ReactNode } from "react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  onConfirm: () => void;
};

// Wrapper client: yang interaktif
export function ConfirmDialog({ open, title, children, onConfirm }: ConfirmDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="rounded-lg border p-4">
      {children}
      <button type="button" onClick={onConfirm}>
        Konfirmasi
      </button>
    </div>
  );
}
```

```tsx
// Server Component pemanggil: isi tetap server
export default async function UserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const user = await getUser(userId);

  return (
    <ConfirmDialog open={true} title="Detail user" onConfirm={() => {}}>
      <UserProfile user={user} />
      <UserTimeline userId={userId} />
    </ConfirmDialog>
  );
}
```

Catatan: `onConfirm={() => {}}` di server component tidak valid secara serialisasi. Pola yang benar untuk aksi konfirmasi: `children` berisi server content, sementara handler client dikirim sebagai **component client kecil** (`<ConfirmButton />` di dalam `children`) atau server action dikirim ke wrapper. Jangan mengirim arrow function dari server.

## Pattern Form dengan Server Action

Stack yang dipakai repo (terverifikasi di `src/features/auth/components/login-form.tsx`): `react-hook-form` + `zodResolver` + schema Zod dari `features/<d>/schema.ts`, submit memanggil exported async function dari `actions.ts` (file ber-`"use server"`), hasilnya discriminated union.

Sisi server — `src/features/<d>/actions.ts`:

```ts
"use server";

import type { z } from "zod";

import { loginFormSchema } from "@/features/auth/schema";
import { verifyCredentials } from "@/features/auth/service";
import type { ErrorCode, FieldErrors } from "@/lib/error";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getSafeRequestContext } from "@/lib/request-context";

export type ActionError = {
  code: ErrorCode;
  message: string;
  fieldErrors?: FieldErrors;
};

export type ActionState =
  | { success: true }
  | { success: false; error: ActionError };

export async function loginAction(
  values: z.input<typeof loginFormSchema>
): Promise<ActionState> {
  const identifier = getSafeRequestContext().ipHash;
  const parsed = loginFormSchema.safeParse(values);

  if (!parsed.success) {
    return {
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Data tidak valid." },
    };
  }

  try {
    enforceRateLimit(identifier, "login", { maxAttempts: 5, windowMs: 15 * 60 * 1000 });
    await verifyCredentials(parsed.data);
    return { success: true };
  } catch (error) {
    logger.error("login_action_failed", { error });
    // Jangan kirim stack trace, query, atau detail internal ke client.
    return {
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan. Silakan coba lagi." },
    };
  }
}
```

Sisi client — anatomy wajib:

```tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { loginAction, type ActionState } from "@/features/auth/actions";
import { loginFormSchema, type LoginFormValues, type LoginPageFormConfig } from "@/features/auth/schema";

interface LoginFormProps {
  config: LoginPageFormConfig;
}

export function LoginForm({ config }: LoginFormProps) {
  const form = useForm<z.input<typeof loginFormSchema>, unknown, LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });
  const [actionError, setActionError] = useState<ActionState | null>(null);
  const isSubmitting = form.formState.isSubmitting;

  // Alert umum ditentukan oleh KETIDAKADANYA field error, bukan keberadaan error.
  const error = actionError && !actionError.success ? actionError.error : null;
  const hasFieldErrors = Object.keys(error?.fieldErrors ?? {}).length > 0;
  const showGeneralError = error !== null && !hasFieldErrors;

  const onSubmit = async (values: LoginFormValues) => {
    setActionError(null);

    try {
      const result = await loginAction(values);
      if (result.success) {
        return;
      }
      setActionError(result);
      for (const [field, messages] of Object.entries(result.error.fieldErrors ?? {})) {
        const message = messages[0];
        if (message && (field === "email" || field === "password")) {
          form.setError(field, { message });
        }
      }
    } catch (submitError) {
      // error boundary TIDAK menangkap event handler; try/catch wajib di sini.
      console.error("[login-form] submit failed", submitError);
      setActionError({
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Terjadi kesalahan. Silakan coba lagi." },
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate aria-busy={isSubmitting}>
        {showGeneralError ? (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{error?.message}</AlertDescription>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>{config.emailLabel}</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" placeholder={config.emailPlaceholder} className="h-10" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel>{config.passwordLabel}</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="current-password" className="h-10" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="h-10 w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {isSubmitting ? "Memproses..." : config.submitLabel}
        </Button>
      </form>
    </Form>
  );
}
```

Checklist form (kenaan `AGENTS.md` dan kode nyata):

- [ ] `"use client"` + `"use server"` dipisah file; action di `features/<d>/actions.ts`.
- [ ] Validasi **tetap di server** dengan `safeParse`; zodResolver hanya feedback cepat.
- [ ] Otorisasi dan rate limit (`enforceRateLimit`) di server, per `docs/SECURITY.md`.
- [ ] Submit selalu `try/catch` + `console.error` ringkas; error detail hanya di logger server.
- [ ] Semua field dibungkus `FormField` + `FormItem className="space-y-2"` + `FormControl` + `FormMessage`; `<form>` memakai `space-y-5`.
- [ ] Input form `className="h-10"`; tombol submit `h-10 w-full` dengan `disabled={isSubmitting}` + spinner `aria-hidden`.
- [ ] `FormItem` untuk checkbox memakai `flex flex-row items-center gap-2` (bukan `space-y-2`) dan label `className="!mt-0 text-sm font-normal"`.
- [ ] `noValidate` pada `<form>` agar pesan error server yang konsisten.
- [ ] `autoComplete` yang benar (`email`, `current-password`, `new-password`, `one-time-code`) — **jangan** mematikan autofill dengan `readOnly`/`autocomplete="one-time-code"` pada field password.
- [ ] Field string yang diedarkan server dip‑mapping dengan type predicate, bukan `as`.
- [ ] Alert umum hanya tampil bila `Object.keys(fieldErrors ?? {}).length === 0`.

## Pattern Empty/Loading/Error State

Tiga komponen reusable sudah tersedia di `src/components/custom/`. Jangan mengulangimplementasinya per halaman.

`EmptyState` (`role="status"`, `aria-live="polite"`, props `title`, `description?`, `icon?`, `action?`, `className?`):

```tsx
import { EmptyState } from "@/components/custom/empty-state";

if (result.data.length === 0) {
  return (
    <EmptyState
      title="Tidak ada user"
      description="Coba ubah kata kunci atau filter Anda."
      action={
        <Button variant="outline" size="sm" render={<Link href="/users" />}>
          Reset filter
        </Button>
      }
    />
  );
}
```

`ErrorState` (`role="alert"`, `aria-live="assertive"`, props `title?`, `description?`, `onRetry?`, `retryLabel?`, `retrying?`) — hanya di dalam subtree client karena `onRetry` berupa function:

```tsx
"use client";

import { useState } from "react";
import { ErrorState } from "@/components/custom/error-state";

export function UserList({ result }: { result: UserListResult }) {
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  if (error) {
    return (
      <ErrorState
        title="Gagal memuat daftar user"
        description={error}
        retrying={retrying}
        onRetry={() => {
          setRetrying(true);
          setError(null);
        }}
      />
    );
  }

  return <UserTable result={result} />;
}
```

`loading.tsx` per segment — `Skeleton` dengan **dimensi stabil** yang mencerminkan struktur akhir (contoh nyata `src/app/(dashboard)/users/loading.tsx`):

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function UsersLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="rounded-lg border">
        <Skeleton className="h-10 w-full rounded-none" />
        {Array.from({ length: 10 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full rounded-none border-t" />
        ))}
      </div>
    </div>
  );
}
```

`error.tsx` per segment — **wajib** `"use client"` karena menerima `error` dan `reset`, tampilkan `error.digest` sebagai kode referensi, jangan tampilkan `error.message` mentah:

```tsx
"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-20 text-center"
    >
      <AlertTriangle className="h-10 w-10 text-destructive/70" aria-hidden="true" />
      <h2 className="mt-4 text-lg font-semibold">Gagal memuat halaman</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Terjadi kesalahan saat menampilkan halaman ini. Data lain masih bisa diakses melalui menu.
      </p>
      {error.digest ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Kode referensi: <code className="font-mono">{error.digest}</code>
        </p>
      ) : null}
      <Button variant="outline" size="sm" className="mt-6" onClick={reset}>
        <RotateCcw aria-hidden="true" />
        Coba lagi
      </Button>
    </div>
  );
}
```

Aturan: letakkan `loading.tsx`/`error.tsx` pada segment yang butuh, tidak di root kecuali relevan. Error state harus ada supaya fallback tidak membuat pengguna mengira request masih berjalan. Lazy load chart/editor/map dengan `next/dynamic` + skeleton berdimensi stabil.

## Pattern Reusable Component dengan Variant

Primitive di `src/components/ui/` memakai `class-variance-authority` (cva) dan `Base UI`. Contoh nyata `src/components/ui/button.tsx`:

```tsx
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "cn";

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent text-sm font-medium transition-all outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        outline: "border-border bg-background hover:bg-muted hover:text-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary",
        ghost: "hover:bg-muted hover:text-foreground",
        destructive: "bg-destructive/10 text-destructive hover:bg-destructive/20",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-8 gap-1.5 px-2.5",
        sm: "h-7 gap-1 px-2.5",
        lg: "h-9 gap-1.5 px-2",
        icon: "size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
```

Komponen aplikasi yang butuh behavior khusus (retry, onClick, context domain) ditulis sendiri di `src/components/custom/`, bukan di `ui/`, dan terima `className` untuk komposisi. Prinsip: `ui/` = presentational + variant; `custom/` = domain-aware.

Jangan membuat sistem warna/spacing kedua: warna lewat token semantic dari `src/app/globals.css` (Tailwind v4 `@theme`), jarak lewat skala Tailwind, radius lewat `rounded-lg`/`rounded-md` yang sudah ada.

## Button dengan Link (Base UI `render`)

Base UI memakai prop `render`, **bukan** `asChild`. Pola di repo:

```tsx
import Link from "next/link";

import { Button } from "@/components/ui/button";

// Tombol yang navigated
<Button variant="outline" className="h-9" render={<Link href="/settings/ueba" />}>
  Kembali
</Button>

// Link yang terlihat seperti tombol
<Button className="h-10 w-full" render={<Link href="/login" />}>
  Kembali ke login
</Button>

// Link eksternal
<Button variant="outline" render={<a href={siteConfig.url} rel="noopener noreferrer" target="_blank" />}>
  Dokumentasi
</Button>
```

Aturan:

- Element yang dirender lewat `render` selalu **self-closing** (`<Link href="..." />`); children diletakkan pada `Button`, bukan pada `Link`.
- Jangan tulis `asChild` — API itu tidak ada di Base UI dan akan gagal.
- `href` hanya ke route yang benar-benar ada; tidak ada `href="#"`.
- Untuk navigasi non-button, pakai `<Link>` biasa dengan token teks (`text-muted-foreground underline-offset-4 hover:underline`).
- Polymorphic Base UI lain juga pakai `render`, contoh nyata `app-sidebar-header.tsx`:

```tsx
<SidebarMenuButton
  size="lg"
  tooltip={siteConfig.name}
  render={<Link href="/" aria-label={`${siteConfig.name} — beranda`} />}
  className="data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground"
>
  <PanelsTopLeft aria-hidden="true" />
  <span className="truncate font-semibold">{siteConfig.name}</span>
</SidebarMenuButton>
```

## Composition over Configuration

- **Prefer `children` daripada prop bertipe fungsi/JSX yang bisa dihitung.** `PageShell` menerima `title`, `description`, `actions` (ReactNode), `children` — bukan `headerContent={...} renderHeader={...}`.
- Capability lewat props boolean/slot yang terbatas; behaviour open-ended lewat komposisi.
- Hindari prop `render`-sendiri di komponen aplikasi; komponen aplikasi mengarde children ke dalam primitive.
- Konfigurasi (copy, label, href)via `src/config/` — bukan conditionals panjang di dalam komponen.
- Hindari conditional: gunakan optional prop (`showRememberMe`) lalu render seadanya, bukan `showX ? <A/> : showY ? <B/> : <C/>`.
- Komponen presentasional tidak melakukan query database, auth check, atau access control; terima data dan action yang sudah dipercaya (server boundary yang sucesos).

```tsx
// ✅ Komposisi
type PageShellProps = {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function PageShell({ title, description, actions, children, className }: PageShellProps) {
  return (
    <main className={cn("flex min-w-0 flex-1 flex-col gap-6 p-4 md:p-6", className)}>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-balance">{title}</h1>
          {description ? <div className="text-sm text-pretty text-muted-foreground">{description}</div> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </header>
      <div className="min-w-0 flex-1">{children}</div>
    </main>
  );
}

export type { PageShellProps };
```

```tsx
// ❌ Configuration smell
<Table renderHeader={(cols) => cols.map(...)} renderEmpty={<span>Kosong</span>} />
```

## Aksesibilitas Wajib

- Semantik dulu: `main`, `header`, `nav`, `section`, `ul/li`, `dl/dt/dd`, `table/thead/tbody`. `h1` hanya sekali per halaman (`PageShell` yang memblok).
- Label form selalu terhubung: `FormLabel` + `FormControl` + `FormMessage` dari `src/components/ui/form.tsx` (sudah menangani `id`, `aria-describedby`, `aria-invalid`). Jangan `htmlFor` manual bila sudah memakai primitive itu.
- Ikon dekoratif: `aria-hidden="true"` + `size-*` eksplisit. Ikon yang jadi satu-satunya sumber makna wajib punya `aria-label` pada kontrolnya.
- Status dinamis diumumkan: `role="status"` + `aria-live="polite"` (empty/success), `role="alert"` (error), `aria-busy={isSubmitting}` pada `<form>`.
- Tombol: `type` selalu eksplisit (`type="submit"` / `type="button"`). Jangan `div` atau `<a>` tanpa href untuk aksi.
- Fokus keyboard: primitive sudah punya `focus-visible:ring-*`. Menu/popover wajib `aria-expanded`, `aria-haspopup`, dan ditutup dengan `Escape` (Base UI handles untuk primitive-nya; untuk menu kustom tambahkan handler).
- Paginasi: `<nav aria-label="Paginasi tabel">` + `aria-current="page"` pada halaman aktif + `rel="prev"/"rel="next"` + state disabled saat tidak ada.
- Icon-only button butuh nama aksesibel yang menjelaskan aksi ("Urutkan berdasarkan nama", bukan "tombol ikon").
- Jangan pernah memakai `autocomplete="off"` atau `readOnly` pada field autentikasi; merusak password manager.
- Link yang membuka tab baru: `target="_blank"` + `rel="noopener noreferrer"`.
- `prefers-reduced-motion`: hormati `motion-reduce` (utility `motion-reduce:*`) untuk animasi non-esensial; spinner tetap boleh.

### Verifikasi sebelum menyatakan selesai

```bash
npm run lint
npm run build
```

Test runner (Vitest) sudah terpasang — jalankan `npm test` bila menyentuh kode yang punya test (lihat `09-testing.md`). Kalau kamu mengubah struktur folder, config, atau status fitur, perbarui `docs/ARCHITECTURE.md` pada commit yang sama. Jangan buat commit/push kecuali diminta.
