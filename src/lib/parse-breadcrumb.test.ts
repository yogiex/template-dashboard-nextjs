import { describe, expect, it } from "vitest";

import {
  MAX_BREADCRUMB_DEPTH,
  MAX_BREADCRUMB_LABEL_LENGTH,
  parseBreadcrumb,
} from "@/lib/parse-breadcrumb";

const NAV = [
  { title: "Beranda", href: "/" },
  { title: "Dashboard", href: "/dashboard" },
  { title: "Pengguna", href: "/dashboard/users" },
];

describe("parseBreadcrumb", () => {
  it("mengembalikan hanya root untuk pathname root", () => {
    expect(parseBreadcrumb("/")).toEqual([{ label: "Home", href: "/" }]);
  });

  it("memakai judul nav sebagai root label ketika tersedia", () => {
    expect(parseBreadcrumb("/", NAV)[0]).toEqual({
      label: "Beranda",
      href: "/",
    });
  });

  it("mengubah segment route menjadi label yang humanized", () => {
    expect(parseBreadcrumb("/log-management/audit_log")).toEqual([
      { label: "Home", href: "/" },
      { label: "Log Management", href: "/log-management" },
      { label: "Audit Log", href: "/log-management/audit_log" },
    ]);
  });

  it("mengabaikan query string dan hash", () => {
    expect(parseBreadcrumb("/dashboard?tab=users#top")).toEqual([
      { label: "Home", href: "/" },
      { label: "Dashboard", href: "/dashboard" },
    ]);
  });

  it("menerima URL absolut dan menghasilkan crumb sesuai pathname", () => {
    expect(parseBreadcrumb("https://app.test/dashboard/users", NAV)).toEqual([
      { label: "Beranda", href: "/" },
      { label: "Dashboard", href: "/dashboard" },
      { label: "Pengguna", href: "/dashboard/users" },
    ]);
  });

  it("membatasi jumlah crumb pada MAX_BREADCRUMB_DEPTH", () => {
    const crumbs = parseBreadcrumb("/a/b/c/d/e/f/g/h");

    expect(MAX_BREADCRUMB_DEPTH).toBe(5);
    expect(crumbs).toHaveLength(MAX_BREADCRUMB_DEPTH);
    expect(crumbs.map((crumb) => crumb.href)).toEqual([
      "/",
      "/a",
      "/a/b",
      "/a/b/c",
      "/a/b/c/d",
    ]);
  });

  it("menghormati opsi maxDepth dan maxLabelLength", () => {
    expect(parseBreadcrumb("/a/b/c", [], {}, { maxDepth: 3 })).toHaveLength(3);

    const short = parseBreadcrumb("/dashboard", NAV, {}, { maxLabelLength: 4 });
    expect(short.at(-1)?.label).toBe("Das…");
  });

  it("mengabaikan maxDepth atau maxLabelLength yang tidak valid", () => {
    for (const maxDepth of [0, -1, 1.5, Number.NaN]) {
      expect(parseBreadcrumb("/a/b/c/d/e/f", [], {}, { maxDepth })).toHaveLength(
        MAX_BREADCRUMB_DEPTH,
      );
    }

    expect(
      parseBreadcrumb("/dashboard", [], {}, { maxLabelLength: 1 }).at(-1)?.label,
    ).toBe("…");
  });

  it("menghapus karakter kontrol dan merapikan spasi pada label", () => {
    const crumbs = parseBreadcrumb("/", [
      { title: "Das\u0000bor\u001f  Utama", href: "/" },
    ]);

    expect(crumbs[0].label).toBe("Das bor Utama");
  });

  it("memotong label panjang dengan ellipsis", () => {
    const longTitle = "Judul halaman yang sangat panjang sekali untuk diuji";
    const crumbs = parseBreadcrumb("/", [{ title: longTitle, href: "/" }]);

    expect(MAX_BREADCRUMB_LABEL_LENGTH).toBe(40);
    expect(crumbs[0].label).toHaveLength(MAX_BREADCRUMB_LABEL_LENGTH);
    expect(crumbs[0].label.endsWith("…")).toBe(true);
  });

  it("memakai manualLabels untuk segment yang sudah di-decode", () => {
    const crumbs = parseBreadcrumb("/user%20name", [], { "user name": "Nama Pengguna" });

    expect(crumbs.at(-1)).toEqual({
      label: "Nama Pengguna",
      href: "/user%20name",
    });
  });

  it("tidak melempar error untuk segment dengan percent-encoding rusak", () => {
    const crumbs = parseBreadcrumb("/%E0%A4%A");

    expect(crumbs).toHaveLength(2);
    expect(crumbs[1]?.href).toBe("/%E0%A4%A");
    expect((crumbs[1]?.label.length ?? 0) > 0).toBe(true);
  });

  it("menangani label unicode tanpa merusak href segment", () => {
    const crumbs = parseBreadcrumb("/pengaturan/prefix", [], { prefix: "Awalan" });

    expect(crumbs.at(-1)).toEqual({ label: "Awalan", href: "/pengaturan/prefix" });
  });

  it("mengembalikan root saja untuk input kosong", () => {
    expect(parseBreadcrumb("")).toEqual([{ label: "Home", href: "/" }]);
    expect(parseBreadcrumb("   ")).toEqual([{ label: "Home", href: "/" }]);
  });

  it("mengabaikan trailing slash saat membentuk crumb", () => {
    const crumbs = parseBreadcrumb("/dashboard/", NAV);

    expect(crumbs).toHaveLength(2);
    expect(crumbs[1].href).toBe("/dashboard");
  });
});

describe("parseBreadcrumb (regresi href dan label)", () => {
  // Dua kegagalan ini pernah dipatok lewat `it.fails` karena akumulasi href
  // disemai dari "/" sehingga menghasilkan "//dashboard". Efeknya dua lapis:
  // crumb non-root punya href protocol-relative yang resolve ke host lain, dan
  // `labelForHref` gagal mencocokkan nav item sehingga judul nav Indonesia
  // tergantikan hasil `humanize()`.
  it("tidak menghasilkan href protocol-relative untuk crumb non-root", () => {
    const crumbs = parseBreadcrumb("/a/b/c");

    expect(crumbs.map((crumb) => crumb.href)).toEqual([
      "/",
      "/a",
      "/a/b",
      "/a/b/c",
    ]);

    for (const crumb of crumbs) {
      expect(crumb.href.startsWith("//")).toBe(false);
    }
  });

  it("memakai judul nav untuk setiap segment yang cocok, bukan humanize", () => {
    expect(parseBreadcrumb("/dashboard/users", NAV)).toEqual([
      { label: "Beranda", href: "/" },
      { label: "Dashboard", href: "/dashboard" },
      { label: "Pengguna", href: "/dashboard/users" },
    ]);
  });

  it("memakai judul nav pada nested route settings", () => {
    const NAV_WITH_SETTINGS = [
      { title: "Beranda", href: "/" },
      { title: "Pengaturan", href: "/settings" },
      { title: "Log Management", href: "/settings/logs" },
    ];

    expect(parseBreadcrumb("/settings/logs/access", NAV_WITH_SETTINGS)).toEqual([
      { label: "Beranda", href: "/" },
      { label: "Pengaturan", href: "/settings" },
      { label: "Log Management", href: "/settings/logs" },
      { label: "Access", href: "/settings/logs/access" },
    ]);
  });
});
