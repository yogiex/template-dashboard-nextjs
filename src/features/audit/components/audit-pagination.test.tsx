import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  AuditPagination,
  type AuditPaginationProps,
} from "@/features/audit/components/audit-pagination";

function paginationProps(
  overrides: Partial<AuditPaginationProps> = {},
): AuditPaginationProps {
  return {
    page: 2,
    totalPages: 5,
    total: 120,
    pageSize: 25,
    baseQuery: "category=auth&action=user.login",
    ...overrides,
  };
}

function linkHref(name: string): string {
  const link = screen.getByRole("link", { name });
  const href = link.getAttribute("href");

  if (href === null) {
    throw new Error(`Tautan "${name}" tidak punya href`);
  }

  return href;
}

describe("AuditPagination", () => {
  it("mempertahankan parameter filter di kedua arah navigasi", () => {
    render(<AuditPagination {...paginationProps()} />);

    expect(linkHref("Sebelumnya")).toBe(
      "/settings/audit?category=auth&action=user.login",
    );
    expect(linkHref("Berikutnya")).toBe(
      "/settings/audit?category=auth&action=user.login&page=3",
    );
  });

  it("tidak menulis page=1 karena halaman pertama adalah default", () => {
    render(<AuditPagination {...paginationProps({ page: 2 })} />);

    expect(linkHref("Sebelumnya")).not.toContain("page=");
  });

  it("menuliskan query kosong sebagai path polos", () => {
    render(<AuditPagination {...paginationProps({ baseQuery: "" })} />);

    expect(linkHref("Berikutnya")).toBe("/settings/audit?page=3");
  });

  it("menghapus page lama yang mungkin ikut di baseQuery", () => {
    render(
      <AuditPagination
        {...paginationProps({ baseQuery: "category=auth&page=4" })}
      />,
    );

    expect(linkHref("Berikutnya")).toBe("/settings/audit?category=auth&page=3");
  });

  it("merender null saat hanya ada satu halaman", () => {
    const { container } = render(
      <AuditPagination {...paginationProps({ page: 1, totalPages: 1 })} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("menampilkan ringkasan dan posisi halaman dari template config", () => {
    render(<AuditPagination {...paginationProps()} />);

    expect(screen.getByText("Menampilkan 26–50 dari 120 event")).toBeInTheDocument();
    expect(screen.getByText("2 / 5")).toBeInTheDocument();
  });

  it("menonaktifkan arah yang tidak tersedia", () => {
    render(<AuditPagination {...paginationProps({ page: 1, total: 30 })} />);

    expect(screen.getByRole("link", { name: "Berikutnya" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Sebelumnya" })).toBeNull();
    expect(screen.getByRole("button", { name: /Sebelumnya/ })).toBeDisabled();
  });
});
