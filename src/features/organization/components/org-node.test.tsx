import type { Employee } from "@/features/organization/types";
import { render, screen } from "@testing-library/react";
import { ReactFlowProvider } from "@xyflow/react";
import { describe, expect, it } from "vitest";

import { OrgNode, type OrgNodeProps } from "@/features/organization/components/org-node";

const employee: Employee = {
  id: "emp_001",
  name: "Budi Santoso",
  role: "Direktur Utama",
  department: "Executive",
  email: "budi.santoso@example.com",
  managerId: null,
  directReports: 4,
  location: "Jakarta Pusat",
  joinedAt: "2018-02-12T08:00:00.000Z",
};

function nodeProps(overrides: Partial<OrgNodeProps>): OrgNodeProps {
  return {
    id: employee.id,
    type: "org",
    data: employee,
    dragging: false,
    zIndex: 0,
    selectable: true,
    deletable: false,
    draggable: true,
    selected: false,
    isConnectable: false,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
    ...overrides,
  };
}

function nodeElement(container: HTMLElement): HTMLElement {
  const element = container.firstElementChild;

  if (!(element instanceof HTMLElement)) {
    throw new Error("Node tidak merender elemen root");
  }

  return element;
}

/** `Handle` membaca store React Flow, jadi node harus di dalam provider. */
function renderNode(overrides: Partial<OrgNodeProps>) {
  return render(
    <ReactFlowProvider>
      <OrgNode {...nodeProps(overrides)} />
    </ReactFlowProvider>,
  );
}

describe("OrgNode", () => {
  it("merender nama, jabatan, departemen, dan jumlah laporan langsung", () => {
    renderNode({});

    expect(screen.getByText("Budi Santoso")).toBeInTheDocument();
    expect(screen.getByText("Direktur Utama")).toBeInTheDocument();
    expect(screen.getByText("Executive")).toBeInTheDocument();
    expect(screen.getByText("4 orang")).toBeInTheDocument();
  });

  it("tidak memberi ring khusus saat node belum dipilih", () => {
    const { container } = renderNode({});
    const className = nodeElement(container).className;

    expect(className).toContain("border-border");
    expect(className).not.toContain("ring-primary");
    expect(nodeElement(container)).toHaveAttribute("data-selected", "false");
  });

  it("memberi ring token semantic saat node dipilih", () => {
    const { container } = renderNode({ selected: true });
    const className = nodeElement(container).className;

    expect(className).toContain("border-primary");
    expect(className).toContain("ring-primary");
    expect(nodeElement(container)).toHaveAttribute("data-selected", "true");
  });

  it("memakai ukuran node yang sama dengan layout", () => {
    const { container } = renderNode({});
    const element = nodeElement(container);

    expect(element.style.width).toBe("220px");
    expect(element.style.height).toBe("88px");
  });
});
