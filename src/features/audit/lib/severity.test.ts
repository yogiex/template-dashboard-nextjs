import { describe, expect, it } from "vitest";

import {
  DEFAULT_SEVERITY,
  normalizeSeverity,
} from "@/features/audit/lib/severity";
import {
  AUDIT_CATEGORIES,
  AUDIT_SEVERITIES,
  type AuditCategory,
} from "@/features/audit/schema";

describe("DEFAULT_SEVERITY", () => {
  it("mencakup seluruh kategori yang ada di schema tanpa kategori tambahan", () => {
    expect(Object.keys(DEFAULT_SEVERITY).sort()).toEqual(
      [...AUDIT_CATEGORIES].sort(),
    );
  });

  it("hanya memakai severity yang dikenal di schema", () => {
    for (const category of AUDIT_CATEGORIES) {
      expect(AUDIT_SEVERITIES).toContain(DEFAULT_SEVERITY[category]);
    }
  });

  it("menaikkan authz, config, security, dan log ke warning", () => {
    expect(DEFAULT_SEVERITY.authz).toBe("warning");
    expect(DEFAULT_SEVERITY.config).toBe("warning");
    expect(DEFAULT_SEVERITY.security).toBe("warning");
    expect(DEFAULT_SEVERITY.log).toBe("warning");
  });

  it("menahan auth dan data di info karena mayoritas event-nya sukses", () => {
    expect(DEFAULT_SEVERITY.auth).toBe("info");
    expect(DEFAULT_SEVERITY.data).toBe("info");
  });

  it("tidak pernah memberi default critical karena eskalasi harus eksplisit", () => {
    const defaults = AUDIT_CATEGORIES.map(
      (category) => DEFAULT_SEVERITY[category],
    );

    expect(defaults).not.toContain("critical");
  });
});

describe("normalizeSeverity", () => {
  it("menaikkan event security/info ke warning", () => {
    expect(normalizeSeverity("security", "info")).toBe("warning");
  });

  it("membiarkan event security/warning tetap warning", () => {
    expect(normalizeSeverity("security", "warning")).toBe("warning");
  });

  it("meneruskan critical tanpa diturunkan pada semua kategori", () => {
    for (const category of AUDIT_CATEGORIES) {
      expect(normalizeSeverity(category, "critical")).toBe("critical");
    }
  });

  it("meneruskan nilai pemanggil apa adanya untuk kategori tanpa lantai khusus", () => {
    for (const category of ["auth", "authz", "data", "config", "log"] as const) {
      for (const severity of AUDIT_SEVERITIES) {
        expect(normalizeSeverity(category, severity)).toBe(severity);
      }
    }
  });

  it("tidak pernah menurunkan severity di bawah nilai yang diminta", () => {
    for (const category of AUDIT_CATEGORIES) {
      for (const severity of AUDIT_SEVERITIES) {
        const requested = AUDIT_SEVERITIES.indexOf(severity);
        const resolved = AUDIT_SEVERITIES.indexOf(
          normalizeSeverity(category, severity),
        );

        expect(resolved).toBeGreaterThanOrEqual(requested);
      }
    }
  });

  it("selalu menghasilkan severity yang dikenal di schema", () => {
    for (const category of AUDIT_CATEGORIES) {
      for (const severity of AUDIT_SEVERITIES) {
        expect(AUDIT_SEVERITIES).toContain(
          normalizeSeverity(category, severity),
        );
      }
    }
  });

  it("murni: panggilan berulang dengan input sama menghasilkan output identik", () => {
    const categories: AuditCategory[] = [...AUDIT_CATEGORIES];

    for (const category of categories) {
      for (const severity of AUDIT_SEVERITIES) {
        const first = normalizeSeverity(category, severity);
        const second = normalizeSeverity(category, severity);

        expect(second).toBe(first);
      }
    }
  });

  it("murni: DEFAULT_SEVERITY tidak berubah setelah pemanggilan", () => {
    const snapshot = { ...DEFAULT_SEVERITY };

    for (const category of AUDIT_CATEGORIES) {
      for (const severity of AUDIT_SEVERITIES) {
        normalizeSeverity(category, severity);
      }
    }

    expect(DEFAULT_SEVERITY).toEqual(snapshot);
  });
});
