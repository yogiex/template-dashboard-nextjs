export type {
  AuditCategory,
  AuditEvent,
  AuditEventInput,
  AuditQuery,
  AuditResult,
  AuditSeverity,
} from "@/features/audit/schema";

export type AuditActor = NonNullable<
  import("@/features/audit/schema").AuditEventInput["actor"]
>;

export type IntegrityReport = {
  /** `-1` bila seluruh rantai valid. */
  brokenAtIndex: number;
  checkedEntries: number;
  lastHash: string | null;
  /**
   * `true` bila `entries[0]` bukan genesis, yaitu entry sebelumnya sudah
   * di-drop karena buffer overflow. Verifikasi hanya mencakup buffer yang
   * tersisa, bukan seluruh stream.
   */
  isPartial: boolean;
  /** `previousHash` dari `entries[0]`; `null` bila rantai utuh sejak genesis. */
  chainOffset: string | null;
  verifiedAt: string;
};
