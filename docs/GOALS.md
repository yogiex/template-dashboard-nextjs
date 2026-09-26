# GOALS — Visi & Objective Template

> Dokumen ini menjawab satu pertanyaan: **template ini untuk menjadi apa?**
> Semua keputusan teknis (SPRINT.md, ARCHITECTURE.md) harus selaras dengan
> goals di sini. Jika ada konflik, ubah dokumen ini dulu, baru kodenya.

---

## 1. Visi

Membangun **template dashboard Next.js yang dikelola seperti CMS**:
pengguna template tidak perlu menyentuh source code untuk melakukan
kustomisasi umum. Semua yang lazim berubah antar project — nama app,
favicon, navigasi sidebar, konten halaman — dapat diatur melalui
**satu sistem settings** yang terpusat, baik lewat file config (fase 1)
maupun lewat halaman dashboard settings (fase 2).

**Kalimat kunci:**

> "Clone → atur via settings → jadi aplikasi baru."
> Bukan "Clone → cari-cari kode → edit 20 file → doa."

---

## 2. Objective Utama

### 🎯 Objective 1 — Branding Fully Configurable

Identitas website dapat diganti TANPA menyentuh komponen.

| Kemampuan | Detail | Prioritas |
|---|---|---|
| Ganti nama website | Nama app di sidebar, topbar, login, title browser (`<title>`), metadata | 🔴 P0 |
| Ganti favicon | Upload/replace favicon.ico + ikon PWA (192/512px), apple-touch-icon | 🔴 P0 |
| Ganti logo | Logo sidebar & halaman login (SVG/PNG), fallback inisial otomatis | 🟡 P1 |
| Ganti tagline & deskripsi | `siteConfig.description`, meta description, og tags | 🔴 P0 |
| Ganti warna tema (brand color) | Primary color via CSS variables — tersimpan di settings | 🟢 P2 |
| Ganti domain/URL | `NEXT_PUBLIC_APP_URL` → mempengaruhi metadataBase, sitemap, robots | 🔴 P0 |

**Sumber kebenaran:** `src/config/site.ts` (fase 1) → tabel `settings`
di database (fase 2). Komponen TIDAK berubah di antara fase.

### 🎯 Objective 2 — Sidebar Sebagai CMS

Sidebar dikelola seperti menu manager di CMS umum: tambah, ubah, urutkan,
sembunyikan item — termasuk sub-item bertingkat.

| Kemampuan | Detail | Prioritas |
|---|---|---|
| Tambah item menu | Judul, href, ikon (dari icon picker), badge | 🔴 P0 |
| Tambah sub-item (nested) | Menu dengan children, collapsible di sidebar (SidebarMenuSub) | 🔴 P0 |
| Ganti urutan item | Drag & drop reorder | 🟡 P1 |
| Edit item | Ubah judul/href/ikon/badge tanpa buat baru | 🔴 P0 |
| Hapus/sembunyikan item | Soft disable (`disabled`) atau sembunyikan total | 🔴 P0 |
| Grup menu | Kelompokkan item dalam section berlabel (sudah ada: `NavGroup`) | 🔴 P0 |
| Item aktif vs tidak | Item bisa ditandai nonaktif tanpa dihapus | 🟢 P2 |
| Visibilitas per-role | Menu hanya tampil untuk role tertentu (terkait RBAC) | 🟢 P2 |

**Skema data target (fase 2 — tabel `navigation_items`):**

```
id          (pk)
parent_id   (nullable — null = item level 1, terisi = sub-item)
title       (string)
href        (string, nullable jika group)
icon        (string — nama ikon, di-map via icon map)
badge       (string, nullable)
sort_order  (integer)
group       (string — nama section)
is_visible  (boolean)
roles       (array — role yang boleh melihat; kosong = semua)
```

**Aturan desain yang sudah terlanjur benar sejak fase 1:**
- Ikon disimpan sebagai STRING (JSON-serializable) — bukan komponen React
- Struktur `NavGroup[]` dengan `items[]` sudah mendukung nesting
- Sidebar membaca dari config lewat satu import — ganti sumber data =
  ganti satu fungsi service

### 🎯 Objective 3 — Konten Halaman Dapat Diatur (Page CMS)

Konten yang "copywriting-ish" tidak boleh hardcode di komponen.

| Konten | Sudah config-driven? | Prioritas CMS (DB) |
|---|---|---|
| Halaman login (teks, label, highlight, footer) | ✅ `loginPageConfig` | 🔴 P0 — jadi alasan fitur settings pertama |
| Landing page (hero, features, CTA) | ✅ `landingConfig` | 🟡 P1 |
| Legal pages (terms, privacy) | ✅ `termsDoc`/`privacyDoc` | 🟡 P1 |
| Halaman 404/error text | ✅ inline komponen | 🟢 P2 |
| Email templates | 🔲 belum ada | 🟢 P2 (Sprint email) |

### 🎯 Objective 4 — Halaman Settings di Dashboard (CMS Panel)

Tempat semua pengaturan di atas dikelola. Terdiri dari tab:

| Tab | Isi | Prioritas |
|---|---|---|
| **General** | Nama app, tagline, deskripsi, URL, favicon & logo upload | 🔴 P0 |
| **Navigation** | Menu manager sidebar (tambah/edit/hapus/reorder/nested) | 🔴 P0 |
| **Login Page** | Editor konten halaman login (CMS yang diminta di requirement) | 🔴 P0 |
| **Appearance** | Tema default, brand color (P2) | 🟢 P2 |
| **Users & Roles** | User CRUD + referensi UI role/permission; enforcement RBAC nyata memerlukan backend auth | 🟡 P1 |

**Prasyarat teknis CMS panel:**
1. Auth + RBAC jalan (hanya `admin` boleh akses settings) — SECURITY.md §1
2. Database + tabel `settings` (key-value atau terstruktur)
3. File upload (favicon/logo) — validasi tipe & ukuran, simpan aman
4. Preview perubahan sebelum publish (opsional P2)
5. Audit log setiap perubahan settings — SECURITY.md §7

### 🎯 Objective 5 — Tetap Aman & Robust (Non-Negotiable)

CMS berarti app mengeksekusi data yang diedit manusia. Aturan ini TIDAK
boleh dikompromikan demi kemudahan kustomisasi:

1. **Semua input settings divalidasi Zod di server** — termasuk href
   menu (hanya path relatif atau URL whitelist; cegah `javascript:` URI)
2. **Upload file divalidasi keras** — tipe MIME + magic bytes + ukuran
   maks; favicon/logo disimpan di storage terkontrol, bukan dieksekusi
3. **Config dari DB tetap lolos schema Zod saat dibaca** — data korup
   di DB ≠ app crash; fallback ke default config
4. **RBAC ketat** — hanya admin boleh ubah settings & navigasi
5. **Error handling RFC 9457** — semua action settings pakai envelope
   taxonomy yang sudah ada

---

## 3. Fase Pengerjaan

```
FASE 1 (SEKARANG) — Config-driven foundation
├── Semua konten dibaca dari src/config/*.ts
├── Skema Zod untuk tiap config (siap jadi kontrak DB)
├── Layout dashboard, halaman publik, auth UI
└── Output: ganti config file = ganti identitas app

FASE 2 — Settings panel (CMS)
├── Database + tabel settings & navigation_items
├── Halaman /settings (tab General, Navigation, Login Page)
├── Server actions CRUD settings (Zod + RBAC + audit log)
└── Output: atur semuanya dari dashboard, tanpa deploy ulang

FASE 3 — Polishing CMS
├── Drag & drop reorder menu
├── Brand color picker + preview live
├── Multi-halaman content editor (landing, legal)
└── Export/import settings (portability antar project —
    nilai plus besar untuk template yang di-recycle)
```

**Prinsip migrasi antar fase:** setiap config file di fase 1 WAJIB
punya skema Zod + default values. Fase 2 hanya mengganti SUMBER data
(file → DB), skema dan komponen tetap. Tidak boleh ada refactor besar
saat transisi fase.

---

## 4. Success Criteria — Template Layak Disebut "CMS-like"

Template dinyatakan mencapai tujuan jika, untuk project baru:

- [ ] Ganti nama website + tagline + favicon: **≤ 5 menit**, tanpa sentuh komponen
- [ ] Tambah menu sidebar + sub-item: **tanpa edit kode sama sekali** (fase 2: lewat UI; fase 1: edit satu file config)
- [ ] Ubah seluruh konten halaman login: **edit satu objek config**
- [ ] Semua perubahan tervalidasi & gagal-aman (config rusak → fallback default, bukan crash)
- [ ] Tidak ada satu pun teks UI hardcode di komponen (audit grep terhadap string literal di komponen layout)
- [ ] Semua fitur settings hanya diakses admin (RBAC teruji)

---

## 5. Out of Scope (sengaja TIDAK menjadi tujuan)

Agar fokus terjaga, hal berikut BUKAN target template ini:

- ❌ Page builder drag-and-drop (seperti Wix/Webflow) — kita CMS untuk
  *konfigurasi & konten*, bukan visual builder layout
- ❌ Multi-tenant (satu deployment banyak organisasi) — template ini
  satu app per project; multi-tenant mengubah arsitektur fundamental
- ❌ Plugin/extension system pihak ketiga
- ❌ Headless CMS eksternal (Strapi/Sanity/Payload) sebagai dependensi —
  settings sistem internal, self-contained
- ❌ Tooling untuk maintainer (visualisasi dependency di
  `/settings/code-graph`) — alat bantu membaca arsitektur kode, bukan
  kemampuan CMS yang dipakai pengguna template. Tidak masuk success criteria
  §4 dan tidak boleh memengaruhi batas keamanan Objective 5.

---

## 6. Relasi ke Dokumen Lain

| Dokumen | Dampak goals ini |
|---|---|
| `SPRINT.md` | Fase 1 = Sprint 0–3 yang ada; fase 2 = sprint baru setelah auth+DB |
| `ARCHITECTURE.md` | Tambah kontrak: "UI membaca konten dari config/settings, tidak hardcode" |
| `SECURITY.md` | Tambah §validasi settings & upload (objective 5) |
| `CLAUDE.md` | Tambah aturan: "Semua teks/nav/konten dari config — dilarang hardcode di komponen" |
| `SPRINT.md` | Sprint F7 mencatat code dependency graph sebagai tooling, bukan bagian dari CMS goals |
