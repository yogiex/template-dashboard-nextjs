#!/usr/bin/env node
/**
 * code-graph-transform.js
 *
 * Reads the raw `madge --json` dependency map (plus optional `madge --circular`
 * text output) and emits a normalized graph JSON for the code-graph feature.
 *
 * Usage (the raw `madge --json` output is read from stdin; all paths may be
 * relative to the repo root given by --root):
 *   madge --json ... | node scripts/code-graph-transform.js
 *        --src <dir> --out <file> [--cycles <file>] --root <dir>
 *
 * Module system: CommonJS on purpose — package.json has no `"type": "module"`,
 * so `require` is the correct choice for a plain `.js` file. tsconfig only
 * includes TypeScript globs, so this file is not type-checked, but it is linted
 * by `npm run lint` (flat config, eslint-config-next).
 */

"use strict";

const fs = require("fs");
const path = require("path");

/** How far into a file we look for a directive prologue. */
const DIRECTIVE_SCAN_LIMIT = 200;

/**
 * Path shape:
 *   madge --json keys are relative to the directory passed to madge, e.g.
 *   madge ... src            -> "app/(auth)/login/page.tsx"
 *   madge ... src/features/auth -> "../../components/ui/button.tsx"
 *   so every id is resolved against the absolute src dir and then re-expressed
 *   relative to the repo root, which keeps node ids readable and lets the
 *   categorizer work on a single canonical form.
 */
function parseArgs(argv) {
  const args = {
    src: "src",
    out: null,
    cycles: null,
    root: process.cwd(),
  };

  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    switch (key) {
      case "--src":
        args.src = argv[++i];
        break;
      case "--out":
        args.out = argv[++i];
        break;
      case "--cycles":
        args.cycles = argv[++i];
        break;
      case "--root":
        args.root = argv[++i];
        break;
      default:
        break;
    }
  }

  if (!args.out) {
    throw new Error("--out <file> is required");
  }

  return args;
}

function toPosix(value) {
  return value.split(path.sep).join("/");
}

/** Absolute path -> root-relative, posix, no leading "./". */
function relativeToRoot(absolutePath, rootDir) {
  const relative = path.relative(rootDir, absolutePath);
  if (relative === "") {
    return ".";
  }
  if (relative.startsWith("..")) {
    return null; // outside the repo: not part of the graph
  }
  return toPosix(relative);
}

/**
 * Directive detection is intentionally tolerant rather than "first line only":
 * several real files in this repo start with a comment or a blank line before
 * `"use client"`, and a leading comment does not change the directive's
 * meaning. We scan the first ~200 characters, which covers the directive
 * prologue without matching arbitrary `use client` mentions deep in the file.
 */
function readSource(id) {
  try {
    return fs.readFileSync(id, "utf8");
  } catch {
    return null;
  }
}

function isClientComponent(id) {
  const source = readSource(id);
  if (source === null) return false;
  return /["']use client["']/.test(source.slice(0, DIRECTIVE_SCAN_LIMIT));
}

/**
 * Matches the `server-only` marker in all three shapes used in this repo:
 * a bare side-effect import (`import "server-only";` — by far the most common),
 * a named import, or a `require`. Scoped to an import/require statement so a
 * prose mention inside a comment is not counted.
 */
function isServerOnly(id) {
  const source = readSource(id);
  if (source === null) return false;
  return /(^|\n)\s*import\s+["']server-only["']/.test(source) ||
    /\bfrom\s+["']server-only["']/.test(source) ||
    /\brequire\(\s*["']server-only["']\s*\)/.test(source);
}

/**
 * File kind, derived purely from the extension. Kept independent from the
 * runtime boundary below: a file can be a component AND run on the client, and
 * the UI needs both facts.
 */
function moduleType(id) {
  if (id.endsWith(".tsx")) return "component";
  if (id.endsWith(".ts")) return "module";
  if (id.endsWith(".css")) return "style";
  return "file";
}

/**
 * Runtime boundary, most restrictive first: a module that imports
 * `server-only` can never ship to the browser, so it wins over a
 * `"use client"` directive in the same file.
 */
function boundaryOf(id) {
  if (isServerOnly(id)) return "server-only";
  if (isClientComponent(id)) return "client";
  return "server";
}

/**
 * Categories follow the real repo layout. Route groups are kept as part of the
 * category so `app/(dashboard)`, `app/(auth)` and `app/(public)` stay distinct.
 * Ids arriving from other `src/` subtrees (or from node_modules-adjacent paths)
 * fall through to "other" instead of throwing.
 */
function categorize(id) {
  let relative = id.startsWith("src/") ? id.slice(4) : id;

  if (relative.startsWith("app/")) {
    const rest = relative.slice(4);
    const group = /^(\([^/]+\)\/)/.exec(rest);
    return group ? `app/${group[1].slice(0, -1)}` : "app";
  }

  const segments = relative.split("/");
  const [head, second] = segments;

  if (head === "features" && second) return `features/${second}`;
  if (head === "components" && second) return `components/${second}`;
  if (head === "lib" || head === "config" || head === "hooks") return head;

  return "other";
}

function featureOf(category) {
  return category.startsWith("features/") ? category.slice("features/".length) : null;
}

/**
 * `madge --circular` (text mode) prints either
 *   "✔ No circular dependency found!"          (exit 0)
 * or
 *   "Found 2 circular dependencies!"
 *   1) a.ts > b.ts > a.ts                       (exit 1)
 * Older/newer madge builds also emit spinner lines ("Processed 245 files ...")
 * and ANSI colors. We strip ANSI, drop every line that is not a numbered cycle
 * entry, and treat a missing or unreadable file as "no cycles" instead of
 * failing the whole run.
 */
function parseCycles(cyclesFile, srcDirAbs, rootDir) {
  if (!cyclesFile) return [];
  let raw;
  try {
    raw = fs.readFileSync(cyclesFile, "utf8");
  } catch {
    return [];
  }

  const ansiPattern = new RegExp(String.fromCharCode(27) + "\\[[0-9;]*m", "g");
  const cycles = [];

  for (const line of raw.split(ansiPattern)) {
    // cycle entries look like: "1) a.ts > b.ts > a.ts"
    const match = /^\s*(\d+)\)\s*(.+?)\s*$/.exec(line);
    if (!match) continue;
    const parts = match[2]
      .split(">")
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length < 2) continue;
    // Cycle entries are printed relative to the directory madge scanned.
    cycles.push(
      parts.map((part) => relativeToRoot(path.resolve(srcDirAbs, part), rootDir) ?? part)
    );
  }

  return cycles;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const rootDir = path.resolve(args.root);
  const srcDirAbs = path.resolve(rootDir, args.src);
  const outFile = path.resolve(rootDir, args.out);

  // The shell script pipes the raw `madge --json` output in on stdin.
  const raw = fs.readFileSync(0, "utf8");

  let madgeGraph;
  try {
    madgeGraph = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Could not parse madge JSON: ${error.message}`);
  }

  /** @type {Map<string, {id: string, abs: string, category: string, type: string, boundary: string, deps: number}>} */
  const nodes = new Map();

  function ensureNode(id) {
    if (nodes.has(id)) return nodes.get(id);
    const abs = path.resolve(rootDir, id);
    const node = {
      id,
      abs,
      category: categorize(id),
      type: moduleType(abs),
      boundary: boundaryOf(abs),
      deps: 0,
    };
    nodes.set(id, node);
    return node;
  }

  // madge keys are relative to the directory madge was pointed at.
  for (const [from, deps] of Object.entries(madgeGraph)) {
    const fromId = relativeToRoot(path.resolve(srcDirAbs, from), rootDir);
    if (fromId === null) continue;
    ensureNode(fromId);
    if (!Array.isArray(deps)) continue;
    for (const dep of deps) {
      const toId = relativeToRoot(path.resolve(srcDirAbs, dep), rootDir);
      if (toId === null) continue;
      ensureNode(toId);
    }
  }

  const nodeList = Array.from(nodes.values()).sort((a, b) => a.id.localeCompare(b.id));
  const edges = [];
  const categories = {};
  const types = {};
  const boundaries = {};
  const categoryFlow = {};
  const cycles = parseCycles(args.cycles, srcDirAbs, rootDir);

  let crossFeatureEdges = 0;
  let violationEdges = 0;
  let boundaryViolations = 0;

  for (const [from, deps] of Object.entries(madgeGraph)) {
    const fromId = relativeToRoot(path.resolve(srcDirAbs, from), rootDir);
    if (fromId === null || !Array.isArray(deps)) continue;
    const source = nodes.get(fromId);

    for (const dep of deps) {
      const toId = relativeToRoot(path.resolve(srcDirAbs, dep), rootDir);
      if (toId === null) continue;
      const target = nodes.get(toId);

      source.deps += 1;

      // NOTE: `violation` only covers the lib -> features direction today.
      // The documented rule in this repo is stricter (shared code in `lib` or
      // `components` must not import from a feature); that broader direction is
      // not enforced here, the field is kept for backwards compatibility.
      const violation = source.category === "lib" && target.category.startsWith("features/");

      const sourceFeature = featureOf(source.category);
      const targetFeature = featureOf(target.category);
      const crossFeature =
        sourceFeature !== null && targetFeature !== null && sourceFeature !== targetFeature;

      // Cheap, useful second check: a server-only module must never be pulled
      // into a client module (that would drag server secrets into the bundle).
      const boundaryViolation = source.boundary === "server-only" && target.boundary === "client";

      if (crossFeature) crossFeatureEdges += 1;
      if (violation) violationEdges += 1;
      if (boundaryViolation) boundaryViolations += 1;

      const edge = {
        id: `${source.id}->${target.id}`,
        source: source.id,
        target: target.id,
        sourceCat: source.category,
        targetCat: target.category,
        crossFeature,
        violation,
        boundaryViolation,
      };
      edges.push(edge);
    }
  }

  edges.sort((a, b) => a.source.localeCompare(b.source) || a.target.localeCompare(b.target));

  for (const node of nodeList) {
    types[node.type] = (types[node.type] ?? 0) + 1;
    boundaries[node.boundary] = (boundaries[node.boundary] ?? 0) + 1;
    categories[node.category] = (categories[node.category] ?? 0) + 1;
  }
  for (const edge of edges) {
    categoryFlow[edge.sourceCat] ??= { files: 0, incoming: 0, outgoing: 0 };
    categoryFlow[edge.targetCat] ??= { files: 0, incoming: 0, outgoing: 0 };
    categoryFlow[edge.sourceCat].files += 1;
    categoryFlow[edge.sourceCat].outgoing += 1;
    categoryFlow[edge.targetCat].files += 1;
    categoryFlow[edge.targetCat].incoming += 1;
  }

  const output = {
    generatedAt: new Date().toISOString(),
    sourceDir: toPosix(path.relative(rootDir, srcDirAbs) || "."),
    stats: {
      totalFiles: nodeList.length,
      totalEdges: edges.length,
      crossFeatureEdges,
      violationEdges,
      boundaryViolations,
      categories,
      types,
      boundaries,
      cycles: cycles.length,
    },
    // One flat display string per cycle so `cycles.length` is the cycle count
    // and the UI never has to join paths itself.
    cycles: cycles.map((cycle) => cycle.join(" → ")),
    categoryFlow,
    nodes: nodeList.map((node) => ({
      id: node.id,
      label: path.posix.basename(node.id),
      category: node.category,
      type: node.type,
      boundary: node.boundary,
      deps: node.deps,
    })),
    edges,
  };

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, `${JSON.stringify(output, null, 2)}\n`);

  const s = output.stats;
  process.stdout.write(
    [
      `graph written   ${toPosix(path.relative(rootDir, outFile))}`,
      `files           ${s.totalFiles}`,
      `edges           ${s.totalEdges}`,
      `categories      ${Object.keys(categories).length} (${Object.keys(categories).join(", ")})`,
      `types           ${Object.entries(types)
        .map(([type, count]) => `${type}=${count}`)
        .join(" ")}`,
      `boundaries      ${Object.entries(boundaries)
        .map(([boundary, count]) => `${boundary}=${count}`)
        .join(" ")}`,
      `cross-feature   ${s.crossFeatureEdges}`,
      `lib->feature    ${s.violationEdges}`,
      `server->client  ${s.boundaryViolations}`,
      `cycles          ${s.cycles}`,
      "",
    ].join("\n")
  );
}

try {
  main();
} catch (error) {
  process.stderr.write(`code-graph-transform: ${error && error.message ? error.message : error}\n`);
  process.exit(1);
}
