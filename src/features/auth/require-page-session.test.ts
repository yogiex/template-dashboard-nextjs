import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

import { AppError } from "@/lib/error";
import type { SessionUser } from "@/lib/rbac";

const redirectMock = vi.hoisted(() => vi.fn<(path: string) => never>());

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

const rbac = vi.hoisted(() => ({
  requireSession: vi.fn(),
  requireSessionForDev: vi.fn(),
}));

vi.mock("@/lib/rbac", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/rbac")>();

  return {
    ...actual,
    requireSession: rbac.requireSession,
    requireSessionForDev: rbac.requireSessionForDev,
  };
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

function unauthenticated(): AppError {
  return new AppError("UNAUTHENTICATED", { message: "Sesi tidak ditemukan." });
}

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
  rbac.requireSession.mockReset();
  rbac.requireSessionForDev.mockReset();
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
    rbac.requireSessionForDev.mockRejectedValue(unauthenticated());
    redirectMock.mockImplementation(throwRedirectLikeNext);

    const { requirePageSessionForDev } = await import(
      "@/features/auth/require-page-session"
    );

    const settled = await requirePageSessionForDev().then(
      () => null,
      (error: unknown) => error,
    );

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
    expect(settled).toBeInstanceOf(Error);
    expect((settled as { digest?: string }).digest).toBe(
      "NEXT_REDIRECT;replace;/login;307;",
    );
  });

  it.each([
    ["FORBIDDEN", new AppError("FORBIDDEN", { message: "Akses tidak diizinkan." })],
    ["RATE_LIMITED", new AppError("RATE_LIMITED")],
    ["VALIDATION_ERROR", new AppError("VALIDATION_ERROR")],
    ["Error biasa", new Error("database tidak merespons")],
    ["string yang bukan Error", "bukan error sama sekali"],
  ])("melempar ulang %s tanpa redirect", async (_label, thrown) => {
    redirectMock.mockImplementation(throwRedirectLikeNext);
    rbac.requireSessionForDev.mockRejectedValue(thrown);

    const { requirePageSessionForDev } = await import(
      "@/features/auth/require-page-session"
    );

    await expect(requirePageSessionForDev()).rejects.toBe(thrown);
    expect(redirectMock).not.toHaveBeenCalled();
  });
});

describe("requirePageSession", () => {
  it("mengembalikan sesi tanpa redirect saat guard berhasil", async () => {
    const session: SessionUser = { id: "usr_1", role: "admin" };

    rbac.requireSession.mockResolvedValue(session);
    redirectMock.mockImplementation(throwRedirectLikeNext);

    const { requirePageSession } = await import("@/features/auth/require-page-session");

    await expect(requirePageSession()).resolves.toEqual(session);
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("tidak memakai affordance dev", async () => {
    rbac.requireSession.mockResolvedValue({ id: "usr_1", role: "viewer" });

    const { requirePageSession } = await import("@/features/auth/require-page-session");

    await requirePageSession();

    expect(rbac.requireSession).toHaveBeenCalledTimes(1);
    expect(rbac.requireSessionForDev).not.toHaveBeenCalled();
  });

  it("melempar AppError UNAUTHENTICATED, bukan error lain, dari guard", async () => {
    rbac.requireSession.mockRejectedValue(unauthenticated());
    redirectMock.mockImplementation(throwRedirectLikeNext);

    const { requirePageSession } = await import("@/features/auth/require-page-session");

    const settled = await requirePageSession().then(
      () => null,
      (error: unknown) => error,
    );

    expect(redirectMock).toHaveBeenCalledTimes(1);
    expect((settled as { digest?: string }).digest).toBe(
      "NEXT_REDIRECT;replace;/login;307;",
    );
  });

  it("redirect ke /login saat guard menolak dengan UNAUTHENTICATED", async () => {
    redirectMock.mockImplementation(throwRedirectLikeNext);
    rbac.requireSession.mockRejectedValue(unauthenticated());

    const { requirePageSession } = await import("@/features/auth/require-page-session");

    const settled = await requirePageSession().then(
      () => null,
      (error: unknown) => error,
    );

    expect(redirectMock).toHaveBeenCalledTimes(1);
    expect(redirectMock).toHaveBeenCalledWith("/login");
    expect(settled).toBeInstanceOf(Error);
    expect((settled as { digest?: string }).digest).toBe(
      "NEXT_REDIRECT;replace;/login;307;",
    );
  });

  it.each([
    ["FORBIDDEN", new AppError("FORBIDDEN", { message: "Akses tidak diizinkan." })],
    ["RATE_LIMITED", new AppError("RATE_LIMITED")],
    ["VALIDATION_ERROR", new AppError("VALIDATION_ERROR")],
    ["Error biasa", new Error("database tidak merespons")],
    ["string yang bukan Error", "bukan error sama sekali"],
  ])("melempar ulang %s tanpa redirect", async (_label, thrown) => {
    redirectMock.mockImplementation(throwRedirectLikeNext);
    rbac.requireSession.mockRejectedValue(thrown);

    const { requirePageSession } = await import("@/features/auth/require-page-session");

    await expect(requirePageSession()).rejects.toBe(thrown);
    expect(redirectMock).not.toHaveBeenCalled();
  });
});

describe("(dashboard)/layout guard", () => {
  it("melempar redirect-like error saat tidak ada sesi", async () => {
    redirectMock.mockImplementation(throwRedirectLikeNext);
    rbac.requireSession.mockRejectedValue(unauthenticated());

    const { default: DashboardLayout } = await import("@/app/(dashboard)/layout");

    const settled = await DashboardLayout({ children: null }).then(
      () => null,
      (error: unknown) => error,
    );

    expect(rbac.requireSession).toHaveBeenCalledTimes(1);
    expect(rbac.requireSessionForDev).not.toHaveBeenCalled();
    expect(redirectMock).toHaveBeenCalledTimes(1);
    expect(redirectMock).toHaveBeenCalledWith("/login");
    expect(settled).toBeInstanceOf(Error);
    expect((settled as { digest?: string }).digest).toBe(
      "NEXT_REDIRECT;replace;/login;307;",
    );
  });

  it("merender shell saat sesi valid", async () => {
    const session: SessionUser = { id: "usr_1", role: "admin" };

    rbac.requireSession.mockResolvedValue(session);

    const { default: DashboardLayout } = await import("@/app/(dashboard)/layout");

    const tree = (await DashboardLayout({ children: null })) as ReactElement;

    expect(tree.type).toBe(shell.SidebarProvider);
    expect(collectTypes(tree)).toEqual(
      expect.arrayContaining([shell.AppSidebar, shell.SiteHeader, "div"]),
    );
    expect(collectTypes(tree)).not.toContain("main");
  });

  it("memaksa subtree dashboard dirender per request", async () => {
    const layout = await import("@/app/(dashboard)/layout");

    expect(layout.dynamic).toBe("force-dynamic");
  });

  it("tetap menandai subtree dashboard sebagai noindex", async () => {
    const layout = await import("@/app/(dashboard)/layout");

    expect(layout.metadata.robots).toEqual({ index: false, follow: false });
  });
});
