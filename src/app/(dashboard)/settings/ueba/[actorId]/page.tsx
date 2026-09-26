import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CopyButton } from "@/components/custom/copy-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { UEBA_PAGE_CONFIG } from "@/config/observability";
import { AnomalyFeed } from "@/features/ueba/components/anomaly-feed";
import { RiskBadge } from "@/features/ueba/components/risk-badge";
import { UserTimeline } from "@/features/ueba/components/user-timeline";
import { getActorTimeline } from "@/features/ueba/lib/user-timeline";
import { getUserRiskProfile } from "@/features/ueba/service";

export const metadata: Metadata = {
  title: "Profil Risiko",
  description: "Detail anomali dan baseline untuk satu aktor.",
};

export const dynamic = "force-dynamic";

type UebaActorPageProps = {
  params: Promise<{ actorId: string }>;
};

export default async function UebaActorPage({ params }: UebaActorPageProps) {
  const config = UEBA_PAGE_CONFIG;
  const { actorId } = await params;
  const profile = getUserRiskProfile(actorId);

  if (!profile) {
    notFound();
  }

  const timeline = getActorTimeline(profile.actorId);
  const baselineLabels = config.baselineLabels;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h2 className="flex items-center gap-1.5 text-xl font-semibold tracking-tight">
            {config.detailTitleTemplate.replace("{actorId}", profile.actorId)}
            <CopyButton
              value={profile.actorId}
              label={config.detailCopyActorLabel}
            />
          </h2>
          <RiskBadge
            level={profile.level}
            score={profile.riskScore}
            label={config.levelLabels[profile.level]}
          />
        </div>
        <Button variant="outline" className="h-9" render={<Link href="/settings/ueba" />}>
          {config.detailBackLabel}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{config.detailBaselineTitle}</CardTitle>
            <CardDescription>
              {profile.baseline.available
                ? baselineLabels.available
                : baselineLabels.unavailable}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
              {(
                [
                  [baselineLabels.totalEvents, profile.baseline.totalEvents],
                  [
                    baselineLabels.knownIps,
                    profile.baseline.knownIpCount,
                  ],
                  [
                    baselineLabels.knownDevices,
                    profile.baseline.knownDeviceCount,
                  ],
                  [
                    baselineLabels.lastSeen,
                    profile.baseline.lastSeenAt
                      ? new Date(profile.baseline.lastSeenAt).toLocaleString("id-ID")
                      : "-",
                  ],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3">
                  <dt className="text-sm text-muted-foreground">{label}</dt>
                  <dd className="text-sm tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
            <Separator className="my-4" />
            <p className="text-xs text-muted-foreground">
              {config.detailRecommendationsTitle}
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {config.detailRecommendations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{config.detailAnomalyTitle}</CardTitle>
            <CardDescription>
              {profile.totalAnomalies} anomali dalam 72 jam terakhir
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AnomalyFeed
              anomalies={profile.anomalies}
              config={config}
              emptyLabel={config.detailNoAnomaly}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Aktivitas terbaru</CardTitle>
          <CardDescription>20 event terakhir dari event store.</CardDescription>
        </CardHeader>
        <CardContent>
          <UserTimeline entries={timeline} emptyLabel={config.emptyTitle} />
        </CardContent>
      </Card>
    </div>
  );
}
