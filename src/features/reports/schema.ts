import { z } from "zod";

export const reportDatasetSchema = z.enum(["users", "invoices", "audit"]);
export type ReportDataset = z.infer<typeof reportDatasetSchema>;

export const reportFormatSchema = z.enum(["csv"]);
export type ReportFormat = z.infer<typeof reportFormatSchema>;

export const reportRequestSchema = z.object({
  dataset: reportDatasetSchema,
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  format: reportFormatSchema,
});

export type ReportRequest = z.infer<typeof reportRequestSchema>;

export interface ReportRow {
  [key: string]: string | number;
}

export interface GeneratedReport {
  columns: string[];
  rows: ReportRow[];
}
