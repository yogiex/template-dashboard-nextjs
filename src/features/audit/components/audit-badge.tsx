import type { ComponentProps } from "react";

import { Badge } from "@/components/ui/badge";
import { AUDIT_PAGE_CONFIG } from "@/config/audit-page";
import type {
  AuditCategory,
  AuditResult,
  AuditSeverity,
} from "@/features/audit/schema";
import { cn } from "cn";

export type AuditBadgeVariant = NonNullable<
  ComponentProps<typeof Badge>["variant"]
>;

type AuditBadgeTone = {
  variant: AuditBadgeVariant;
  className?: string;
  /** Token warna untuk titik penanda; `null` berarti tanpa titik. */
  dotClassName?: string;
};

/**
 * `text-risk-medium` di atas `bg-risk-medium/15` hanya mencapai ~2.7:1 di light
 * mode (amber terang di atas ivory), jadi level warning tidak lewat teks
 * berwarna. Label teks sudah membawa makna; warna datang dari token risk
 * pada titik non-teks, yang tetap di atas ambang 3:1 untuk graphics.
 */
export const AUDIT_SEVERITY_TONE: Record<AuditSeverity, AuditBadgeTone> = {
  info: { variant: "secondary", className: "bg-muted text-muted-foreground" },
  warning: {
    variant: "outline",
    dotClassName: "size-1.5 rounded-full bg-risk-medium",
  },
  critical: { variant: "destructive" },
};

/**
 * Enam kategori tidak boleh memakai warna baru, jadi pembeda visual diambil
 * dari set variant Badge yang sudah ada. `security` memakai `destructive`
 * karena kategori itu hanya dipakai untuk event intrusi/abuse, bukan
 * perubahan config biasa. `config` dan `log` sama-sama `ghost`; keduanya
 * dibedakan lewat `border-border` pada `log` (token border yang sudah ada).
 */
export const AUDIT_CATEGORY_TONE: Record<AuditCategory, AuditBadgeTone> = {
  auth: { variant: "default" },
  authz: { variant: "secondary" },
  data: { variant: "outline" },
  config: { variant: "ghost" },
  security: { variant: "destructive" },
  log: { variant: "ghost", className: "border-border" },
};

export const AUDIT_RESULT_TONE: Record<AuditResult, AuditBadgeTone> = {
  success: { variant: "secondary" },
  failure: { variant: "destructive" },
  error: { variant: "outline" },
};

function BadgeDot({ className }: { className: string }) {
  return (
    <span
      aria-hidden="true"
      data-slot="audit-badge-dot"
      className={cn("size-1.5 shrink-0 rounded-full", className)}
    />
  );
}

export type AuditSeverityBadgeProps = {
  severity: AuditSeverity;
  className?: string;
};

export function AuditSeverityBadge({
  severity,
  className,
}: AuditSeverityBadgeProps) {
  const tone = AUDIT_SEVERITY_TONE[severity];

  return (
    <Badge
      variant={tone.variant}
      className={cn(tone.className, className)}
      data-severity={severity}
    >
      {tone.dotClassName ? <BadgeDot className={tone.dotClassName} /> : null}
      {AUDIT_PAGE_CONFIG.options.severity[severity]}
    </Badge>
  );
}

export type AuditCategoryBadgeProps = {
  category: AuditCategory;
  className?: string;
};

export function AuditCategoryBadge({
  category,
  className,
}: AuditCategoryBadgeProps) {
  const tone = AUDIT_CATEGORY_TONE[category];

  return (
    <Badge
      variant={tone.variant}
      className={cn("uppercase tracking-wide", tone.className, className)}
      data-category={category}
    >
      {AUDIT_PAGE_CONFIG.options.category[category]}
    </Badge>
  );
}

export type AuditResultBadgeProps = {
  result: AuditResult;
  className?: string;
};

export function AuditResultBadge({ result, className }: AuditResultBadgeProps) {
  const tone = AUDIT_RESULT_TONE[result];

  return (
    <Badge
      variant={tone.variant}
      className={cn(tone.className, className)}
      data-result={result}
    >
      {AUDIT_PAGE_CONFIG.options.result[result]}
    </Badge>
  );
}
