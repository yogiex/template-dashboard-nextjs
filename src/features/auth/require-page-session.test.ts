import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

import { AppError } from "@/lib/error";
import type { SessionUser } from "@/lib/rbac";

/**
 * Test untuk guard session route segment: `requirePageSessionForDev()` dan
 * pemakaiannya di `(dashboard)/layout.tsx`.
 *
 * `next/navigation` dimock karena `redirect()` melempar error kontrol; kalau
 * mock-nya tidak melempar, test redirect jadi tidak menguji apa pun. Komponen
 * shell juga dimock supaya layout bisa dipanggil tanpa SidebarProvider/Base UI.
 */

const redirectMock = vi.hoisted(() => vi.fn<(path: string) => never>());

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

const rbac = vi.hoisted(() => ({
  requireSessionForDev: vi.fn(),
}));

vi.mock("@/lib/rbac", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/rbac")>();

  return { ...actual, requireSessionForDev: rbac.requireSessionForDev };
});

const shell = vi.hoisted(() => ({
  AppSidebar: vi.fn(() => null),
  SiteHeader: vi.fn(() => null),
  SidebarProvider: vi.fn(() => null),
}));

vi.mock("@/components/layout/app-sidebar", () => ({
  AppSidebar: shell.AppSidebar,
}));
vi.mock("@/components/layout/site-header", () => ({
  SiteHeader: shell.SiteHeader,
}));
vi.mock("@/components/ui/sidebar", () => ({
  SidebarProvider: shell.SidebarProvider,
}));

/** Guard gagal tertutup dengan `AppError`, seperti `requireSession()` asli. */
function unauthenticated(): AppError {
  return new AppError("UNAUTHENTICATED", { message: "Sesi tidak ditemukan." });
}

/** Semua error yang BUKAN `UNAUTHENTICATED` harus jatuh ke jalur lempar ulang. */
const NON_UNAUTHENTICATED: Array<[string, unknown]> = [
  ["FORBIDDEN", new AppError("FORBIDDEN", { message: "Akses tidak diizinkan." })],
  ["RATE_LIMITED", new AppError("RATE_LIMITED")],
  ["VALIDATION_ERROR", new AppError("VALIDATION_ERROR")],
  ["Error biasa", new Error("database tidak merespons")],
  ["string yang bukan Error", "bukan error sama sekali"],
];

/** Tirukan `redirect()` Next: melempar error kontrol, bukan mengembalikan nilai. */
function throwRedirectLikeNext(path: string): never {
  const error = new Error("NEXT_REDIRECT");

  Object.assign(error, { digest: `NEXT_REDIRECT;replace;${path};307;` });

  throw error;
}

function collectTypes(node: ReactElement | null, found: unknown[] = []): unknown[] {
  if (!node || typeof node !== "object" || !("type" in node)) {
    return found;
  }

  found.push((node as { type: unknown }).type);
  const children = (node as { props?: { children?: unknown } }).props?.children;
  const list = Array.isArray(children) ? children : [children];

  for (const child of list) {
    if (child && typeof child === "object") {
      collectTypes(child as ReactElement, found);
    }
  }

  return found;
}

afterEach(() => {
  redirectMock.mockReset();
});

describe("requirePageSessionForDev", () => {
  it("mengembalikan sesi tanpa redirect saat guard berhasil", async () => {
    const session: SessionUser = { id: "usr_1", role: "admin" };

    rbac.requireSessionForDev.mockResolvedValue(session);
    redirectMock.mockImplementation(throwRedirectLikeNext);

    const { requirePageSessionForDev } = await import(
      "@/features/auth/require-page-session"
    );

    await expect(requirePageSessionForDev()).resolves.toEqual(session);
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("melempar AppError UNAUTHENTICATED, bukan error lain, dari guard", async () => {
    // Guard-nya sudah diuji di `rbac.test.ts`; yang diperiksa di sini hanya
    // bahwa helper meneruskan error itu apa adanya ke `catch` (tidak dibungkus,
    // tidak jadi `Error` generik) sehingga hanya `UNAUTHENTICATED` yang
    // diterjemahkan menjadi redirect.
    rbac.requireSessionForDev.mockRejectedValue(unauthenticated());
    redirectMock.mockImplementation(throwRedirectLikeNext);

    const { requirePageSessionForDev } = await import(
      "@/features/auth/require-page-session"
    );

    const settled = await requirePageSessionForDev().then(
      () => null,
      (error: unknown) => error,
    );

    // `AppError` dikenali, jadi diterjemahkan jadi redirect; hasil akhirnya
    // error kontrol Next.
    expect(redirectMock).toHaveBeenCalledTimes(1);
    expect((settled as { digest?: string }).digest).toBe(
      "NEXT_REDIRECT;replace;/login;307;",
    );
  });

  it("redirect ke /login saat guard menolak dengan UNAUTHENTICATED", async () => {
    redirectMock.mockImplementation(throwRedirectLikeNext);
    rbac.requireSessionForDev.mockRejectedValue(unauthenticated());

    const { requirePageSessionForDev } = await import(
      "@/features/auth/require-page-session"
    );

    const settled = await requirePageSessionForDev().then(
      () => null,
      (error: unknown) => error,
    );

    expect(redirectMock).toHaveBeenCalledTimes(1);
    expect(redirectMock).toHaveBeenCalledWith("/login");
    // Error kontrol Next harus menembus apa adanya. Kalau helper memanggil
    // `redirect()` di dalam `try`, error ini tertangkap `catch` lalu dilempar
    // ulang sebagai crash biasa — dan di sinilah test itu gagal.
    expect(settled).toBeInstanceOf(Error);
    expect((settled as { digest?: string }).digest).toBe(
      "NEXT_REDIRECT;replace;/login;307;",
    );
  });

  it.each(NON_UNAUTHENTICATED)(
    "melempar ulang %s tanpa redirect",
    async (_label, thrown) => {
      redirectMock.mockImplementation(throwRedirectLikeNext);
      rbac.requireSessionForDev.mockRejectedValue(thrown);

      const { requirePageSessionForDev } = await import(
        "@/features/auth/require-page-session"
      );

      await expect(requirePageSessionForDev()).rejects.toBe(thrown);
      expect(redirectMock).not.toHaveBeenCalled();
    },
  );
});

describe("(dashboard)/layout guard", () => {
  it("menjalankan guard sebelum merender shell", async () => {
    redirectMock.mockImplementation(throwRedirectLikeNext);
    rbac.requireSessionForDev.mockRejectedValue(unauthenticated());

    const { default: DashboardLayout } = await import("@/app/(dashboard)/layout");

    const settled = await DashboardLayout({ children: null }).then(
      () => null,
      (error: unknown) => error,
    );

    expect(redirectMock).toHaveBeenCalledWith("/login");
    expect(rbac.requireSessionForDev).toHaveBeenCalledTimes(1);
    // Redirect terjadi sebelum `SidebarProvider`/sidebar/header dirender.
    expect(shell.SidebarProvider).not.toHaveBeenCalled();
    expect(shell.AppSidebar).not.toHaveBeenCalled();
    expect(shell.SiteHeader).not.toHaveBeenCalled();
    expect((settled as { digest?: string }).digest).toBe(
      "NEXT_REDIRECT;replace;/login;307;",
    );
  });

  it("tidak menutupi FORBIDDEN atau crash sebagai 'silakan login'", async () => {
    redirectMock.mockImplementation(throwRedirectLikeNext);
    rbac.requireSessionForDev.mockRejectedValue(
      new AppError("FORBIDDEN", { message: "Akses tidak diizinkan." }),
    );

    const { default: DashboardLayout } = await import("@/app/(dashboard)/layout");

    await expect(DashboardLayout({ children: null })).rejects.toThrow(AppError);
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("merender shell yang sama seperti sebelumnya saat guard lolos", async () => {
    redirectMock.mockImplementation(throwRedirectLikeNext);
    rbac.requireSessionForDev.mockResolvedValue({ id: "usr_1", role: "admin" });

    const { default: DashboardLayout } = await import("@/app/(dashboard)/layout");

    const tree = (await DashboardLayout({ children: null })) as ReactElement;

    // Struktur JSX tidak berubah: SidebarProvider > [AppSidebar, wrapper(header, children)]
    expect(tree.type).toBe(shell.SidebarProvider);
    expect(collectTypes(tree)).toEqual(
      expect.arrayContaining([shell.AppSidebar, shell.SiteHeader, "div"]),
    );
    // `PageShell` yang menyediakan `<main>`; layout ini tidak boleh menambahkannya.
    expect(collectTypes(tree)).not.toContain("main");
  });

  it("menandai subtree dashboard sebagai force-dynamic", async () => {
    const layout = await import("@/app/(dashboard)/layout");

    // Shell terautentikasi tidak boleh jadi file statis yang bisa dipakai ulang.
    expect(layout.dynamic).toBe("force-dynamic");
    // Metadata export harus tetap ada.
    expect(layout.metadata.robots).toEqual({ index: false, follow: false });
  });
});
