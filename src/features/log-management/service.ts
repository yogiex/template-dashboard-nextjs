import "server-only";

import { queryAuditEvents, getAuditSummary } from "@/features/audit/service";
import type { AuditEvent } from "@/features/audit/schema";
import {
  getForecastByTier,
  getForecastTotals,
  LOG_SOURCE_FORECASTS,
  type LogSourceForecast,
  type LogSourceTier,
} from "@/features/log-management/lib/config";
import {
  GENERATION_POLICY,
  getAllowedEventTypes,
  getProhibitedEventTypes,
  getSourceClassifications,
  type GenerationPolicy,
  type LogEventTypePolicy,
  type SourceClassification,
} from "@/features/log-management/lib/generation";
import {
  CORRELATION_RULES,
  DATA_REDUCTION_RULES,
  LOG_FORMATS,
  RETENTION_POLICIES,
  STORAGE_MONITORING_CHECKS,
  STORAGE_PROTECTION,
  TRANSFER_METHODS,
  TRANSFER_POLICIES,
  getStorageCapacity,
  type StorageCapacity,
} from "@/features/log-management/lib/storage";
import {
  ACCESS_LOGGING_RULES,
  ACCESS_MATRIX,
  ACCESS_MODE_POLICIES,
  ACCESS_MONITORING_CHECKS,
  ACCESS_PROTECTIONS,
  PRESERVATION_ORDER,
  getPreservationBaseline,
} from "@/features/log-management/lib/access";
import {
  DISPOSAL_POLICIES,
  DISPOSAL_VERIFICATION_STEPS,
  UNAUTHORIZED_DISPOSAL_PREVENTION,
} from "@/features/log-management/lib/disposal";
import {
  getDisposalQueue,
  getPendingDisposals,
  type DisposalQueueItem,
} from "@/features/log-management/lib/disposal-queue";
import { runLogAnalysis, type LogAnalysis } from "@/features/log-management/lib/analysis";
import {
  getLastIntegrityVerification,
  type IntegrityVerification,
} from "@/features/log-management/lib/schedule";
import { logQuerySchema, type LogQuery } from "@/features/log-management/schema";

/**
 * Service layer (DAL) Log Management — satu-satunya pintu data untuk fitur ini.
 * Semua nilai yang ditampilkan berasal dari audit store in-memory yang nyata.
 */

export type LogPage = ReturnType<typeof queryAuditEvents>;

/**
 * `queryLogs` membungkus `queryAuditEvents()` yang sudah ada. Sengaja tanpa
 * retry: sumbernya store in-memory proses, retry tidak menambahAvailability.
 */
export function queryLogs(input: unknown): LogPage {
  const parsed = logQuerySchema.safeParse(input ?? {});

  if (!parsed.success) {
    return { items: [], total: 0, page: 1, pageSize: 25, totalPages: 1 };
  }

  return queryAuditEvents(parsed.data);
}

export function getForecastInventory(): {
  sources: readonly LogSourceForecast[];
  totals: ReturnType<typeof getForecastTotals>;
  byTier: Record<LogSourceTier, LogSourceForecast[]>;
} {
  return {
    sources: LOG_SOURCE_FORECASTS,
    totals: getForecastTotals(),
    byTier: {
      required: getForecastByTier("required"),
      recommended: getForecastByTier("recommended"),
      "not-recommended": getForecastByTier("not-recommended"),
      prohibited: getForecastByTier("prohibited"),
    },
  };
}

export function getGenerationInventory(): {
  classifications: SourceClassification[];
  allowed: LogEventTypePolicy[];
  prohibited: LogEventTypePolicy[];
  policy: GenerationPolicy;
} {
  return {
    classifications: getSourceClassifications(),
    allowed: getAllowedEventTypes(),
    prohibited: getProhibitedEventTypes(),
    policy: GENERATION_POLICY,
  };
}

export function getStorageInventory(): {
  retention: typeof RETENTION_POLICIES;
  transfers: typeof TRANSFER_POLICIES;
  transferMethods: typeof TRANSFER_METHODS;
  correlationRules: typeof CORRELATION_RULES;
  dataReduction: typeof DATA_REDUCTION_RULES;
  formats: typeof LOG_FORMATS;
  protection: typeof STORAGE_PROTECTION;
  monitoring: typeof STORAGE_MONITORING_CHECKS;
  capacity: StorageCapacity;
} {
  return {
    retention: RETENTION_POLICIES,
    transfers: TRANSFER_POLICIES,
    transferMethods: TRANSFER_METHODS,
    correlationRules: CORRELATION_RULES,
    dataReduction: DATA_REDUCTION_RULES,
    formats: LOG_FORMATS,
    protection: STORAGE_PROTECTION,
    monitoring: STORAGE_MONITORING_CHECKS,
    capacity: getStorageCapacity(),
  };
}

export function getAccessInventory(): {
  grants: typeof ACCESS_MATRIX;
  modes: typeof ACCESS_MODE_POLICIES;
  protections: typeof ACCESS_PROTECTIONS;
  loggingRules: typeof ACCESS_LOGGING_RULES;
  preservationOrder: typeof PRESERVATION_ORDER;
  preservationBaseline: ReturnType<typeof getPreservationBaseline>;
  monitoring: typeof ACCESS_MONITORING_CHECKS;
} {
  return {
    grants: ACCESS_MATRIX,
    modes: ACCESS_MODE_POLICIES,
    protections: ACCESS_PROTECTIONS,
    loggingRules: ACCESS_LOGGING_RULES,
    preservationOrder: PRESERVATION_ORDER,
    preservationBaseline: getPreservationBaseline(),
    monitoring: ACCESS_MONITORING_CHECKS,
  };
}

export function getDisposalInventory(): {
  policies: typeof DISPOSAL_POLICIES;
  prevention: typeof UNAUTHORIZED_DISPOSAL_PREVENTION;
  verificationSteps: typeof DISPOSAL_VERIFICATION_STEPS;
  queue: DisposalQueueItem[];
  pending: DisposalQueueItem[];
  pendingCount: number;
} {
  const queue = getDisposalQueue();

  return {
    policies: DISPOSAL_POLICIES,
    prevention: UNAUTHORIZED_DISPOSAL_PREVENTION,
    verificationSteps: DISPOSAL_VERIFICATION_STEPS,
    queue,
    pending: getPendingDisposals(),
    pendingCount: getPendingDisposals().length,
  };
}

export function getLogAnalysisSnapshot(now = Date.now()): LogAnalysis {
  return runLogAnalysis(now);
}

export function getIntegrityState(): IntegrityVerification {
  return getLastIntegrityVerification();
}

export type LogOverview = {
  totalEntries: number;
  maxEntries: number;
  usedPercent: number;
  failed24h: number;
  critical24h: number;
  integrity: IntegrityVerification;
  pendingDisposals: number;
  analysis: LogAnalysis;
  recent: AuditEvent[];
};

export function getLogOverview(now = Date.now()): LogOverview {
  const summary = getAuditSummary(now);
  const capacity = getStorageCapacity();
  const analysis = runLogAnalysis(now);
  const { items } = queryLogs({ pageSize: 10 });

  return {
    totalEntries: capacity.totalEntries,
    maxEntries: capacity.maxEntries,
    usedPercent: capacity.usedPercent,
    failed24h: summary.failures24h,
    critical24h: summary.critical24h,
    integrity: getLastIntegrityVerification(),
    pendingDisposals: getPendingDisposals(now).length,
    analysis,
    recent: items,
  };
}

export type { LogQuery };
