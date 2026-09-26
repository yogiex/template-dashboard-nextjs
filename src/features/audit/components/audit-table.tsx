import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/custom/empty-state";
import { AUDIT_PAGE_CONFIG } from "@/config/audit-page";
import {
  AuditCategoryBadge,
  AuditResultBadge,
  AuditSeverityBadge,
} from "@/features/audit/components/audit-badge";
import { AuditDetailSheet } from "@/features/audit/components/audit-detail-sheet";
import type { AuditEvent } from "@/features/audit/types";

/**
 * Satu formatter untuk seluruh halaman; `Intl.DateTimeFormat` mahal dibuat.
 * Tanpa `timeZone`, nilai dirender pada timezone runtime server (lokal),
 * bukan UTC — deliberate, supaya waktu yang dibaca operator sesuai jamnya.
 */
const TIME_FORMAT = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "short",
  timeStyle: "medium",
});

/** `timestamp` gagal divalidasi (legacy/manual) → tampilkan nilai mentah. */
function formatTimestamp(value: string): string {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return TIME_FORMAT.format(parsed);
}

function formatResource(event: AuditEvent): string | null {
  if (!event.resource) {
    return null;
  }

  return `${event.resource.type} · ${event.resource.id}`;
}

function formatActor(event: AuditEvent): string {
  return (
    event.actor?.email ??
    event.actor?.id ??
    AUDIT_PAGE_CONFIG.detail.notAvailable
  );
}

interface AuditTableProps {
  events: AuditEvent[];
}

/**
 * Tabel audit read-only. Presentasional murni: halaman sudah mengambil dan
 * memfilter event di server, komponen ini tidak menyentuh store/service.
 */
export function AuditTable({ events }: AuditTableProps) {
  const config = AUDIT_PAGE_CONFIG;
  const columns = config.columns;

  if (events.length === 0) {
    return (
      <EmptyState
        title={config.empty.title}
        description={config.empty.description}
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableCaption className="sr-only">
          {`${config.title}: ${config.description}`}
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col" className="w-44">
              {columns.time}
            </TableHead>
            <TableHead scope="col" className="w-32">
              {columns.category}
            </TableHead>
            <TableHead scope="col">{columns.action}</TableHead>
            <TableHead scope="col" className="hidden w-48 md:table-cell">
              {columns.actor}
            </TableHead>
            <TableHead scope="col" className="w-28">
              {columns.result}
            </TableHead>
            <TableHead scope="col" className="w-16 text-right">
              {columns.detail}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => {
            const resource = formatResource(event);

            return (
              <TableRow key={event.id}>
                <TableCell className="font-mono text-xs tabular-nums">
                  <time dateTime={event.timestamp}>
                    {formatTimestamp(event.timestamp)}
                  </time>
                </TableCell>
                <TableCell className="text-xs">
                  <AuditCategoryBadge category={event.category} />
                </TableCell>
                <TableCell className="whitespace-normal">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs">{event.action}</span>
                    {event.severity !== "info" ? (
                      <AuditSeverityBadge severity={event.severity} />
                    ) : null}
                  </span>
                  {resource ? (
                    <span
                      className="mt-1 block max-w-64 truncate text-xs text-muted-foreground"
                      title={resource}
                    >
                      {resource}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="hidden max-w-48 truncate text-xs text-muted-foreground md:table-cell">
                  {formatActor(event)}
                </TableCell>
                <TableCell className="text-xs">
                  <AuditResultBadge result={event.result} />
                </TableCell>
                <TableCell className="text-right">
                  {/* Nama aksesibel tombol ada pada trigger sheet. */}
                  <AuditDetailSheet event={event} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export type { AuditTableProps };
