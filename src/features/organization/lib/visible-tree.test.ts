import { describe, expect, it } from "vitest";

import { DEPARTMENT_ALL_VALUE as TOOLBAR_ALL_VALUE } from "@/features/organization/components/org-toolbar";
import {
  collectNodeIds,
  collapseOrgTree,
  DEPARTMENT_ALL_VALUE,
  filterOrgTree,
  findNodeById,
  isDescendantOf,
} from "@/features/organization/lib/visible-tree";
import type { Employee, OrgTreeNode } from "@/features/organization/types";

function employee(
  id: string,
  overrides: Partial<Employee> = {},
): Employee {
  return {
    id,
    name: `Karyawan ${id}`,
    role: "Anggota tim",
    department: "Engineering",
    email: `${id}@example.com`,
    managerId: null,
    directReports: 0,
    location: "Jakarta Pusat",
    joinedAt: "2020-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const root = employee("emp_001", {
  name: "Budi Santoso",
  role: "Direktur Utama",
  department: "Executive",
  directReports: 2,
});
const lead = employee("emp_002", {
  name: "Rina Kusuma",
  role: "Kepala Divisi Engineering",
  directReports: 1,
});
const manager = employee("emp_003", {
  name: "Andi Pratama",
  role: "Manajer Engineering",
  directReports: 1,
});
const leaf = employee("emp_004", {
  name: "Dewi Anggraini",
  role: "Senior Backend Engineer",
});
const otherLead = employee("emp_005", {
  name: "Sari Melati",
  role: "Kepala Divisi Finance",
  department: "Finance",
});

/**
 * emp_001 -> emp_002 -> emp_003 -> emp_004, dan emp_001 -> emp_005.
 */
function buildTree(): OrgTreeNode {
  return {
    employee: root,
    children: [
      {
        employee: lead,
        children: [
          {
            employee: manager,
            children: [{ employee: leaf, children: [] }],
          },
        ],
      },
      { employee: otherLead, children: [] },
    ],
  };
}

const EMPTY_FILTER = { search: "", department: DEPARTMENT_ALL_VALUE };

function ids(tree: OrgTreeNode | null): string[] {
  return tree === null ? [] : collectNodeIds(tree);
}

describe("DEPARTMENT_ALL_VALUE", () => {
  it("sama dengan sentinel yang dipakai toolbar", () => {
    expect(DEPARTMENT_ALL_VALUE).toBe(TOOLBAR_ALL_VALUE);
  });
});

describe("filterOrgTree", () => {
  it("mencocokkan nama tanpa mengganggu huruf besar-kecil", () => {
    const result = filterOrgTree(buildTree(), {
      search: "DEWI",
      department: DEPARTMENT_ALL_VALUE,
    });

    expect(ids(result)).toEqual(["emp_001", "emp_002", "emp_003", "emp_004"]);
  });

  it("mencocokkan sebagian nama sebagai substring", () => {
    const result = filterOrgTree(buildTree(), {
      search: "kusuma",
      department: DEPARTMENT_ALL_VALUE,
    });

    expect(ids(result)).toEqual(["emp_001", "emp_002"]);
  });

  it("mencocokkan jabatan", () => {
    const result = filterOrgTree(buildTree(), {
      search: "Manajer",
      department: DEPARTMENT_ALL_VALUE,
    });

    expect(ids(result)).toEqual(["emp_001", "emp_002", "emp_003"]);
  });

  it("mencocokkan departemen dan hanya menyimpan cabang terkait", () => {
    const result = filterOrgTree(buildTree(), {
      search: "",
      department: "finance",
    });

    expect(ids(result)).toEqual(["emp_001", "emp_005"]);
  });

  it("menggabungkan pencarian dan departemen", () => {
    const result = filterOrgTree(buildTree(), {
      search: "divisi",
      department: "finance",
    });

    expect(ids(result)).toEqual(["emp_001", "emp_005"]);
  });

  it("membuang kandidat yang departemennya tidak cocok", () => {
    const result = filterOrgTree(buildTree(), {
      search: "Manajer",
      department: "Finance",
    });

    expect(result).toBeNull();
  });

  it("mempertahankan atasan sebagai konteks walau tidak cocok", () => {
    const result = filterOrgTree(buildTree(), {
      search: "Dewi",
      department: DEPARTMENT_ALL_VALUE,
    });

    expect(result?.employee.id).toBe("emp_001");
    expect(result?.children).toHaveLength(1);
    expect(result?.children[0]?.employee.id).toBe("emp_002");
  });

  it("mengabaikan nilai departemen kosong dan sentinel all", () => {
    const withEmpty = filterOrgTree(buildTree(), { search: "", department: "" });
    const withSentinel = filterOrgTree(buildTree(), {
      search: "",
      department: "all",
    });

    expect(ids(withEmpty)).toHaveLength(5);
    expect(ids(withSentinel)).toHaveLength(5);
  });

  it("mengembalikan pohon utuh saat filter kosong", () => {
    expect(filterOrgTree(buildTree(), EMPTY_FILTER)).toEqual(buildTree());
  });

  it("mengembalikan null saat tidak ada yang cocok", () => {
    const result = filterOrgTree(buildTree(), {
      search: "tidak-ada-sama-sekali",
      department: DEPARTMENT_ALL_VALUE,
    });

    expect(result).toBeNull();
  });

  it("mengabaikan filter yang hanya berisi spasi", () => {
    const result = filterOrgTree(buildTree(), { search: "   ", department: " all " });

    expect(ids(result)).toEqual(collectNodeIds(buildTree()));
  });
});

describe("collapseOrgTree", () => {
  it("mengosongkan turunan node yang terlipat", () => {
    const tree = buildTree();
    const result = collapseOrgTree(tree, new Set(["emp_002"]));

    expect(result.children[0]?.children).toEqual([]);
    expect(result.children[0]?.employee.id).toBe("emp_002");
  });

  it("tidak memutasi pohon asal", () => {
    const tree = buildTree();
    const result = collapseOrgTree(tree, new Set(["emp_002"]));

    expect(tree.children[0]?.children).toHaveLength(1);
    expect(result).not.toBe(tree);
    expect(result.children[0]).not.toBe(tree.children[0]);
  });

  it("mempertahankan subtree yang tidak terlipat", () => {
    const result = collapseOrgTree(buildTree(), new Set(["emp_003"]));

    expect(ids(result)).toEqual(["emp_001", "emp_002", "emp_003", "emp_005"]);
  });

  it("mengembalikan pohon utuh saat set kosong", () => {
    const tree = buildTree();

    expect(collapseOrgTree(tree, new Set())).toEqual(tree);
  });
});

describe("collectNodeIds", () => {
  it("mengumpulkan seluruh id dalam urutan pre-order", () => {
    expect(collectNodeIds(buildTree())).toEqual([
      "emp_001",
      "emp_002",
      "emp_003",
      "emp_004",
      "emp_005",
    ]);
  });

  it("berhenti pada pohon bersiklus", () => {
    const tree = buildTree();
    const first = tree.children[0];

    if (first) {
      first.children.push(tree);
    }

    expect(collectNodeIds(tree)).toEqual([
      "emp_001",
      "emp_002",
      "emp_003",
      "emp_004",
      "emp_005",
    ]);
  });
});

describe("findNodeById", () => {
  it("menemukan root, node tengah, dan daun", () => {
    const tree = buildTree();

    expect(findNodeById(tree, "emp_001")?.employee.id).toBe("emp_001");
    expect(findNodeById(tree, "emp_003")?.employee.id).toBe("emp_003");
    expect(findNodeById(tree, "emp_004")?.employee.id).toBe("emp_004");
  });

  it("mengembalikan null untuk id yang tidak ada", () => {
    expect(findNodeById(buildTree(), "emp_999")).toBeNull();
    expect(findNodeById(buildTree(), "")).toBeNull();
  });

  it("tidak hang pada pohon bersiklus", () => {
    const tree = buildTree();
    const first = tree.children[0];

    if (first) {
      first.children.push(tree);
    }

    expect(findNodeById(tree, "emp_404")).toBeNull();
  });
});

describe("isDescendantOf", () => {
  it("benar untuk kandidat yang benar-benar keturunan", () => {
    const tree = buildTree();

    expect(isDescendantOf(tree, "emp_001", "emp_004")).toBe(true);
    expect(isDescendantOf(tree, "emp_002", "emp_004")).toBe(true);
  });

  it("salah untuk node lain dan untuk dirinya sendiri", () => {
    const tree = buildTree();

    expect(isDescendantOf(tree, "emp_001", "emp_005")).toBe(true);
    expect(isDescendantOf(tree, "emp_004", "emp_001")).toBe(false);
    expect(isDescendantOf(tree, "emp_001", "emp_001")).toBe(false);
    expect(isDescendantOf(tree, "emp_999", "emp_001")).toBe(false);
  });
});
