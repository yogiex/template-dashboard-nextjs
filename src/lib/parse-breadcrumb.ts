import type { NavItem } from "@/config/site";

export const MAX_BREADCRUMB_DEPTH = 5;
export const MAX_BREADCRUMB_LABEL_LENGTH = 40;

export type BreadcrumbNavItem = Pick<NavItem, "title" | "href">;
export type BreadcrumbCrumb = {
  label: string;
  href: string;
};
export type BreadcrumbLabels = Readonly<Record<string, string>>;
export type ParseBreadcrumbOptions = {
  rootLabel?: string;
  maxDepth?: number;
  maxLabelLength?: number;
};

function finitePositiveInteger(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? value
    : fallback;
}

function sanitizeLabel(value: unknown, maxLength: number): string {
  if (typeof value !== "string") {
    return "";
  }

  const sanitized = value
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (sanitized.length <= maxLength) {
    return sanitized;
  }

  if (maxLength === 1) {
    return "…";
  }

  return `${sanitized.slice(0, maxLength - 1).trimEnd()}…`;
}

function humanize(segment: string): string {
  const words = segment
    .replace(/[-_]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return words
    .map((word) => `${word.charAt(0).toLocaleUpperCase()}${word.slice(1)}`)
    .join(" ");
}

function decodeSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function pathnameFromInput(value: unknown): string {
  if (typeof value !== "string") {
    return "/";
  }

  try {
    const url = new URL(value, "https://breadcrumb.invalid");
    return url.pathname;
  } catch {
    return "/";
  }
}

function normalizedHref(value: unknown): string | null {
  const pathname = pathnameFromInput(value);
  if (pathname === "/") {
    return "/";
  }

  return pathname.replace(/\/+$/, "") || "/";
}

function labelForHref(
  href: string,
  navItems: readonly BreadcrumbNavItem[],
  manualLabels: BreadcrumbLabels,
): string | null {
  for (const item of navItems) {
    if (item && normalizedHref(item.href) === href && typeof item.title === "string") {
      return item.title;
    }
  }

  const pathLabel = manualLabels[href];
  if (typeof pathLabel === "string") {
    return pathLabel;
  }

  const segment = href.split("/").filter(Boolean).at(-1);
  return segment ? (manualLabels[decodeSegment(segment)] ?? null) : null;
}

const rootHref = "/";

export function parseBreadcrumb(
  pathname: string,
  navItems: readonly BreadcrumbNavItem[] = [],
  manualLabels: BreadcrumbLabels = {},
  options: ParseBreadcrumbOptions = {},
): BreadcrumbCrumb[] {
  try {
    const maxDepth = finitePositiveInteger(
      options.maxDepth,
      MAX_BREADCRUMB_DEPTH,
    );
    const maxLabelLength = finitePositiveInteger(
      options.maxLabelLength,
      MAX_BREADCRUMB_LABEL_LENGTH,
    );
    const rootLabel =
      labelForHref(rootHref, navItems, manualLabels) ??
      options.rootLabel ??
      "Home";
    const crumbs: BreadcrumbCrumb[] = [
      {
        label: sanitizeLabel(rootLabel, maxLabelLength) || "Home",
        href: rootHref,
      },
    ];

    const segments = pathnameFromInput(pathname)
      .split("/")
      .filter(Boolean)
      .slice(0, maxDepth - 1);

    // Akumulasi href dimulai dari string kosong, BUKAN `rootHref`. Menyemai
    // dengan "/" lalu menambahkan "/segment" menghasilkan "//dashboard" —
    // protocol-relative URL yang resolve ke host lain, dan yang lebih penting
    // membuat `labelForHref` gagal mencocokkan nav item (perbandingan
    // "/dashboard" === "//dashboard" selalu salah), sehingga judul nav jatuh
    // ke `humanize()` dan bahasa berubah menjadi Inggris.
    let prefix = "";
    for (const segment of segments) {
      prefix = `${prefix}/${segment}`;
      const decodedSegment = decodeSegment(segment);
      const configuredLabel = labelForHref(prefix, navItems, manualLabels);
      const label =
        sanitizeLabel(configuredLabel, maxLabelLength) ||
        sanitizeLabel(manualLabels[decodedSegment], maxLabelLength) ||
        sanitizeLabel(humanize(decodedSegment), maxLabelLength) ||
        "…";

      crumbs.push({ label, href: prefix });
    }

    return crumbs;
  } catch {
    return [{ label: "Home", href: rootHref }];
  }
}
