import "server-only";

import {
  ORGANIZATION_DEPARTMENTS,
  ORGANIZATION_EMPLOYEES,
} from "@/config/organization";
import { logger } from "@/lib/logger";

import {
  employeeSchema,
  orgQuerySchema,
  type OrgQuery,
  type OrgQueryInput,
} from "./schema";
import type { Employee, OrgTreeNode, OrgTreeSummary } from "./types";

/**
 * Lapisan data (DAL) org chart. Repo ini belum punya database, jadi sumber
 * datanya adalah dataset mock di `src/config/organization.ts` yang sudah
 * divalidasi dengan Zod saat modul ini dimuat.
 *
 * Semua fungsi di sini tidak pernah melempar exception: dataset bisa rusak
 * (rbac datang dari client, config salah edit) dan halaman org chart lebih
 * baik menampilkan kondisi kosong daripada error boundary.
 */

type Store = {
  employees: Employee[];
  byId: Map<string, Employee>;
  childrenByManager: Map<string, Employee[]>;
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function readSeed(): Store {
  const employees: Employee[] = [];
  const byId = new Map<string, Employee>();
  const childrenByManager = new Map<string, Employee[]>();

  for (const seed of ORGANIZATION_EMPLOYEES) {
    const parsed = employeeSchema.safeParse(seed);

    if (!parsed.success) {
      logger.warn("organization.invalid_seed", { employeeId: seed.id });

      continue;
    }

    const employee = parsed.data;

    // Id duplikat akan merusak pemetaan managerId; lewati yang kedua.
    if (byId.has(employee.id)) {
      logger.warn("organization.duplicate_employee_id", {
        employeeId: employee.id,
      });

      continue;
    }

    byId.set(employee.id, employee);
    employees.push(employee);
  }

  for (const employee of employees) {
    const managerId = employee.managerId;

    if (!managerId) {
      continue;
    }

    const siblings = childrenByManager.get(managerId);

    if (siblings) {
      siblings.push(employee);
    } else {
      childrenByManager.set(managerId, [employee]);
    }
  }

  return { employees, byId, childrenByManager };
}

const store: Store = readSeed();

/** Kandidat root: tanpa atasan, atau atasan yang tidak ada di dataset. */
function findRootCandidates(): Employee[] {
  return store.employees.filter(
    (employee) =>
      employee.managerId === null || !store.byId.has(employee.managerId),
  );
}

function countDescendants(
  employee: Employee,
  visited: Set<string>,
): number {
  const children = store.childrenByManager.get(employee.id) ?? [];

  return children.reduce((total, child) => {
    if (visited.has(child.id)) {
      return total;
    }

    visited.add(child.id);

    return total + 1 + countDescendants(child, visited);
  }, 0);
}

/**
 * Kalau dataset punya lebih dari satu root (misalnya data disunting manual),
 * pilih root yang menaiki paling banyak karyawan. Hasilnya deterministik:
 * urutan dataset dipakai sebagai pemutus seri, sehingga root kedua tidak
 * diambil secara acak. Karyawan yang tidak terjangkau dari root terpilih
 * tetap terhitung di `totalEmployees` dan tetap bisa dicari, walau tidak
 * digambar sebagai node.
 */
function pickRoot(): Employee | null {
  const candidates = findRootCandidates();

  if (candidates.length === 0) {
    return null;
  }

  return candidates.reduce((best, candidate) => {
    const bestScore = countDescendants(best, new Set([best.id]));
    const candidateScore = countDescendants(candidate, new Set([candidate.id]));

    return candidateScore > bestScore ? candidate : best;
  });
}

function buildSubtree(
  employee: Employee,
  visited: Set<string>,
): OrgTreeNode {
  visited.add(employee.id);

  const children = (store.childrenByManager.get(employee.id) ?? []).flatMap(
    (child) => (visited.has(child.id) ? [] : [buildSubtree(child, visited)]),
  );

  return { employee, children };
}

function collectDepartments(root: OrgTreeNode | null): string[] {
  if (!root) {
    return [];
  }

  const found = new Set<string>();
  const queue: OrgTreeNode[] = [root];
  const visited = new Set<string>([root.employee.id]);

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current) {
      break;
    }

    found.add(current.employee.department);

    for (const child of current.children) {
      if (visited.has(child.employee.id)) {
        continue;
      }

      visited.add(child.employee.id);
      queue.push(child);
    }
  }

  const ordered = ORGANIZATION_DEPARTMENTS.filter((department) =>
    found.has(department),
  );
  const extras = [...found]
    .filter((department) => !ORGANIZATION_DEPARTMENTS.find((item) => item === department))
    .sort();

  return [...ordered, ...extras];
}

function computeLevels(root: OrgTreeNode | null): number {
  if (!root) {
    return 0;
  }

  const queue: Array<{ node: OrgTreeNode; depth: number }> = [
    { node: root, depth: 1 },
  ];
  const visited = new Set<string>([root.employee.id]);
  let deepest = 0;

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current) {
      break;
    }

    deepest = Math.max(deepest, current.depth);

    for (const child of current.node.children) {
      if (visited.has(child.employee.id)) {
        continue;
      }

      visited.add(child.employee.id);
      queue.push({ node: child, depth: current.depth + 1 });
    }
  }

  return deepest;
}

export function getOrgTree(): OrgTreeSummary {
  try {
    const rootEmployee = pickRoot();

    if (!rootEmployee) {
      return { root: null, totalEmployees: store.employees.length, departments: [] };
    }

    const root = buildSubtree(rootEmployee, new Set([rootEmployee.id]));

    return {
      root,
      totalEmployees: store.employees.length,
      departments: collectDepartments(root),
    };
  } catch (error) {
    logger.error("organization.get_org_tree.unexpected_error", error);

    return { root: null, totalEmployees: 0, departments: [] };
  }
}

export function getEmployeeById(id: string): Employee | null {
  try {
    const employee = store.byId.get(id.trim());

    return employee ?? null;
  } catch (error) {
    logger.error("organization.get_employee_by_id.unexpected_error", error);

    return null;
  }
}

/**
 * Rantai atasan dari atasan tertinggi turun ke atasan langsung. Guard
 * `visited` membuat siklus `managerId` (A -> B -> A) berhenti, bukan loop.
 */
export function getManagerChain(id: string): Employee[] {
  try {
    const start = getEmployeeById(id);

    if (!start) {
      return [];
    }

    const chain: Employee[] = [];
    const visited = new Set<string>([start.id]);
    let current: Employee | undefined = start;

    while (current) {
      const managerId = current.managerId;

      if (!managerId || visited.has(managerId)) {
        break;
      }

      const manager = store.byId.get(managerId);

      if (!manager) {
        break;
      }

      visited.add(manager.id);
      chain.push(manager);
      current = manager;
    }

    return chain.reverse();
  } catch (error) {
    logger.error("organization.get_manager_chain.unexpected_error", error);

    return [];
  }
}

export function countDepartments(root: OrgTreeNode | null): number {
  try {
    return collectDepartments(root).length;
  } catch (error) {
    logger.error("organization.count_departments.unexpected_error", error);

    return 0;
  }
}

/** Jumlah level terbawah dari root; 0 kalau tree kosong. */
export function countLevels(root: OrgTreeNode | null): number {
  try {
    return computeLevels(root);
  } catch (error) {
    logger.error("organization.count_levels.unexpected_error", error);

    return 0;
  }
}

export function getDirectReports(id: string): Employee[] {
  try {
    const managerId = id.trim();

    if (!managerId) {
      return [];
    }

    return [...(store.childrenByManager.get(managerId) ?? [])];
  } catch (error) {
    logger.error("organization.get_direct_reports.unexpected_error", error);

    return [];
  }
}

function isBlank(value: string | undefined): boolean {
  return value === undefined || value.trim().length === 0;
}

function toQueryInput(input: OrgQuery): OrgQueryInput {
  return {
    ...(isBlank(input.department) ? {} : { department: input.department }),
    ...(isBlank(input.search) ? {} : { search: input.search }),
  };
}

export function searchEmployees(input: OrgQuery): Employee[] {
  try {
    // Nilai kosong berarti "semua", bukan input tidak valid: pilihan
    // "semua departemen" di UI biasanya mengirim string kosong.
    const parsed = orgQuerySchema.safeParse(toQueryInput(input));

    if (!parsed.success) {
      return [];
    }

    const department = parsed.data.department
      ? normalize(parsed.data.department)
      : null;
    const search = parsed.data.search ? normalize(parsed.data.search) : null;

    return store.employees.filter((employee) => {
      if (department && normalize(employee.department) !== department) {
        return false;
      }

      if (!search) {
        return true;
      }

      return (
        normalize(employee.name).includes(search) ||
        normalize(employee.role).includes(search) ||
        normalize(employee.department).includes(search) ||
        normalize(employee.location).includes(search)
      );
    });
  } catch (error) {
    logger.error("organization.search_employees.unexpected_error", error);

    return [];
  }
}
