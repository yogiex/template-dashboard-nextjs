import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AUDIT_PAGE_CONFIG } from "@/config/audit-page";
import { AuditTable } from "@/features/audit/components/audit-table";
import type { AuditEvent } from "@/features/audit/schema";

const config = AUDIT_PAGE_CONFIG;

function makeEvent(overrides: Partial<AuditEvent> = {}): AuditEvent {
  return {
    id: "evt_1",
    timestamp: "2026-09-20T08:30:00.000Z",
    hash: "hash_1",
    previousHash: null,
    action: "user.login",
    category: "auth",
    severity: "info",
    result: "success",
    source: "auth.login-form",
    ...overrides,
  };
}

describe("AuditTable", () => {
  it("merender seluruh header kolom", () => {
    render(<AuditTable events={[makeEvent()]} />);

    const table = screen.getByRole("table", {
      name: `${config.title}: ${config.description}`,
    });
    const headerRow = within(table).getAllByRole("row")[0];

    for (const label of Object.values(config.columns)) {
      expect(
        within(headerRow).getByRole("columnheader", { name: label }),
      ).toBeInTheDocument();
    }
  });

  it("menampilkan actor ter-mask dan fallback em-dash saat actor kosong", () => {
    const { rerender } = render(
      <AuditTable
        events={[
          makeEvent({
            id: "evt_masked",
            actor: { email: "a***@contoh.test", role: "admin" },
          }),
        ]}
      />,
    );

    expect(screen.getByText("a***@contoh.test")).toBeInTheDocument();

    rerender(<AuditTable events={[makeEvent({ id: "evt_anonymous" })]} />);

    expect(screen.getByText(config.detail.notAvailable)).toBeInTheDocument();
  });

  it("merender EmptyState dari config saat tidak ada event", () => {
    render(<AuditTable events={[]} />);

    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: config.empty.title }),
    ).toBeInTheDocument();
    expect(screen.getByText(config.empty.description)).toBeInTheDocument();
  });
});
