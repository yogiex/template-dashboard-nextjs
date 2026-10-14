import type { Metadata } from "next";
import { Suspense } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { CreateTeamButton } from "@/features/team/components/create-team-button";
import { DataTableToolbar } from "@/features/team/components/data-table-toolbar";
import { TeamTable } from "@/features/team/components/team-table";
import { getTeamMembers } from "@/features/team/service";
import { teamQuerySchema } from "@/features/team/schema";

export const metadata: Metadata = { title: "Team" };

function TeamFallback() {
  return (
    <div className="space-y-4">
      <div className="h-10 w-full animate-pulse rounded bg-muted" />
      <div className="h-48 animate-pulse rounded bg-muted" />
    </div>
  );
}

async function TeamContent() {
  const query = teamQuerySchema.parse({});
  const result = await getTeamMembers(query);
  return (
    <PageShell
      title="Team"
      description="Kelola anggota tim dan peran mereka."
      actions={<CreateTeamButton />}
    >
      <div className="space-y-4">
        <DataTableToolbar initialQuery={query.q} initialRole={query.role} />
        <TeamTable result={result} query={query} />
      </div>
    </PageShell>
  );
}

export default function TeamPage() {
  return (
    <Suspense fallback={<TeamFallback />}>
      <TeamContent />
    </Suspense>
  );
}
