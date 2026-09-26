import "server-only";

import { buildIntegrityReport } from "@/features/audit/lib/integrity";
import {
  getAuditEntries,
  getAuditStoreStats,
  queryAuditStore,
} from "@/features/audit/lib/store";
import {
  auditQuerySchema,
  AUDIT_CATEGORIES,
  AUDIT_SEVERITIES,
  type AuditEvent,
  type AuditQuery,
} from "@/features/audit/schema";
import type { IntegrityReport } from "@/features/audit/types";

export type AuditPage = ReturnType<typeof queryAuditStore>;

export function queryAuditEvents(input: unknown): AuditPage {
  const parsed = auditQuerySchema.safeParse(input ?? {});
  const empty: AuditPage = {
    items: [],
    total: 0,
    page: 1,
    pageSize: 25,
    totalPages: 1,
  };

  if (!parsed.success) {
    return empty;
  }

  return queryAuditStore(parsed.data);
}

export function getAuditSummary(now = Date.now()): {
  total24h: number;
  critical24h: number;
  failures24h: number;
  byCategory: Array<{ category: string; count: number }>;
  bySeverity: Array<{ severity: string; count: number }>;
  store: ReturnType<typeof getAuditStoreStats>;
} {
  const since = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const entries = getAuditEntries();
  const recent = entries.filter((entry) => entry.timestamp >= since);
  const byCategory = AUDIT_CATEGORIES.map((category) => ({
    category,
    count: recent.filter((entry) => entry.category === category).length,
  }));
  const bySeverity = AUDIT_SEVERITIES.map((severity) => ({
    severity,
    count: recent.filter((entry) => entry.severity === severity).length,
  }));

  return {
    total24h: recent.length,
    critical24h: recent.filter((entry) => entry.severity === "critical").length,
    failures24h: recent.filter((entry) => entry.result !== "success").length,
    byCategory,
    bySeverity,
    store: getAuditStoreStats(),
  };
}

export function verifyAuditIntegrity(): IntegrityReport {
  return buildIntegrityReport(getAuditEntries());
}

export type { AuditEvent, AuditQuery };
