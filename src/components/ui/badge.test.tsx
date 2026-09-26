import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Badge } from "@/components/ui/badge";

describe("Badge", () => {
  it("merender span dengan teks yang diberikan", () => {
    render(<Badge>Aktif</Badge>);

    const badge = screen.getByText("Aktif");

    expect(badge).toBeInTheDocument();
    expect(badge.tagName).toBe("SPAN");
  });

  it("memakai class dasar dan variant default", () => {
    render(<Badge>Default</Badge>);

    const className = screen.getByText("Default").className;

    expect(className).toContain("inline-flex");
    expect(className).toContain("bg-primary");
  });

  it("menerapkan variant destructive tanpa warna hardcode", () => {
    render(<Badge variant="destructive">Ditolak</Badge>);

    const className = screen.getByText("Ditolak").className;

    expect(className).toContain("text-destructive");
    expect(className).toContain("bg-destructive/10");
    expect(className).not.toMatch(/bg-(red|emerald)-\d+/);
  });

  it("menggabungkan className dari pemanggil", () => {
    render(<Badge className="custom-token">Kustom</Badge>);

    const className = screen.getByText("Kustom").className;

    expect(className).toContain("custom-token");
    expect(className).toContain("inline-flex");
  });

  it("menerima elemen lain lewat prop render Base UI", () => {
    render(
      <Badge variant="outline" render={<a href="/dashboard/users" />}>
        Pengguna
      </Badge>,
    );

    const link = screen.getByRole("link", { name: "Pengguna" });

    expect(link).toHaveAttribute("href", "/dashboard/users");
    expect(link.className).toContain("border-border");
  });

  it("mempertahankan interaksi yang dirender sebagai button", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <Badge render={<button type="button" onClick={onClick} />}>
        Filter
      </Badge>,
    );

    const button = screen.getByRole("button", { name: "Filter" });
    await user.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
