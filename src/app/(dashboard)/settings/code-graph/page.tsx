import "server-only";

import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { GitBranch, Network } from "lucide-react";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/custom/empty-state";
import {
  codeGraphConfig,
  cycleCountLabel,
  generatedAtLabel,
  summaryDescription,
  violationCountLabel,
} from "@/config/code-graph";
import { CodeGraph } from "@/features/code-graph/components/code-graph";
import type { CodeGraphData } from "@/features/code-graph/types";

export const metadata: Metadata = {
  title: codeGraphConfig.title,
  description: codeGraphConfig.descriptionTemplate
    .replace("{sourceDir}", "src/")
    .replace("{generatedAt}", "build time"),
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * `graph.json` adalah output build-time statis, jadi membacanya dari disk saat
 * render sudah menghasilkan halaman static. `force-static` sengaja tidak
 * dipakai: opsi itu nol kali muncul di repo ini dan tidak dibutuhkan di sini
 * (`cacheComponents` juga tidak aktif — docs/ARCHITECTURE.md §9).
 */
const GRAPH_PATH = path.join(
  process.cwd(),
  "src/features/code-graph/data/graph.json",
);

/**
 * Validasi minimal di boundary: `graph.json` bisa tidak ada, terpotong, atau
 * dibuat oleh versi transform yang lebih lama. Skema di bawah sengaja dibuat
 * longgar (`.passthrough`/`.optional`) — tujuannya bukan membuktikan kebenaran
 * data, hanya mencegah render crash karena bentuk yang salah. Kegagalan
 * validasi diperlakukan sama seperti file hilang: fallback ke empty state.
 */
const graphNodeSchema = z
  .object({
    id: z.string(),
    label: z.string(),
    category: z.string(),
    type: z.enum(["component", "module", "style", "file"]),
    boundary: z.enum(["server", "client", "server-only"]),
    deps: z.number(),
  })
  .passthrough();

const graphEdgeSchema = z
  .object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
    sourceCat: z.string(),
    targetCat: z.string(),
    crossFeature: z.boolean(),
    violation: z.boolean(),
    boundaryViolation: z.boolean().optional(),
  })
  .passthrough();

const graphStatsSchema = z
  .object({
    totalFiles: z.number(),
    totalEdges: z.number(),
    crossFeatureEdges: z.number(),
    violationEdges: z.number(),
    boundaryViolations: z.number().default(0),
    categories: z.record(z.number()).default({}),
    types: z.record(z.number()).default({}),
    boundaries: z.record(z.number()).default({}),
  })
  .passthrough();

const graphSchema = z
  .object({
    generatedAt: z.string(),
    sourceDir: z.string(),
    stats: graphStatsSchema,
    cycles: z.array(z.string()).default([]),
    nodes: z.array(graphNodeSchema).default([]),
    edges: z.array(graphEdgeSchema).default([]),
  })
  .passthrough();

function readGraph(): CodeGraphData | null {
  let raw: string;
  try {
    raw = fs.readFileSync(GRAPH_PATH, "utf-8");
  } catch {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  const result = graphSchema.safeParse(parsed);
  return result.success ? result.data : null;
}

/**
 * Server Component di bawah `(dashboard)/settings/layout.tsx`, jadi TIDAK memakai
 * `PageShell` lagi — layout tersebut sudah menyediakan `<main>`.
 */
export default function CodeGraphSettingsPage() {
  const data = readGraph();

  if (data === null) {
    return (
      <EmptyState
        icon={Network}
        title={codeGraphConfig.empty.title}
        description={codeGraphConfig.empty.description}
        // Label sengaja literal: ini nama perintah terminal, bukan copy UI.
        action={
          <Button variant="outline" disabled>
            <code className="font-mono text-xs">npm run graph</code>
          </Button>
        }
      />
    );
  }

  const hasViolations =
    data.stats.violationEdges > 0 || data.stats.boundaryViolations > 0;
  const hasCycles = data.cycles.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>
          {codeGraphConfig.generatedAtLabel}:{" "}
          <time dateTime={data.generatedAt} className="text-foreground">
            {generatedAtLabel(data.generatedAt)}
          </time>
        </span>
        <span aria-hidden="true">·</span>
        <span className="text-balance">
          {summaryDescription(data.stats)}
        </span>
        <span aria-hidden="true">·</span>
        <span>
          {codeGraphConfig.sourceDirLabel}:{" "}
          <code className="font-mono text-xs text-foreground">
            {data.sourceDir}
          </code>
        </span>
        <Badge variant={hasViolations ? "destructive" : "secondary"}>
          {violationCountLabel(
            data.stats.violationEdges + data.stats.boundaryViolations,
          )}
        </Badge>
        <Badge variant={hasCycles ? "secondary" : "outline"}>
          <GitBranch aria-hidden="true" />
          {cycleCountLabel(data.cycles.length)}
        </Badge>
      </div>

      {/* Seluruh objek graph diteruskan apa adanya ke client component: ini
          output analisis statis saat build (bukan data user), dan client
          component butuh node + edge lengkap untuk layout dan filter. */}
      <CodeGraph data={data} />
    </div>
  );
}
