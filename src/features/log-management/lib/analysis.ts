import "server-only";

import { queryAuditEvents } from "@/features/audit/service";
import { verifyAuditIntegrity } from "@/features/audit/service";
import type { AuditEvent, AuditSeverity } from "@/features/audit/schema";
import { getStorageCapacity } from "@/features/log-management/lib/storage";

/**
 * Chapter 5 — Analisis log (NIST SP 800-92 §5).
 *
 * SEMUA angka dihitung dari event audit nyata lewat `queryAuditEvents()`.
 * Tidak ada angka hardcode; nilai kosong berarti memang tidak ada pola.
 */

const HOUR_MS = 60 * 60 * 1000;
/** Batas halaman yang dibaca supaya analisis tidak membaca tanpa batas. */
const MAX_PAGES = 20;

export type AnalysisRuleId =
  | "brute-force"
  | "privilege-escalation"
  | "exfiltration"
  | "new-device";

export type AnalysisFinding = {
  ruleId: AnalysisRuleId;
  severity: AuditSeverity;
  /** Jumlah entity yang cocok; 0 berarti tidak ada temuan. */
  matches: number;
  /** Ringkasan numerik yang bisa dibaca, sudah dihitung dari data. */
  observed: string;
  entities: string[];
};

export type MonitoringStatus = "ok" | "warning" | "critical" | "unknown";

export type MonitoringCheck = {
  id: string;
  status: MonitoringStatus;
  observed: string;
};

export type IncidentResponseLink = {
  id: string;
  condition: string;
  action: string;
  targetMinutes: number;
};

export type LogAnalysis = {
  windowHours: number;
  analyzedAt: string;
  eventsScanned: number;
  /** True bila analyze kehabisan halaman sebelum semua entry habis. */
  truncated: boolean;
  findings: AnalysisFinding[];
  monitoring: MonitoringCheck[];
  incidentResponse: IncidentResponseLink[];
};

/**
 * Membaca seluruh entry dalam jendela waktu memakai `queryAuditEvents()`.
 * `queryAuditStore` mengembalikan item terbaru lebih dulu dan `pageSize`
 * dibatasi 100, jadi halaman dibaca berurutan sampai habis atau batas reached.
 */
function collectWindow(from: number, to: number): {
  events: AuditEvent[];
  truncated: boolean;
} {
  const events: AuditEvent[] = [];
  let truncated = false;
  let page = 1;
  let totalPages = 1;

  do {
    const result = queryAuditEvents({
      from: new Date(from).toISOString(),
      to: new Date(to).toISOString(),
      page,
      pageSize: 100,
    });

    events.push(...result.items);
    totalPages = result.totalPages;
    page += 1;

    if (page > MAX_PAGES) {
      truncated = page <= totalPages;
      break;
    }
  } while (page <= totalPages);

  return { events, truncated };
}

function findBruteForce(events: AuditEvent[], windowHours: number): AnalysisFinding {
  const windowMs = windowHours * HOUR_MS;
  const actors = new Map<string, AuditEvent[]>();

  for (const event of events) {
    if (event.category !== "auth" || event.result === "success") {
      continue;
    }

    const rawIp = event.metadata?.ipHash;
    const key =
      event.actor?.id ??
      (typeof rawIp === "string" ? rawIp : "unknown");
    actors.set(key, [...(actors.get(key) ?? []), event]);
  }

  const bursts: string[] = [];

  for (const [actor, list] of actors) {
    const timestamps = list.map((event) => Date.parse(event.timestamp)).sort((a, b) => a - b);

    for (let index = 0; index < timestamps.length; index += 1) {
      const start = timestamps[index];
      const count = timestamps.filter((value) => value - start < windowMs).length;

      if (count >= 5) {
        bursts.push(actor);
        break;
      }
    }
  }

  const uniqueBursts = [...new Set(bursts)];
  const failures = events.filter(
    (event) => event.category === "auth" && event.result !== "success",
  ).length;

  return {
    ruleId: "brute-force",
    severity: uniqueBursts.length > 0 ? "critical" : "info",
    matches: uniqueBursts.length,
    observed:
      uniqueBursts.length > 0
        ? `${uniqueBursts.length} aktor dengan minimal 5 kegagalan autentikasi dalam ${windowHours} jam (total kegagalan: ${failures}).`
        : `Tidak ada burst kegagalan autentikasi dalam ${windowHours} jam dari ${failures} kegagalan tercatat.`,
    entities: uniqueBursts,
  };
}

function findPrivilegeEscalation(
  events: AuditEvent[],
  windowHours: number,
): AnalysisFinding {
  const escalationEvents = events.filter((event) => {
    if (event.category === "authz") {
      return event.result !== "success" || event.action.includes("role");
    }

    return event.action.includes("role") || event.action.includes("permission");
  });

  const failures = escalationEvents.filter((event) => event.result !== "success");

  return {
    ruleId: "privilege-escalation",
    severity: failures.length > 0 ? "warning" : "info",
    matches: escalationEvents.length,
    observed:
      escalationEvents.length > 0
        ? `${escalationEvents.length} event perubahan hak akses dalam ${windowHours} jam, ${failures.length} di antaranya gagal.`
        : `Tidak ada event perubahan hak akses dalam ${windowHours} jam.`,
    entities: [
      ...new Set(escalationEvents.map((event) => event.actor?.id ?? "unknown")),
    ].slice(0, 10),
  };
}

function findExfiltration(events: AuditEvent[], windowHours: number): AnalysisFinding {
  const dataEvents = events.filter(
    (event) => event.category === "data" || event.action.includes("export"),
  );
  const exports = dataEvents.filter(
    (event) => event.action.includes("export") || event.action.includes("download"),
  );
  const highVolumeActors = new Set<string>();

  for (const event of exports) {
    const rows = event.metadata?.rows;

    if (typeof rows === "number" && rows >= 1000) {
      highVolumeActors.add(event.actor?.id ?? "unknown");
    }
  }

  return {
    ruleId: "exfiltration",
    severity: highVolumeActors.size > 0 ? "critical" : "info",
    matches: exports.length,
    observed:
      exports.length > 0
        ? `${exports.length} aktivitas ekspor dalam ${windowHours} jam; ${highVolumeActors.size} aktor mengekspor minimal 1000 baris.`
        : `Tidak ada aktivitas ekspor dalam ${windowHours} jam dari ${dataEvents.length} event data.`,
    entities: [...highVolumeActors],
  };
}

function findNewDevice(events: AuditEvent[]): AnalysisFinding {
  const userAgentsByActor = new Map<string, Set<string>>();

  for (const event of events) {
    if (!event.actor?.id || !event.userAgent) {
      continue;
    }

    const seen = userAgentsByActor.get(event.actor.id) ?? new Set<string>();
    seen.add(event.userAgent);
    userAgentsByActor.set(event.actor.id, seen);
  }

  const multiDevice = [...userAgentsByActor.entries()]
    .filter(([, agents]) => agents.size > 1)
    .map(([actorId]) => actorId);

  return {
    ruleId: "new-device",
    severity: multiDevice.length > 0 ? "warning" : "info",
    matches: multiDevice.length,
    observed:
      userAgentsByActor.size === 0
        ? "Tidak ada event dengan user agent, aturan perangkat baru tidak dapat dihitung."
        : `${multiDevice.length} dari ${userAgentsByActor.size} aktor terlihat memakai lebih dari satu user agent.`,
    entities: multiDevice,
  };
}

function buildMonitoring(
  events: AuditEvent[],
  windowHours: number,
  now: number,
  truncated: boolean,
): MonitoringCheck[] {
  const checks: MonitoringCheck[] = [];

  // Silence check: event terakhir dalam jendela.
  const lastEventAt = events.reduce<string | null>((latest, event) => {
    if (latest === null || event.timestamp > latest) {
      return event.timestamp;
    }

    return latest;
  }, null);

  if (lastEventAt === null) {
    checks.push({
      id: "silence",
      status: "warning",
      observed: `Tidak ada event sama sekali dalam ${windowHours} jam terakhir.`,
    });
  } else {
    const idleMs = now - Date.parse(lastEventAt);
    const idleHours = Math.round((idleMs / HOUR_MS) * 10) / 10;

    checks.push({
      id: "silence",
      status: idleMs > windowHours * HOUR_MS ? "critical" : "ok",
      observed: `Event terakhir ${idleHours} jam lalu.`,
    });
  }

  // Error rate.
  const failures = events.filter((event) => event.result !== "success").length;
  const errorRate = events.length === 0 ? 0 : (failures / events.length) * 100;
  const roundedErrorRate = Math.round(errorRate * 10) / 10;

  checks.push({
    id: "error-rate",
    status:
      events.length === 0 ? "unknown" : roundedErrorRate > 20 ? "critical" : roundedErrorRate > 5 ? "warning" : "ok",
    observed: `${roundedErrorRate}% dari ${events.length} event berakhir bukan sukses.`,
  });

  // Capacity.
  const capacity = getStorageCapacity();
  checks.push({
    id: "capacity",
    status:
      capacity.usedPercent > 90
        ? "critical"
        : capacity.usedPercent > 80
          ? "warning"
          : "ok",
    observed: `${capacity.usedPercent}% dari ${capacity.maxEntries} entry terpakai, ${capacity.droppedEntries} entry terpotong.`,
  });

  // Integrity.
  const integrity = verifyAuditIntegrity();
  checks.push({
    id: "integrity",
    status: integrity.brokenAtIndex === -1 ? "ok" : "critical",
    observed:
      integrity.brokenAtIndex === -1
        ? `${integrity.checkedEntries} entry terverifikasi, rantai utuh.`
        : `Rantai rusak pada indeks ${integrity.brokenAtIndex} dari ${integrity.checkedEntries} entry.`,
  });

  // Kelengkapan pembacaan.
  if (truncated) {
    checks.push({
      id: "coverage",
      status: "warning",
      observed: `Analisis berhenti di ${MAX_PAGES} halaman; sebagian event belum diperiksa.`,
    });
  }

  return checks;
}

export const INCIDENT_RESPONSE_LINKS: readonly IncidentResponseLink[] = [
  {
    id: "critical-finding",
    condition: "Aturan analisis menghasilkan temuan severity `critical`.",
    action: "Buka insiden, batasi akun terkait, dan kumpulkan log 30 hari terakhir.",
    targetMinutes: 30,
  },
  {
    id: "integrity-break",
    condition: "Verifikasi rantai hash melaporkan indeks rusak.",
    action: "Isolasi sumber log, simpan salinan untuk forensik, dan Jangan hapus apa pun.",
    targetMinutes: 15,
  },
  {
    id: "silence",
    condition: "Monitoring melaporkan kondisi diam lebih lama dari jendela analisis.",
    action: "Periksa agent pengumpul log dan sumber logging sebelum menyatakan sistem sehat.",
    targetMinutes: 60,
  },
  {
    id: "capacity",
    condition: "Pemakaian store di atas ambang 80% atau ada entry terpotong.",
    action: "Terapkan data reduction dan naikkan tier archive lebih cepat.",
    targetMinutes: 120,
  },
];

export function runLogAnalysis(
  now = Date.now(),
  windowHours = 24,
): LogAnalysis {
  const from = now - windowHours * HOUR_MS;
  const { events, truncated } = collectWindow(from, now);

  const findings: AnalysisFinding[] = [
    findBruteForce(events, windowHours),
    findPrivilegeEscalation(events, windowHours),
    findExfiltration(events, windowHours),
    findNewDevice(events),
  ];

  return {
    windowHours,
    analyzedAt: new Date(now).toISOString(),
    eventsScanned: events.length,
    truncated,
    findings,
    monitoring: buildMonitoring(events, windowHours, now, truncated),
    incidentResponse: [...INCIDENT_RESPONSE_LINKS],
  };
}
