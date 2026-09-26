import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CopyButton } from "@/components/custom/copy-button";
import { IntegrityActions } from "@/features/log-management/components/integrity-actions";
import { LOG_MANAGEMENT_PAGE_CONFIG } from "@/config/log-management";
import type { IntegrityVerification } from "@/features/log-management/lib/schedule";

/**
 * Panel integritas. Menampilkan hasil `verifyAuditIntegrity()` yang dihitung
 * ulang di server, dan waktu verifikasi terakhir dari `globalThis`. Bila belum
 * pernah diverifikasi, panel menyatakannya secara eksplisit.
 */
export function IntegrityPanel({
  verification,
  liveReport,
}: {
  verification: IntegrityVerification;
  liveReport: { brokenAtIndex: number; checkedEntries: number; lastHash: string | null };
}) {
  const config = LOG_MANAGEMENT_PAGE_CONFIG;
  const chainIntact = liveReport.brokenAtIndex === -1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{config.integrityTitle}</CardTitle>
        <CardDescription>{config.integrityDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border p-3">
            <dt className="text-xs text-muted-foreground">
              {config.integrityVerifiedAt}
            </dt>
            <dd className="mt-1 text-sm tabular-nums">
              {verification.lastVerifiedAt === null
                ? config.integrityNeverVerified
                : verification.lastVerifiedAt.replace("T", " ").slice(0, 19)}
            </dd>
          </div>
          <div className="rounded-lg border border-border p-3">
            <dt className="text-xs text-muted-foreground">
              {config.integrityEntriesChecked}
            </dt>
            <dd className="mt-1 text-lg font-semibold tabular-nums">
              {liveReport.checkedEntries}
            </dd>
          </div>
          <div className="rounded-lg border border-border p-3">
            <dt className="text-xs text-muted-foreground">{config.integrityResult}</dt>
            <dd
              className={
                chainIntact
                  ? "mt-1 text-sm font-medium"
                  : "mt-1 text-sm font-medium text-destructive"
              }
            >
              {chainIntact
                ? config.integrityIntact
                : config.integrityBrokenTemplate.replace(
                    "{index}",
                    String(liveReport.brokenAtIndex),
                  )}
            </dd>
          </div>
          <div className="rounded-lg border border-border p-3">
            <dt className="text-xs text-muted-foreground">
              {config.integrityLastHash}
            </dt>
            <dd className="mt-1 flex items-start gap-1">
              <span className="font-mono text-xs break-all">
                {liveReport.lastHash ?? "-"}
              </span>
              {liveReport.lastHash ? (
                <CopyButton
                  value={liveReport.lastHash}
                  label={config.integrityCopyHashLabel}
                />
              ) : null}
            </dd>
          </div>
        </dl>

        <IntegrityActions />
      </CardContent>
    </Card>
  );
}
