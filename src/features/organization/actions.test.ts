import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppError } from "@/lib/error";
import type { SessionUser } from "@/lib/rbac";

/**
 * Test untuk `src/features/organization/actions.ts`.
 *
 * Fokus: session gate di kedua action dan role minimum `editor` untuk detail
 * karyawan. `requireRole` tidak dimock (murni, tanpa env) supaya batas
 * hierarki role ikut teruji apa adanya.
 *
 * DAL di-mock supaya test tidak bergantung pada isi dataset org mock, dan
 * `logAudit` di-mock supaya pencatatan tidak mengotori store audit global.
 */

const rbac = vi.hoisted(() => ({
  requireSession: vi.fn(),
}));

vi.mock("@/lib/rbac", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/rbac")>();

  return { ...actual, requireSession: rbac.requireSession };
});

const dal = vi.hoisted(() => ({
  getDirectReports: vi.fn(() => []),
  getEmployeeById: vi.fn(),
  getManagerChain: vi.fn(() => []),
  getOrgTree: vi.fn(),
}));

vi.mock("@/features/organization/service", () => dal);

vi.mock("@/features/audit/lib/log-audit", () => ({
  logAudit: vi.fn(() => Promise.resolve()),
}));

type Envelope<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

function codeOf(result: Envelope<unknown>): string {
  if (result.success) {
    throw new Error("Diharapkan envelope gagal, tapi action sukses.");
  }

  return result.error.code;
}

function unauthenticated(): AppError {
  return new AppError("UNAUTHENTICATED", { message: "Sesi tidak ditemukan." });
}

const EMPLOYEE = {
  id: "emp_1",
  name: "Someone",
  role: "Engineer",
  department: "Engineering",
  email: "someone@example.com",
  managerId: null,
  directReports: 0,
  location: "Jakarta",
  joinedAt: "2024-01-01T00:00:00.000Z",
};

const TREE = { root: null, totalEmployees: 1, departments: ["Engineering"] };

let act: typeof import("@/features/organization/actions");

beforeEach(async () => {
  act = await import("@/features/organization/actions");
  dal.getEmployeeById.mockReturnValue(EMPLOYEE);
  dal.getOrgTree.mockReturnValue(TREE);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("getOrgTreeAction", () => {
  it("mengembalikan envelope UNAUTHENTICATED saat tidak ada sesi", async () => {
    rbac.requireSession.mockRejectedValue(unauthenticated());

    const result = await act.getOrgTreeAction();

    expect(codeOf(result as Envelope<unknown>)).toBe("UNAUTHENTICATED");
    expect(dal.getOrgTree).not.toHaveBeenCalled();
  });

  it("tidak melempar exception ke client saat guard menolak", async () => {
    rbac.requireSession.mockRejectedValue(unauthenticated());

    await expect(act.getOrgTreeAction()).resolves.toBeDefined();
  });

  it("berhasil untuk role terendah karena tidak ada role check di sini", async () => {
    rbac.requireSession.mockResolvedValue({ id: "usr_viewer", role: "viewer" });

    const result = await act.getOrgTreeAction();

    expect(result).toEqual({ success: true, data: TREE });
    expect(rbac.requireSession).toHaveBeenCalledTimes(1);
  });

  it("error tak terduga jadi envelope INTERNAL_ERROR", async () => {
    rbac.requireSession.mockResolvedValue({ id: "usr_1", role: "viewer" });
    dal.getOrgTree.mockImplementation(() => {
      throw new Error("dataset rusak: host=10.0.0.5");
    });

    const result = await act.getOrgTreeAction();

    expect(codeOf(result as Envelope<unknown>)).toBe("INTERNAL_ERROR");
    expect(JSON.stringify(result)).not.toContain("10.0.0.5");
  });
});

describe("getEmployeeDetailAction", () => {
  it("mengembalikan envelope UNAUTHENTICATED saat tidak ada sesi", async () => {
    rbac.requireSession.mockRejectedValue(unauthenticated());

    const result = await act.getEmployeeDetailAction("emp_1");

    expect(codeOf(result as Envelope<unknown>)).toBe("UNAUTHENTICATED");
    expect(dal.getEmployeeById).not.toHaveBeenCalled();
  });

  it("menolak role viewer dengan envelope FORBIDDEN", async () => {
    rbac.requireSession.mockResolvedValue({ id: "usr_viewer", role: "viewer" });

    const result = await act.getEmployeeDetailAction("emp_1");

    expect(codeOf(result as Envelope<unknown>)).toBe("FORBIDDEN");
    expect(dal.getEmployeeById).not.toHaveBeenCalled();
  });

  it("menerima role editor dan mengembalikan detail lengkap", async () => {
    rbac.requireSession.mockResolvedValue({ id: "usr_editor", role: "editor" });

    const result = await act.getEmployeeDetailAction("emp_1");

    expect(result).toEqual({
      success: true,
      data: { employee: EMPLOYEE, managers: [], reports: [] },
    });
    expect(dal.getManagerChain).toHaveBeenCalledWith("emp_1");
    expect(dal.getDirectReports).toHaveBeenCalledWith("emp_1");
  });

  it("menerima role admin", async () => {
    rbac.requireSession.mockResolvedValue({ id: "usr_admin", role: "admin" });

    const result = await act.getEmployeeDetailAction("emp_1");

    expect(result.success).toBe(true);
  });

  it("NOT_FOUND tidak membocorkan data karyawan", async () => {
    rbac.requireSession.mockResolvedValue({ id: "usr_editor", role: "editor" });
    dal.getEmployeeById.mockReturnValue(null);

    const result = await act.getEmployeeDetailAction("emp_hilang");

    expect(codeOf(result as Envelope<unknown>)).toBe("NOT_FOUND");
  });

  it("id tidak valid jadi VALIDATION_ERROR, bukan INTERNAL_ERROR", async () => {
    rbac.requireSession.mockResolvedValue({ id: "usr_editor", role: "editor" });

    const result = await act.getEmployeeDetailAction("   ");

    expect(codeOf(result as Envelope<unknown>)).toBe("VALIDATION_ERROR");
  });

  it("error tak terduga jadi envelope INTERNAL_ERROR", async () => {
    rbac.requireSession.mockResolvedValue({ id: "usr_editor", role: "editor" });
    dal.getEmployeeById.mockImplementation(() => {
      throw new Error("store bocor: token=abc123");
    });

    const result = await act.getEmployeeDetailAction("emp_1");

    expect(codeOf(result as Envelope<unknown>)).toBe("INTERNAL_ERROR");
    expect(JSON.stringify(result)).not.toContain("abc123");
  });
});

describe("getEmployeeDetailAction: rate limit", () => {
  it("memakai session id dari server, bukan id dari client", async () => {
    rbac.requireSession.mockResolvedValue({ id: "usr_rate", role: "editor" });

    for (let attempt = 0; attempt < 60; attempt += 1) {
      const result = await act.getEmployeeDetailAction(`emp_${attempt}`);

      expect(result.success).toBe(true);
    }

    const limited = await act.getEmployeeDetailAction("emp_61");

    // Bucket-nya per-aktor dari server; `id` yang berubah-ubah dari client tidak
    // boleh memulai jendela baru.
    expect(codeOf(limited as Envelope<unknown>)).toBe("RATE_LIMITED");
  });
});

describe("getEmployeeDetailAction: hierarchy role", () => {
  it("hierarki tetap berlaku: editor boleh, viewer tidak", async () => {
    const cases: Array<[SessionUser["role"], string]> = [
      ["viewer", "FORBIDDEN"],
      ["editor", "OK"],
      ["admin", "OK"],
    ];

    for (const [role, expected] of cases) {
      rbac.requireSession.mockResolvedValue({ id: `usr_${role}`, role });

      const result = await act.getEmployeeDetailAction("emp_1");

      if (expected === "OK") {
        expect(result.success).toBe(true);
      } else {
        expect(codeOf(result as Envelope<unknown>)).toBe(expected);
      }
    }
  });
});
