import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AUDIT_PAGE_CONFIG } from "@/config/audit-page";
import {
  AuditCategoryBadge,
  AuditResultBadge,
  AuditSeverityBadge,
} from "@/features/audit/components/audit-badge";
import {
  AUDIT_CATEGORIES,
  AUDIT_RESULTS,
  AUDIT_SEVERITIES,
} from "@/features/audit/schema";

const HARD_CODED_COLOR =
  /(?:bg|text|border)-(?:red|rose|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|slate|gray|zinc|neutral|stone)-\d+/;

describe("AuditSeverityBadge", () => {
  it("merender label dari config untuk setiap severity", () => {
    for (const severity of AUDIT_SEVERITIES) {
      render(<AuditSeverityBadge severity={severity} />);

      const badge = screen.getByText(
        AUDIT_PAGE_CONFIG.options.severity[severity],
      );

      expect(badge).toBeInTheDocument();
      expect(badge.tagName).toBe("SPAN");
      expect(badge).toHaveAttribute("data-severity", severity);
    }
  });

  it("memakai token semantic, bukan warna hardcode", () => {
    for (const severity of AUDIT_SEVERITIES) {
      const { unmount } = render(<AuditSeverityBadge severity={severity} />);
      const badge = screen.getByText(
        AUDIT_PAGE_CONFIG.options.severity[severity],
      );

      expect(badge.className).not.toMatch(HARD_CODED_COLOR);
      expect(badge.className).not.toContain("#");
      unmount();
    }
  });

  it("membedakan level lewat kelas yang berbeda", () => {
    const classNames = AUDIT_SEVERITIES.map((severity) => {
      const { unmount } = render(<AuditSeverityBadge severity={severity} />);
      const className = screen.getByText(
        AUDIT_PAGE_CONFIG.options.severity[severity],
      ).className;
      unmount();
      return className;
    });

    expect(new Set(classNames).size).toBe(AUDIT_SEVERITIES.length);
  });

  it("memberi tanda non-teks pada warning dan tidak pada info/critical", () => {
    const { unmount } = render(<AuditSeverityBadge severity="warning" />);
    expect(
      screen.getByText(AUDIT_PAGE_CONFIG.options.severity.warning),
    ).toContainElement(document.querySelector("[data-slot='audit-badge-dot']"));
    expect(
      document.querySelector("[data-slot='audit-badge-dot']")?.className,
    ).toContain("bg-risk-medium");
    unmount();

    for (const severity of ["info", "critical"] as const) {
      const view = render(<AuditSeverityBadge severity={severity} />);
      expect(
        view.container.querySelector("[data-slot='audit-badge-dot']"),
      ).toBeNull();
      view.unmount();
    }
  });
});

describe("AuditCategoryBadge", () => {
  it("merender label dari config untuk setiap kategori", () => {
    for (const category of AUDIT_CATEGORIES) {
      render(<AuditCategoryBadge category={category} />);

      const badge = screen.getByText(
        AUDIT_PAGE_CONFIG.options.category[category],
      );

      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute("data-category", category);
    }
  });

  it("menjadikan label uppercase lewat kelas, bukan mengubah isi teks", () => {
    for (const category of AUDIT_CATEGORIES) {
      const { unmount } = render(<AuditCategoryBadge category={category} />);
      const badge = screen.getByText(
        AUDIT_PAGE_CONFIG.options.category[category],
      );

      expect(badge.className).toContain("uppercase");
      expect(badge.textContent).toBe(
        AUDIT_PAGE_CONFIG.options.category[category],
      );
      expect(badge.className).not.toMatch(HARD_CODED_COLOR);
      unmount();
    }
  });

  it("membedakan enam kategori lewat variant Badge yang ada", () => {
    const classNames = AUDIT_CATEGORIES.map((category) => {
      const { unmount } = render(<AuditCategoryBadge category={category} />);
      const className = screen.getByText(
        AUDIT_PAGE_CONFIG.options.category[category],
      ).className;
      unmount();
      return className;
    });

    expect(new Set(classNames).size).toBe(AUDIT_CATEGORIES.length);
  });
});

describe("AuditResultBadge", () => {
  it("merender label dari config untuk setiap hasil", () => {
    for (const result of AUDIT_RESULTS) {
      render(<AuditResultBadge result={result} />);

      const badge = screen.getByText(AUDIT_PAGE_CONFIG.options.result[result]);

      expect(badge).toBeInTheDocument();
      expect(badge).toHaveAttribute("data-result", result);
    }
  });

  it("memetakan hasil ke variant destructive, secondary, dan outline", () => {
    const { unmount } = render(<AuditResultBadge result="failure" />);
    expect(
      screen.getByText(AUDIT_PAGE_CONFIG.options.result.failure).className,
    ).toContain("text-destructive");
    unmount();

    const success = render(<AuditResultBadge result="success" />);
    expect(
      screen.getByText(AUDIT_PAGE_CONFIG.options.result.success).className,
    ).toContain("text-secondary-foreground");
    success.unmount();

    const error = render(<AuditResultBadge result="error" />);
    expect(
      screen.getByText(AUDIT_PAGE_CONFIG.options.result.error).className,
    ).toContain("border-border");
    expect(
      screen.getByText(AUDIT_PAGE_CONFIG.options.result.error).className,
    ).not.toMatch(HARD_CODED_COLOR);
    error.unmount();
  });
});
