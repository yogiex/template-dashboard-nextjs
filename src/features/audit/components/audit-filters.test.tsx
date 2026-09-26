import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AUDIT_PAGE_CONFIG } from "@/config/audit-page";
import { AuditFilters } from "@/features/audit/components/audit-filters";

const router = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams(window.location.search),
  usePathname: () => AUDIT_PAGE_CONFIG.basePath,
}));

function setUrl(search: string): void {
  window.history.replaceState(
    null,
    "",
    search ? `${AUDIT_PAGE_CONFIG.basePath}?${search}` : AUDIT_PAGE_CONFIG.basePath,
  );
}

function navigatedUrl(): string {
  expect(router.replace).toHaveBeenCalledTimes(1);

  return router.replace.mock.calls[0]?.[0] as string;
}

async function chooseOption(
  user: ReturnType<typeof userEvent.setup>,
  triggerLabel: string,
  optionLabel: string,
): Promise<void> {
  await user.click(screen.getByRole("combobox", { name: triggerLabel }));
  await user.click(await screen.findByRole("option", { name: optionLabel }));
}

/**
 * Base UI merender `Select` lewat portal + transition, jadi interaksi di jsdom
 * bisa melewati default 5 detik ketika suite dijalankan paralel. Timeout di
 * bawah memperhitungkan biaya portal itu, bukan menutupi bug.
 */
const INTERACTION_TIMEOUT = 15_000;

describe("AuditFilters", () => {
  beforeEach(() => {
    // `navigatedUrl()` menghitung jumlah panggilan, jadi mock harus dibersihkan
    // lebih dulu atau test berikutnya ikut gagal.
    vi.clearAllMocks();
    setUrl("");
  });

  it(
    "mendorong URL baru tanpa page saat kategori berubah",
    { timeout: INTERACTION_TIMEOUT },
    async () => {
    const user = userEvent.setup();

    setUrl("page=3");

    render(<AuditFilters initialCategory="" />);

    await chooseOption(user, AUDIT_PAGE_CONFIG.filters.categoryLabel, "Auth");

    const url = navigatedUrl();

    expect(url).toBe(`${AUDIT_PAGE_CONFIG.basePath}?category=auth`);
    expect(url).not.toContain("page=");
  });

  it(
    "memilih opsi all menghapus key kategori dari URL",
    { timeout: INTERACTION_TIMEOUT },
    async () => {
    const user = userEvent.setup();

    setUrl("category=auth");

    render(<AuditFilters initialCategory="auth" />);

    await chooseOption(
      user,
      AUDIT_PAGE_CONFIG.filters.categoryLabel,
      AUDIT_PAGE_CONFIG.filters.categoryAll,
    );

    expect(navigatedUrl()).toBe(AUDIT_PAGE_CONFIG.basePath);
  });

  it(
    "mempertahankan filter lain saat satu filter diubah",
    { timeout: INTERACTION_TIMEOUT },
    async () => {
    const user = userEvent.setup();

    setUrl("severity=critical");

    render(<AuditFilters initialSeverity="critical" />);

    await chooseOption(user, AUDIT_PAGE_CONFIG.filters.resultLabel, "Gagal");

    expect(navigatedUrl()).toBe(
      `${AUDIT_PAGE_CONFIG.basePath}?severity=critical&result=failure`,
    );
  });

  it(
    "Reset menavigasi ke path polos tanpa query",
    { timeout: INTERACTION_TIMEOUT },
    async () => {
    const user = userEvent.setup();

    setUrl("category=auth&action=user.login&page=4");

    render(<AuditFilters initialCategory="auth" initialAction="user.login" />);

    await user.click(
      screen.getByRole("button", { name: AUDIT_PAGE_CONFIG.filters.reset }),
    );

    expect(router.replace).toHaveBeenCalledWith(AUDIT_PAGE_CONFIG.basePath, {
      scroll: false,
    });
  });

  it("menyembunyikan tombol Reset saat tidak ada filter aktif", () => {
    render(<AuditFilters />);

    expect(
      screen.queryByRole("button", { name: AUDIT_PAGE_CONFIG.filters.reset }),
    ).toBeNull();
  });

  it("menampilkan tombol Reset saat actorId hanya filter aktif dari URL", () => {
    render(<AuditFilters initialActorId="usr_1" />);

    expect(
      screen.getByRole("button", { name: AUDIT_PAGE_CONFIG.filters.reset }),
    ).toBeInTheDocument();
  });
});
