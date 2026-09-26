import Link from "next/link";

import { RiskBadge } from "@/features/ueba/components/risk-badge";
import type { UebaPageConfig } from "@/config/observability";
import type { UserRiskProfile } from "@/features/ueba/types";

interface UserRiskTableProps {
  profiles: UserRiskProfile[];
  config: UebaPageConfig;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("id-ID");
}

export function UserRiskTable({ profiles, config }: UserRiskTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th scope="col" className="px-4 py-3 text-left font-medium">
              {config.tableHeaders.actor}
            </th>
            <th scope="col" className="px-4 py-3 text-left font-medium">
              {config.tableHeaders.risk}
            </th>
            <th scope="col" className="px-4 py-3 text-left font-medium">
              {config.tableHeaders.anomalies}
            </th>
            <th scope="col" className="px-4 py-3 text-left font-medium">
              {config.tableHeaders.lastSeen}
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              <span className="sr-only">{config.tableHeaders.action}</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {profiles.map((profile) => (
            <tr key={profile.actorId} className="hover:bg-muted/30">
              <td className="px-4 py-3 font-mono text-xs">
                {profile.actorId.slice(0, 16)}…
              </td>
              <td className="px-4 py-3">
                <RiskBadge
                  level={profile.level}
                  score={profile.riskScore}
                  label={config.levelLabels[profile.level]}
                />
              </td>
              <td className="px-4 py-3 tabular-nums">{profile.totalAnomalies}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {formatDateTime(profile.lastUpdated)}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/settings/ueba/${encodeURIComponent(profile.actorId)}`}
                  className="text-xs underline-offset-4 hover:underline"
                >
                  Detail
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
