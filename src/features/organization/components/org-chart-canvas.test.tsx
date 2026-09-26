import { render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { OrgChartCanvas } from "@/features/organization/components/org-chart-canvas";
import { treeToFlow, type OrgNode as OrgFlowNode } from "@/features/organization/lib/transform";
import type { OrgTreeNode } from "@/features/organization/types";

/**
 * React Flow mengukur node lewat `ResizeObserver` dan `DOMMatrixReadOnly`;
 * keduanya tidak ada di jsdom, jadi diganti stub minimal di file test ini
 * (bukan di `src/test/setup.ts` milik repo).
 */
beforeAll(() => {
  if (!("ResizeObserver" in window)) {
    Object.defineProperty(window, "ResizeObserver", {
      writable: true,
      configurable: true,
      value: class {
        observe() {}

        unobserve() {}

        disconnect() {}
      },
    });
  }

  if (!("DOMMatrixReadOnly" in window)) {
    Object.defineProperty(window, "DOMMatrixReadOnly", {
      writable: true,
      configurable: true,
      value: class {
        m11 = 1;
        m12 = 0;
        m21 = 0;
        m22 = 1;
        a = 0;
        b = 0;
        c = 0;
        d = 0;
        e = 0;
        f = 0;
      },
    });
  }

  if (!window.matchMedia) {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: () => ({
        matches: false,
        media: "",
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    });
  }
});

const employee = {
  id: "emp_001",
  name: "Budi Santoso",
  role: "Direktur Utama",
  department: "Executive",
  email: "budi.santoso@example.com",
  managerId: null,
  directReports: 0,
  location: "Jakarta Pusat",
  joinedAt: "2018-02-12T08:00:00.000Z",
};

const tree: OrgTreeNode = { employee, children: [] };

const { nodes, edges } = treeToFlow(tree);

function renderCanvas(overrides: Partial<Parameters<typeof OrgChartCanvas>[0]> = {}) {
  const props = {
    nodes,
    edges,
    direction: "TB" as const,
    selectedId: null,
    onNodeClick: vi.fn(),
    onNodeDoubleClick: vi.fn(),
    fitViewSignal: 0,
    ...overrides,
  };

  return { ...render(<OrgChartCanvas {...props} />), props };
}

describe("OrgChartCanvas", () => {
  it("merender node karyawan dari prop nodes", () => {
    renderCanvas();

    expect(screen.getByText("Budi Santoso")).toBeInTheDocument();
  });

  it("memberi wrapper aria-label dari copy org chart", () => {
    const { container } = renderCanvas();
    const wrapper = container.querySelector(
      "[data-slot='org-chart-canvas']",
    );

    expect(wrapper).not.toBeNull();
    expect(
      container.querySelector("[role='application']")?.getAttribute("aria-label"),
    ).toBe("Diagram organisasi");
  });

  it("menampilkan emptyState, bukan kanvas, saat nodes kosong", () => {
    render(
      <OrgChartCanvas
        nodes={[]}
        edges={[]}
        direction="TB"
        selectedId={null}
        onNodeClick={vi.fn()}
        onNodeDoubleClick={vi.fn()}
        fitViewSignal={0}
        emptyState={<p>Tidak ada karyawan</p>}
      />,
    );

    expect(screen.getByText("Tidak ada karyawan")).toBeInTheDocument();
    expect(screen.queryByText("Budi Santoso")).not.toBeInTheDocument();
  });

  it("menandai node terpilih lewat prop selected", () => {
    const selectedNodes: OrgFlowNode[] = nodes.map((node) => ({
      ...node,
      selected: node.id === employee.id,
    }));

    renderCanvas({ nodes: selectedNodes, selectedId: employee.id });

    expect(
      document.querySelector("[data-slot='org-node']"),
    ).toHaveAttribute("data-selected", "true");
  });
});
