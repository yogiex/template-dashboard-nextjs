"use server";

import { AUDIT_ACTIONS } from "@/features/audit/lib/categories";
import { logAudit } from "@/features/audit/lib/log-audit";
import { AppError, getErrorMessage, type ErrorCode } from "@/lib/error";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/rate-limit";
import { requireRole, requireSession } from "@/lib/rbac";

import { employeeIdSchema } from "./schema";
import {
  getDirectReports,
  getEmployeeById,
  getManagerChain,
  getOrgTree,
} from "./service";
import type { EmployeeDetail } from "./types";

export type OrgActionState<T> =
  | { success: true; data: T }
  | { success: false; error: { code: ErrorCode; message: string } };

/**
 * Pembacaan detail satu karyawan bisa dipanggil berulang (klik kartu,
 * refresh panel), jadi limitnya longgar. Query tree tidak diberi limit karena
 * hanya membaca dataset mock di memori.
 */
const DETAIL_LIMIT = {
  maxAttempts: 60,
  windowMs: 60_000,
} as const;

/**
 * Role minimum untuk satu resource data karyawan.
 *
 * `editor`, bukan `viewer` dan bukan `admin`. Alasannya berasal dari data yang
 * dikembalikan, bukan dari posisi resource: `EmployeeDetail` memuat PII —
 * email, lokasi, tanggal bergabung — untuk satu karyawan, plus rantai manajer dan
 * laporan langsungnya, sementara `id` datang dari client dan menunjuk siapa pun
 * di direktori. Matriks permission repo sendiri memberi `reports.view` ke
 * `editor` ke atas dan `false` untuk `viewer`
 * (`src/features/roles/schema.ts`), dan org chart adalah laporan yang di-drill
 * down ini. `admin` akan berlebihan: operasinya read-only dan tidak menyentuh
 * data sesi siapa pun.
 */
const EMPLOYEE_DETAIL_MINIMUM_ROLE = "editor" as const;

function failure(code: ErrorCode): OrgActionState<never> {
  return { success: false, error: { code, message: getErrorMessage(code) } };
}

function internalFailure(): OrgActionState<never> {
  return failure("INTERNAL_ERROR");
}

export async function getOrgTreeAction(): Promise<
  OrgActionState<ReturnType<typeof getOrgTree>>
> {
  try {
    await requireSession();

    return { success: true, data: getOrgTree() };
  } catch (error) {
    if (error instanceof AppError) {
      return failure(error.code);
    }

    logger.error("organization.get_org_tree_action.unexpected_error", error);

    return internalFailure();
  }
}

export async function getEmployeeDetailAction(
  id: string,
): Promise<OrgActionState<EmployeeDetail>> {
  try {
    const session = await requireSession();

    requireRole(session, EMPLOYEE_DETAIL_MINIMUM_ROLE);

    enforceRateLimit(session.id, "organization-employee-detail", DETAIL_LIMIT);

    // Validasi selalu sebelum menyentuh service: id client tidak dipercaya.
    const employeeId = employeeIdSchema.parse(id);
    const employee = getEmployeeById(employeeId);

    if (!employee) {
      return failure("NOT_FOUND");
    }

    void logAudit({
      category: "data",
      action: AUDIT_ACTIONS.DATA_EMPLOYEE_VIEW,
      result: "success",
      severity: "info",
      source: "organization.employee.detail",
      resource: { type: "employee", id: employee.id },
      // Email sengaja tidak ikut: cukup id dan departemen untuk audit.
      metadata: { department: employee.department },
    });

    return {
      success: true,
      data: {
        employee,
        managers: getManagerChain(employee.id),
        reports: getDirectReports(employee.id),
      },
    };
  } catch (error) {
    if (error instanceof AppError) {
      return failure(error.code);
    }

    if (error instanceof Error && error.name === "ZodError") {
      return failure("VALIDATION_ERROR");
    }

    logger.error("organization.get_employee_detail.unexpected_error", error);

    return internalFailure();
  }
}
