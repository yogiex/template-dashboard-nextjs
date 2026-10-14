import { clientLogger } from "@/lib/logger-client";
import { reportRequestSchema } from "@/features/reports/schema";
import type { ReportRow, ReportRequest } from "@/features/reports/schema";

export function generateReport(req: ReportRequest): {
  columns: string[];
  rows: ReportRow[];
} {
  const parsed = reportRequestSchema.safeParse(req);
  if (!parsed.success) {
    clientLogger.warn("report.request.invalid", {
      issues: parsed.error.flatten(),
    });
    return { columns: [], rows: [] };
  }
  switch (parsed.data.dataset) {
    case "users":
      return usersReport();
    case "invoices":
      return invoicesReport();
    case "audit":
      return auditReport();
    default:
      return { columns: [], rows: [] };
  }
}

export function toCsv(columns: readonly string[], rows: readonly ReportRow[]): string {
  const header = columns.join(",");
  const body = rows
    .map((row) =>
      columns
        .map((c) => {
          const text = row[c] == null ? "" : String(row[c]);
          return `"${text.replace(/"/g, '""')}"`;
        })
        .join(","),
    )
    .join("\n");
  return [header, body].filter(Boolean).join("\n");
}

function usersReport() {
  const rows: ReportRow[] = [
    { id: "u_1", name: "Budi Santoso", email: "budi@acme.co", role: "admin", status: "active" },
    { id: "u_2", name: "Sari Wulandari", email: "sari@acme.co", role: "editor", status: "active" },
    { id: "u_3", name: "Andi Pratama", email: "andi@acme.co", role: "viewer", status: "pending" },
  ];
  return { columns: ["id", "name", "email", "role", "status"], rows };
}

function invoicesReport() {
  const rows: ReportRow[] = [
    { id: "inv_2026_09", date: "2026-09-01", plan: "free", amount: 0, status: "paid" },
    { id: "inv_2026_08", date: "2026-08-01", plan: "free", amount: 0, status: "paid" },
    { id: "inv_2026_07", date: "2026-07-01", plan: "pro", amount: 29, status: "paid" },
  ];
  return { columns: ["id", "date", "plan", "amount", "status"], rows };
}

function auditReport() {
  const rows: ReportRow[] = [
    { timestamp: "2026-09-10T10:00:00Z", category: "data", severity: "info", result: "success", actor: "budi", action: "delete", resource: "users/1" },
    { timestamp: "2026-09-10T11:00:00Z", category: "auth", severity: "warning", result: "failure", actor: "sari", action: "login", resource: "auth" },
  ];
  return { columns: ["timestamp", "category", "severity", "result", "actor", "action", "resource"], rows };
}
