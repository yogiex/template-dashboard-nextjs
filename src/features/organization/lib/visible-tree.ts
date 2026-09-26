import type { Employee, OrgTreeNode } from "../types";

/**
 * Operasi murni atas pohon organisasi: filter, lipat, dan penelusuran.
 *
 * Modul ini tidak menyentuh DOM, tidak menyimpan state, dan tidak memanggil
 * dagre, sehingga hasilnya deterministik untuk input yang sama. Semua fungsi
 * mengembalikan objek baru (tidak pernah memutasi input) dan berhenti saat
 * menemukan id yang sudah dikunjungi, sehingga data rusak yang membentuk
 * siklus tidak membuat penelusuran tanpa akhir.
 */

export interface OrgFilter {
  search: string;
  department: string;
}

/**
 * Nilai departemen yang berarti "semua departemen". Nilainya harus sama dengan
 * `DEPARTMENT_ALL_VALUE` dari `components/org-toolbar.tsx`; konstanta itu
 * dideklarasikan di file komponen peer yang tidak boleh diubah, jadi modul ini
 * menyimpan salinannya sendiri. `visible-tree.test.ts` mengunci kesamaan
 * keduanya supaya tidak menyimpang diam-diam.
 */
export const DEPARTMENT_ALL_VALUE = "all";

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function readChildren(node: OrgTreeNode): OrgTreeNode[] {
  return Array.isArray(node.children) ? node.children : [];
}

function readId(node: OrgTreeNode): string | null {
  const id = node.employee?.id;

  return typeof id === "string" ? id : null;
}

interface Criteria {
  search: string;
  /** `null` berarti tidak ada filter departemen yang aktif. */
  department: string | null;
}

function resolveCriteria(filter: OrgFilter): Criteria {
  const search = normalize(filter.search ?? "");
  const department = normalize(filter.department ?? "");
  const ignored =
    department.length === 0 || department === DEPARTMENT_ALL_VALUE;

  return { search, department: ignored ? null : department };
}

function matchesSearch(employee: Employee, search: string): boolean {
  return (
    normalize(employee.name).includes(search) ||
    normalize(employee.role).includes(search) ||
    normalize(employee.department).includes(search)
  );
}

function matchesFilter(
  employee: Employee,
  search: string,
  department: string | null,
): boolean {
  if (department !== null && normalize(employee.department) !== department) {
    return false;
  }

  if (search.length === 0) {
    return true;
  }

  return matchesSearch(employee, search);
}

function filterNode(
  node: OrgTreeNode,
  criteria: Criteria,
  path: Set<string>,
): OrgTreeNode | null {
  const id = readId(node);
  const employee = node.employee;

  if (id === null || path.has(id) || !employee) {
    return null;
  }

  path.add(id);

  const children = readChildren(node).flatMap<OrgTreeNode>((child) => {
    const kept = filterNode(child, criteria, path);

    return kept === null ? [] : [kept];
  });

  // `path` hanya melacak jalur aktif, jadi id dilepas lagi agar node yang sama
  // di cabang lain tidak ikut terpotong.
  path.delete(id);

  const selfMatches = matchesFilter(employee, criteria.search, criteria.department);

  if (!selfMatches && children.length === 0) {
    return null;
  }

  return { employee, children };
}

/**
 * Saring pohon berdasarkan pencarian dan departemen. Node yang tidak cocok
 * sendiri tetap dipertahankan kalau punya turunan yang cocok, supaya rantai
 * atasan tetap terlihat sebagai konteks. Pohon tanpa hasil apa pun menghasilkan
 * `null` supaya pemanggil bisa menampilkan kondisi kosong.
 */
export function filterOrgTree(
  tree: OrgTreeNode,
  filter: OrgFilter,
): OrgTreeNode | null {
  if (!tree) {
    return null;
  }

  try {
    return filterNode(tree, resolveCriteria(filter), new Set());
  } catch {
    // Pohon rusak tidak boleh menjatuhkan halaman: perlakukan sebagai tidak ada
    // hasil daripada melempar error ke pemanggil.
    return null;
  }
}

function collapseNode(
  node: OrgTreeNode,
  collapsedIds: ReadonlySet<string>,
): OrgTreeNode {
  const id = readId(node);
  const children =
    id !== null && collapsedIds.has(id)
      ? []
      : readChildren(node).map((child) => collapseNode(child, collapsedIds));

  return { employee: node.employee, children };
}

/**
 * Lipat setiap node yang id-nya ada di `collapsedIds`: node tetap ada sebagai
 * node, hanya turunannya dikosongkan. Hasil selalu objek baru, jadi pohon asli
 * dari server tidak pernah termutasi.
 */
export function collapseOrgTree(
  tree: OrgTreeNode,
  collapsedIds: ReadonlySet<string>,
): OrgTreeNode {
  if (!tree) {
    return tree;
  }

  const source = collapsedIds instanceof Set ? collapsedIds : new Set<string>();

  try {
    return collapseNode(tree, source);
  } catch {
    return tree;
  }
}

/**
 * Semua id node dalam urutan pre-order DFS. Id yang sudah pernah ditemukan
 * dilewati supaya siklus tidak menghasilkan lintasan tak berujung.
 */
export function collectNodeIds(tree: OrgTreeNode): string[] {
  if (!tree) {
    return [];
  }

  const ids: string[] = [];
  const visited = new Set<string>();
  const stack: OrgTreeNode[] = [tree];

  while (stack.length > 0) {
    const current = stack.pop();

    if (!current) {
      break;
    }

    const id = readId(current);

    if (id === null || visited.has(id)) {
      continue;
    }

    visited.add(id);
    ids.push(id);

    // Anak dimasukkan terbalik agar urutan(pre-order) tetap kiri-ke-kanan.
    const children = readChildren(current);

    for (let index = children.length - 1; index >= 0; index -= 1) {
      const child = children[index];

      if (child) {
        stack.push(child);
      }
    }
  }

  return ids;
}

/** Cari node pertama dengan id yang cocok (pre-order DFS), atau `null`. */
export function findNodeById(
  tree: OrgTreeNode,
  id: string,
): OrgTreeNode | null {
  if (!tree || typeof id !== "string" || id.length === 0) {
    return null;
  }

  const visited = new Set<string>();
  const stack: OrgTreeNode[] = [tree];

  while (stack.length > 0) {
    const current = stack.pop();

    if (!current) {
      break;
    }

    const currentId = readId(current);

    if (currentId === null || visited.has(currentId)) {
      continue;
    }

    visited.add(currentId);

    if (currentId === id) {
      return current;
    }

    const children = readChildren(current);

    for (let index = children.length - 1; index >= 0; index -= 1) {
      const child = children[index];

      if (child) {
        stack.push(child);
      }
    }
  }

  return null;
}

/**
 * True kalau node `candidateId` berada di bawah node `id` (bukan node itu
 * sendiri). Berguna untuk membuka semua leluhur sebelum memusatkan kamera ke
 * satu node. Node yang tidak ditemukan menghasilkan `false`, bukan error.
 */
export function isDescendantOf(
  tree: OrgTreeNode,
  id: string,
  candidateId: string,
): boolean {
  const start = findNodeById(tree, id);

  if (start === null || id === candidateId) {
    return false;
  }

  const visited = new Set<string>([id]);
  const stack: OrgTreeNode[] = [...readChildren(start)];

  while (stack.length > 0) {
    const current = stack.pop();

    if (!current) {
      break;
    }

    const currentId = readId(current);

    if (currentId === null || visited.has(currentId)) {
      continue;
    }

    visited.add(currentId);

    if (currentId === candidateId) {
      return true;
    }

    stack.push(...readChildren(current));
  }

  return false;
}
