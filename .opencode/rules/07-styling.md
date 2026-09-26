# 07 — Styling

> Rules ini untuk AI agent yang mengerjakan task di repo ini.
> Semua token, class, dan pola di bawah **diverifikasi terhadap**
> `src/app/globals.css`, `src/components/ui/**`, dan komponen fitur yang ada.
> Referensi: `docs/CONVENTIONS.md` §Styling, `docs/ARCHITECTURE.md` §14.8.

## 0. Stack Styling (fakta)

| Item | Nilai | Sumber |
| --- | --- | --- |
| CSS framework | Tailwind CSS `^4` via `@tailwindcss/postcss` | `package.json`, `postcss.config.mjs` |
| Konfigurasi | **Tidak ada** `tailwind.config.js`; semua lewat `@import "tailwindcss"` + `@theme inline` | `src/app/globals.css` |
| shadcn | style `base-nova`, `rsc: true`, `baseColor: neutral`, `cssVariables: true`, `iconLibrary: lucide` | `components.json` |
| Primitive | `@base-ui/react` — **bukan** Radix | `src/components/ui/button.tsx` |
| Merge class | `cn` dari package `cn` (`cn()`) | `src/components/ui/button.tsx`, `src/components/ui/badge.tsx` |
| Dark mode | `next-themes` + `@custom-variant dark (&:where(.dark, .dark *))` → kelas `.dark` | `src/components/layout/theme-provider.tsx`, `globals.css:3` |
| Font | `--font-jakarta` (sans) + `--font-geist-mono` (mono) | `globals.css:124-125` |

Penting: primitive memakai Base UI. Pola `asChild` **tidak berlaku**; yang benar
adalah prop `render`:

```tsx
<Button render={<Link href="/dashboard" />}>Dashboard</Button>
<SidebarLink render={<Link href={item.href} />} />
```

## 1. Token Semantic (WAJIB)

### 1.1 Cara kerja token di repo ini

`src/app/globals.css` punya dua lapis:

1. `:root` dan `.dark` mendefinisikan **nilai warna** (`--primary`, `--background`, …) dalam `oklch()`.
2. `@theme inline` memetakan token itu ke namespace warna Tailwind
   (`--color-primary: var(--primary)`), sehingga Tailwind menghasilkan utility
   `bg-primary`, `text-muted-foreground`, `border-border`, `ring-ring`, dan seterusnya.

Efeknya: **nilai warna hanya boleh diubah di `globals.css`**, bukan di class komponen.

### 1.2 Token yang benar-benar ada

Diverifikasi dari `src/app/globals.css`. Prefix `bg-`/`text-`/`border-` ditambahkan oleh `@theme inline`.

| Token CSS | Token warna | Warna | Foreground-nya |
| --- | --- | --- | --- |
| `--background` | `background` | ivory warm `oklch(0.985 0.003 100)` | `--foreground` |
| `--foreground` | `foreground` | `oklch(0.145 0 0)` | — |
| `--card` | `card` | `oklch(0.995 0.002 100)` | `--card-foreground` |
| `--popover` | `popover` | `oklch(0.995 0.002 100)` | `--popover-foreground` |
| `--primary` | `primary` | **emerald** `oklch(0.596 0.145 163.225)` | `--primary-foreground` |
| `--secondary` | `secondary` | `oklch(0.96 0.005 100)` | `--secondary-foreground` |
| `--muted` | `muted` | `oklch(0.96 0.005 100)` | `--muted-foreground` |
| `--accent` | `accent` | `oklch(0.96 0.005 100)` | `--accent-foreground` |
| `--destructive` | `destructive` | `oklch(0.577 0.245 27.325)` | `--destructive-foreground` |
| `--border` | `border` | `oklch(0.91 0.006 100)` | — |
| `--input` | `input` | `oklch(0.91 0.006 100)` | — |
| `--ring` | `ring` | `oklch(0.696 0.170 162.480)` (dark) | — |
| `--chart-1..5` | `chart-1..5` | 5 slot untuk chart | — |
| `--sidebar` | `sidebar` | `oklch(0.98 0.004 100)` | `--sidebar-foreground` |
| `--sidebar-primary` | `sidebar-primary` | emerald | `--sidebar-primary-foreground` |
| `--sidebar-accent` | `sidebar-accent` | `oklch(0.96 0.005 100)` | `--sidebar-accent-foreground` |
| `--sidebar-border` | `sidebar-border` | `oklch(0.91 0.006 100)` | — |
| `--sidebar-ring` | `sidebar-ring` | emerald | — |
| `--risk-low` | `risk-low` | emerald | — |
| `--risk-medium` | `risk-medium` | `oklch(0.647 0.150 76)` | — |
| `--risk-high` | `risk-high` | `oklch(0.588 0.199 40)` | — |
| `--risk-critical` | `risk-critical` | `oklch(0.577 0.245 27.325)` | — |

Utility tambahan yang ada di `globals.css`:

| Utility | Isi |
| --- | --- |
| `@utility bg-noise` | tekstur noise SVG untuk hero/panel |
| `@utility bg-grid` | grid 48px memakai `var(--border)` |
| `@utility bg-panel-grid` | grid putih 8% untuk panel gelap |

Koreksi yang sering terjadi: **tidak ada token `--radius`, `--border-radius`, atau
skala spacing kustom** di `globals.css`. Radius memakai utility bawaan Tailwind
(`rounded-md`, `rounded-lg`, `rounded-xl` — lihat `src/components/ui/button.tsx` yang
pakai `rounded-lg`). Spacing memakai skala default Tailwind. Jangan mengarang
`rounded-[10px]` sebagai sistem radius baru.

### 1.3 Aturan pemakaian

```tsx
// Benar
<div className="bg-background text-foreground" />
<div className="border-border bg-card text-card-foreground" />
<p className="text-sm text-muted-foreground" />
<Button variant="destructive" className="bg-destructive/10 text-destructive" />

// Salah
<div className="bg-white text-black" />
<div className="bg-[#10b981]" />
<div className="text-emerald-600" />   // jangan hardcode emerald di komponen
```

- Warna lewat token semantic atau variant komponen. Kalau butuh nilai dinamis yang
  tidak diketahui saat build, memang boleh pakai CSS variable melalui inline style
  (contohnya theme picker).
- Risiko UEBA wajib lewat `risk-*` (`bg-risk-low`, `text-risk-critical`, …) supaya
  light dan dark konsisten.
- Warna brand bisa diganti runtime lewat `src/config/appearance.ts`
  (`PRESET_COLORS`, `ALLOWED_THEME_VARS` = `primary`, `primaryForeground`, `ring`,
  `sidebarPrimary`). Preset default adalah `emerald` (`DEFAULT_PRESET_ID`). Kalau
  menambah preset, tambahkan hanya di config itu, jangan menulis token baru inline.

## 2. Palette

- Light = **ivory warm** (bg `oklch(0.985 0.003 100)`,abu-abu kehangatan 100°),
  aksen = **emerald** (`hue ~163`).
- Dark = netral gelap `oklch(0.145 0 0)` dengan primary emerald lebih terang
  (`oklch(0.696 0.170 162.480)`) supaya kontras di dark background cukup.
- Semua warna ditulis dalam **`oklch()`**, bukan hex/RGB, di `globals.css`.
- Merah/hijau/amber untuk level risiko hanya lewat `--risk-*`.
- `* { border-color: var(--border); }` sudah global — jangan set border color
  default ulang di setiap komponen kecuali memang berbeda.

## 3. Spacing & Layout

- Spacing: skala default Tailwind (`p-4`, `gap-3`, `space-y-5`). Tidak ada token
  spacing custom. Jangan membuat magic number berulang; kalau nilainya reusable,
  jadikan konstanta atau komponen komposisi.
- Pola layout yang sudah dipakai di repo (ikuti, jangan improv):
  - `<form>` pada halaman auth: `className="space-y-5"`
    (`src/features/auth/components/login-form.tsx:112`).
  - `FormItem`: `className="space-y-2"` (label, control, message).
  - `Input`/`Select`/`Textarea` di form auth: `className="h-10"`.
  - Section atas halaman auth: `space-y-6` dengan header `space-y-2`
    (`src/app/(auth)/login/page.tsx`).
- Kepemilikan `<main>`: `PageShell` (`src/components/layout/page-shell.tsx`) sudah
  menyertakan `<main>` untuk `(dashboard)`; `(public)/layout.tsx` dan `AuthShell`
  juga punya `<main>`. **Jangan tambahkan `<main>` ganda.**
- Grid halaman dashboard: pakai `grid gap-4 md:grid-cols-2 xl:grid-cols-3` untuk grid
  panel seperti `src/features/roles/components/role-list.tsx:39`, serta
  `overflow-x-auto` untuk tabel (`src/components/ui/table.tsx` sudah menangani
  wrapper-nya).
- Shell komponen: `Card`, `Alert`, `Badge`, `Separator` dari `src/components/ui/`.
  Jangan tulis ulang struktur card dengan `<div>` + `border` manual.

## 4. Typography

- Font: `--font-jakarta` untuk sans (di-override di `body` dengan
  `font-family: var(--font-jakarta), system-ui, sans-serif`), `--font-geist-mono`
  untuk mono. Tidak ada font display/serif tambahan.
- Skala: pakai utility Tailwind — heading halaman `text-2xl font-semibold tracking-tight`,
  judul section `text-lg font-semibold`, body `text-sm`, copy sekunder
  `text-sm text-muted-foreground`, label/overline `text-xs uppercase tracking-wide`.
  Ikuti kelas yang sudah dipakai komponen sekilas sebelum mengarang ukuran baru.
- Angka metrik/statistik: `tabular-nums` agar tidak bergeser.
- Copy bahasa Indonesia **dari `src/config/`** (`siteConfig`, `public-pages.ts`,
  `login-page.ts`, `mfa-pages.ts`, `log-management.ts`, `observability.ts`), bukan
  string inline di komponen.

## 5. Dark Mode

- Varian gelap: `@custom-variant dark (&:where(.dark, .dark *))`. Artinya: tambahkan
  class `dark` pada elemen akar (dilakukan `next-themes` via `ThemeProvider`).
- Prinsip: **jangan menulis ulang nilai warna untuk dark.** Cukup dengan
  `dark:` hanya bila token tidak cukup, terutama border/opacity:

```tsx
<Button variant="ghost" className="hover:bg-muted hover:text-foreground dark:hover:bg-muted/50" />
<Badge className="dark:border-input dark:bg-input/30" />
```

- Kalau sebuah komponen butuh nilai yang benar-benar berbeda antara mode, tambahkan
  override token di blok `.dark` di `globals.css` — bukan warna langsung di komponen.
- Uji minimal dua mode sebelum menyatakan selesai: komponen baru yang readable di
  ivory warm light bisa hilang di dark.

## 6. Hover / Focus / Disabled

Setiap elemen interaktif wajib punya ketiganya. Pola yang sudah dipakai
`src/components/ui/button.tsx`:

| State | Pola |
| --- | --- |
| Focus | `focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:border-ring` |
| Hover | `hover:bg-muted hover:text-foreground` atau `hover:bg-primary/80` |
| Disabled | `disabled:pointer-events-none disabled:opacity-50` |
| Invalid | `aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50` |
| Active | `active:not-aria-[haspopup]:translate-y-px` |

- Gunakan `focus-visible:`, bukan `focus:`, agar tidak ada ring saat mouse click.
- Tomcat validasi form ditangani `FormLabel`/`FormMessage` di `src/components/ui/form.tsx`
  (label bergeser ke warna destructive) — jangan mengimplementasikan ulang error per field.
- Loading: `disabled` + ikon spinner `Loader2` dengan `animate-spin`, plus
  `aria-busy` pada `<form>` (lihat `login-form.tsx:115`).
- Placeholder harus lebih redup dari input (`placeholder:text-muted-foreground`).

## 7. Responsive

- Mobile first: base tanpa prefix, tambahkan `sm:`/`md:`/`lg:`/`xl:` naik.
- Breakpoint yang lazim di repo: `md:grid-cols-2`, `xl:grid-cols-3` untuk grid panel;
  sidebar/sheet memakai trigger `Sheet` di layar kecil (`src/components/ui/sheet.tsx`).
- Tabel: bungkus dengan `overflow-x-auto`/scroll container; jangan memaksa tabel
  mengecil dengan font kecil.
- Navbar publik dan header dashboard: sembunyikan item non-esensial di `<md:`
  dan sisakan navigasi mobile.
- Target sentuh minimal `size-10`/`h-10` untuk kontrol utama form.
- Gambar/avatar: pakai `next/image`; grafik (`recharts`) wajib invalidate ukuran saat
  container berubah agar tidak overflow.

## 8. Animasi + `motion-reduce`

- Animasi masuk yang sudah ada: `reveal-up` keyframes + kelas
  `.animate-reveal`, `.animate-reveal-delay-1..4` (`globals.css:149-157`).
  Delay 0.1s, 0.2s, 0.3s, 0.4s; durasi 0.7s; easing `cubic-bezier(0.16, 1, 0.3, 1)`.
- `@media (prefers-reduced-motion: reduce)` sudah mematikan semua `.animate-reveal*`.
- Untuk transisi yang ditulis manual di JSX, tambahkan pasangan `motion-reduce:`.
  Ini pola yang dipakai repo:

```tsx
<ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" />
<div className="transition-transform hover:rotate-0 motion-reduce:transition-none" />
<button className="active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100" />
```

- Kalau menambah `@keyframes` atau `@utility` baru, tambahkan juga segmen
  `motion-reduce` di `globals.css` atau pasangan `motion-reduce:*` di class.
- Jangan menganimasikan property yang mahal (mis. `width`) (width/height/filter); pakai
  `transform` dan `opacity`.

## 9. `cn()` untuk Class Conditional

- Merge class pakai `cn` dari package `cn` (bukan `@/lib/utils` — file itu **tidak ada**
  di repo, meski alias `utils` di `components.json` masih menunjuk sana):

```tsx
import { cn } from "cn";

<div className={cn("rounded-lg border p-4", isActive && "bg-primary/10", className)} />
<Badge className={cn("gap-1", tone === "critical" && "bg-destructive/10 text-destructive")} />
```

- Untuk varian komponen, pakai `class-variance-authority` (`cva` + `VariantProps`)
  seperti di `src/components/ui/button.tsx` dan `badge.tsx` — jangan membuat
  objek variant sendiri.
- Styling inline hanya untuk nilai dinamis yang tidak diketahui saat build
  (mis. warna theme dari `appearance.ts`).

## 10. Jangan

- Jangan hex, `rgb()`, atau arbitrary value untuk warna: `bg-[#10b981]`, `text-emerald-600`, `bg-[var(--primary)]` sebagai pengganti `bg-primary`.
- Jangan bikin token warna/sizing kedua; kalau butuh nilai baru, tambahkan ke `:root` **dan** `.dark` **dan** petakan di `@theme inline`.
- Jangan hardcode emerald di komponen; emerald itu nilai *preset*, bukan identitas warna action/keberhasilan. Pakai `text-destructive`, `risk-*`, atau badge variant.
- Jangan `asChild` (Base UI pakai `render={<Link … />}`).
- Jangan membuat sistem radius baru; pakai skala Tailwind (`rounded-md/lg/xl`).
- Jangan menaruh `<main>` ganda di dalam `PageShell`/`AuthShell`/layout `(public)`.
- Jangan ubah style global untuk menyelesaikan satu komponen; pakai variant, wrapper, atau class terisolasi.
- Jangan lupa state `hover`, `focus-visible`, `disabled`, `loading`, `empty`, `error` saat menambah elemen interaktif baru.
- Jangan animasi tanpa pasangan `motion-reduce`.
- Jangan copy langsung seluruh isi komponen `src/components/ui/**`; perlakukan sebagai upstream code dan taruh variasi di `src/components/custom/`.
- Jangan skip `npm run lint` dan `npm run build` setelah mengubah styling.
