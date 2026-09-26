"use client";

import { type ReactNode, useMemo } from "react";
import { FileSearchIcon } from "lucide-react";

import { cn } from "cn";

import { CopyButton } from "@/components/custom/copy-button";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { AUDIT_PAGE_CONFIG } from "@/config/audit-page";
import type { AuditEvent } from "@/features/audit/types";

export interface AuditDetailSheetProps {
  event: AuditEvent;
}

/**
 * `timeZone` eksplisit supaya hasil render sama di server dan browser; tanpa itu
 * `Intl.DateTimeFormat` memakai timezone runtime dan memicu hydration mismatch.
 * TODO: template ini belum punya preferensi format tanggal per user. Kalau
 * someday ada (mis. `config/appearance.ts`), waktu di sini harus mengikuti
 * preferensi itu dan angka offset ikut ditampilkan agar tidak ambigu.
 */
const EVENT_TIME_ZONE = "Asia/Jakarta";

/** Dibuat satu kali di modul, bukan per render. */
const EVENT_TIME_FORMAT = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "medium",
  timeZone: EVENT_TIME_ZONE,
});

/** Batas tinggi blok metadata supaya objek raksasa tidak merusak layout sheet. */
const METADATA_MAX_HEIGHT_CLASS = "max-h-64";

function formatEventTime(timestamp: string): string {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return EVENT_TIME_FORMAT.format(date);
}

function serializeMetadata(metadata: AuditEvent["metadata"]): string | null {
  if (!metadata || Object.keys(metadata).length === 0) {
    return null;
  }

  try {
    return JSON.stringify(metadata, null, 2);
  } catch {
    return null;
  }
}

interface FieldProps {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
  /** Kontrol opsional di sisi nilai (mis. tombol salin hash). */
  action?: ReactNode;
}

function Field({ label, value, mono = false, className, action }: FieldProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 border-b border-border py-2.5 last:border-b-0 sm:flex-row sm:items-baseline sm:gap-4",
        action && "sm:items-center",
        className,
      )}
    >
      <dt className="shrink-0 text-xs text-muted-foreground sm:w-40">
        {label}
      </dt>
      <dd className="flex min-w-0 flex-1 items-center gap-1.5">
        <span
          className={cn(
            "min-w-0 break-all text-sm text-foreground",
            mono && "font-mono text-xs",
          )}
        >
          {value}
        </span>
        {action}
      </dd>
    </div>
  );
}

function MetadataBlock({ event }: { event: AuditEvent }) {
  const serialized = useMemo(
    () => serializeMetadata(event.metadata),
    [event.metadata],
  );

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-muted-foreground">
        {AUDIT_PAGE_CONFIG.detail.fields.metadata}
      </span>
      {serialized === null ? (
        <p className="text-sm text-muted-foreground">
          {AUDIT_PAGE_CONFIG.detail.metadataEmpty}
        </p>
      ) : (
        <pre
          aria-label={AUDIT_PAGE_CONFIG.detail.fields.metadata}
          className={cn(
            "overflow-auto rounded-md border border-border bg-muted/30 p-3 font-mono text-xs whitespace-pre-wrap text-foreground",
            METADATA_MAX_HEIGHT_CLASS,
          )}
        >
          {serialized}
        </pre>
      )}
    </div>
  );
}

export function AuditDetailSheet({ event }: AuditDetailSheetProps) {
  const { detail, options } = AUDIT_PAGE_CONFIG;
  const { fields } = detail;
  const actor = event.actor;

  const resourceValues = event.resource
    ? [event.resource.type, event.resource.id, event.resource.name]
        .filter(
          (value): value is string =>
            typeof value === "string" && value.length > 0,
        )
        .join(" · ")
    : null;

  const requestValues = [event.requestId, event.host, event.userAgent].filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );

  return (
    <Sheet>
      <SheetTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`${detail.open}: ${event.action}`}
          />
        }
      >
        <FileSearchIcon aria-hidden="true" />
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto sm:max-w-lg"
      >
        <SheetHeader>
          <SheetTitle className="break-all font-mono text-sm">
            {event.action}
          </SheetTitle>
          <SheetDescription className="break-all font-mono text-xs">
            {event.id}
          </SheetDescription>
        </SheetHeader>

        <Separator />

        <div className="flex flex-col gap-5 px-4 pb-4">
          <dl className="flex flex-col">
            <Field
              label={fields.time}
              value={formatEventTime(event.timestamp)}
            />
            <Field
              label={fields.category}
              value={options.category[event.category]}
            />
            <Field
              label={fields.severity}
              value={options.severity[event.severity]}
            />
            <Field label={fields.result} value={options.result[event.result]} />
            <Field label={fields.source} value={event.source} mono />
          </dl>

          {actor === undefined ? null : (
            <dl className="flex flex-col">
              {actor.id === undefined ? null : (
                <Field label={fields.actorId} value={actor.id} mono />
              )}
              {actor.email === undefined ? null : (
                <Field label={fields.actorEmail} value={actor.email} mono />
              )}
              {actor.role === undefined ? null : (
                <Field label={fields.actorRole} value={actor.role} mono />
              )}
            </dl>
          )}

          {resourceValues === null ? null : (
            <dl className="flex flex-col">
              <Field label={fields.resource} value={resourceValues} mono />
            </dl>
          )}

          {requestValues.length > 0 ? (
            <dl className="flex flex-col">
              {event.requestId === undefined ? null : (
                <Field label={fields.requestId} value={event.requestId} mono />
              )}
              {event.host === undefined ? null : (
                <Field label={fields.host} value={event.host} mono />
              )}
              {event.userAgent === undefined ? null : (
                <Field label={fields.userAgent} value={event.userAgent} mono />
              )}
            </dl>
          ) : null}

          <dl className="flex flex-col">
            <Field label={fields.eventId} value={event.id} mono />
            <Field
              label={fields.previousHash}
              value={event.previousHash ?? detail.notAvailable}
              mono
            />
            <Field
              label={fields.hash}
              value={event.hash}
              mono
              action={
                <CopyButton
                  value={event.hash}
                  label={detail.copyHash}
                  className="shrink-0"
                />
              }
            />
          </dl>

          <MetadataBlock event={event} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
