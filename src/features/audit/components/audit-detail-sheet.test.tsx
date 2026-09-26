import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { AUDIT_PAGE_CONFIG } from "@/config/audit-page";
import { AuditDetailSheet } from "@/features/audit/components/audit-detail-sheet";
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

async function openSheet(event: AuditEvent): Promise<void> {
  const user = userEvent.setup();
  render(<AuditDetailSheet event={event} />);
  await user.click(
    screen.getByRole("button", { name: `${config.detail.open}: ${event.action}` }),
  );
}

describe("AuditDetailSheet", () => {
  it("memakai aria-label trigger dari config dan action event", () => {
    render(<AuditDetailSheet event={makeEvent()} />);

    expect(
      screen.getByRole("button", {
        name: `${config.detail.open}: user.login`,
      }),
    ).toBeInTheDocument();
  });

  it("menampilkan judul, deskripsi, dan field inti setelah dibuka", async () => {
    await openSheet(
      makeEvent({
        actor: { id: "usr_1", email: "us••@example.com", role: "admin" },
        resource: { type: "user", id: "usr_1", name: "Demo" },
        requestId: "req_1",
        host: "localhost",
        userAgent: "curl/8.0.0",
        metadata: { email: "us••@example.com" },
      }),
    );

    const dialog = await screen.findByRole("dialog");

    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("user.login")).toBeInTheDocument();
    // Event id muncul di deskripsi sheet dan di baris integritas.
    expect(screen.getAllByText("evt_1").length).toBeGreaterThan(0);

    for (const label of [
      config.detail.fields.time,
      config.detail.fields.category,
      config.detail.fields.severity,
      config.detail.fields.result,
      config.detail.fields.source,
      config.detail.fields.actorId,
      config.detail.fields.actorEmail,
      config.detail.fields.actorRole,
      config.detail.fields.resource,
      config.detail.fields.requestId,
      config.detail.fields.host,
      config.detail.fields.userAgent,
      config.detail.fields.eventId,
      config.detail.fields.previousHash,
      config.detail.fields.hash,
      config.detail.fields.metadata,
    ]) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }

    expect(screen.getByText("us••@example.com")).toBeInTheDocument();
    expect(screen.getByText("user · usr_1 · Demo")).toBeInTheDocument();
  });

  it("menampilkan metadata sebagai teks ter-escape, bukan HTML", async () => {
    await openSheet(
      makeEvent({ metadata: { note: "<img src=x onerror=alert(1)>" } }),
    );

    const pre = await screen.findByLabelText(config.detail.fields.metadata);

    expect(pre.tagName).toBe("PRE");
    expect(pre).toHaveTextContent("<img src=x onerror=alert(1)>");
    expect(pre.querySelector("img")).toBeNull();
  });

  it("menampilkan copy metadata kosong dan placeholder hash sebelumnya", async () => {
    await openSheet(makeEvent({ metadata: {} }));

    expect(
      await screen.findByText(config.detail.metadataEmpty),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(config.detail.notAvailable).length,
    ).toBeGreaterThan(0);
  });

  it("menutup sheet dengan tombol Escape", async () => {
    const user = userEvent.setup();
    render(<AuditDetailSheet event={makeEvent()} />);

    await user.click(
      screen.getByRole("button", {
        name: `${config.detail.open}: user.login`,
      }),
    );
    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
