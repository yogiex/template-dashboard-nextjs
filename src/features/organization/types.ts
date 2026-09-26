import type { z } from "zod";

import type { employeeSchema, orgQuerySchema } from "./schema";

/**
 * Tipe diturunkan dari Zod (`schema.ts`) supaya bentuk data server dan
 * bentuk data yang divalidasi tidak bisa melenceng. Diturunkan dari Zod juga
 * diperlukan agar `Employee` memenuhi `Record<string, unknown>` untuk
 * `Node<Employee, "org">` milik React Flow (interface tidak punya index
 * signature implisit).
 */
export type Employee = z.infer<typeof employeeSchema>;
export type OrgQuery = z.infer<typeof orgQuerySchema>;

export interface OrgTreeNode {
  employee: Employee;
  children: OrgTreeNode[];
}

export interface OrgTreeSummary {
  root: OrgTreeNode | null;
  totalEmployees: number;
  departments: string[];
}

export interface EmployeeDetail {
  employee: Employee;
  managers: Employee[];
  reports: Employee[];
}
