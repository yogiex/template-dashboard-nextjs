#!/usr/bin/env bash
#
# code-graph.sh — build the static code dependency graph for the dashboard repo.
#
# Runs madge over a source tree, detects circular dependencies, and pipes both
# into scripts/code-graph-transform.js, which writes <OUT_DIR>/graph.json.
#
# Usage:
#   ./scripts/code-graph.sh [--no-cycles] [--help]
#
# Environment overrides:
#   SRC_DIR  source tree to scan        (default: src)
#   OUT_DIR  where graph.json is written (default: src/features/code-graph/data)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

SRC_DIR="${SRC_DIR:-src}"
OUT_DIR="${OUT_DIR:-src/features/code-graph/data}"

# ---------------------------------------------------------------------------
# Logging helpers (colors only when stdout is a TTY)
# ---------------------------------------------------------------------------
if [ -t 1 ]; then
  C_RESET=$'\033[0m'
  C_BLUE=$'\033[34m'
  C_GREEN=$'\033[32m'
  C_YELLOW=$'\033[33m'
  C_RED=$'\033[31m'
else
  C_RESET=""
  C_BLUE=""
  C_GREEN=""
  C_YELLOW=""
  C_RED=""
fi

log_info()  { printf '%s[graph]%s %s\n' "$C_BLUE"   "$C_RESET" "$*"; }
log_ok()    { printf '%s[graph]%s %s\n' "$C_GREEN"  "$C_RESET" "$*"; }
log_warn()  { printf '%s[graph]%s %s\n' "$C_YELLOW" "$C_RESET" "$*"; }
log_error() { printf '%s[graph]%s %s\n' "$C_RED"    "$C_RESET" "$*" >&2; }

usage() {
  cat <<'EOF'
Usage: ./scripts/code-graph.sh [--no-cycles] [--help]

  --no-cycles   skip the `madge --circular` pass (faster)
  --help        show this message

Environment:
  SRC_DIR      source tree to scan         (default: src)
  OUT_DIR      output directory            (default: src/features/code-graph/data)
EOF
}

# ---------------------------------------------------------------------------
# Arguments
# ---------------------------------------------------------------------------
RUN_CYCLES=1
for arg in "$@"; do
  case "$arg" in
    --no-cycles) RUN_CYCLES=0 ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      log_error "Unknown argument: $arg"
      usage
      exit 1
      ;;
  esac
done

# ---------------------------------------------------------------------------
# Prerequisites
# ---------------------------------------------------------------------------
command -v node >/dev/null 2>&1 || { log_error "node is required"; exit 1; }
command -v npx  >/dev/null 2>&1 || { log_error "npx is required"; exit 1; }
[ -d "$ROOT_DIR/node_modules/madge" ] || {
  log_error "madge is not installed (expected $ROOT_DIR/node_modules/madge)"
  exit 1
}
[ -f "$SCRIPT_DIR/code-graph-transform.js" ] || {
  log_error "missing $SCRIPT_DIR/code-graph-transform.js"
  exit 1
}

# ---------------------------------------------------------------------------
# Resolve absolute paths independently of the current working directory
# ---------------------------------------------------------------------------
abs_path() {
  node -e 'const p=require("path");console.log(p.resolve(process.cwd(),process.argv[1]))' "$1"
}

SRC_ABS="$(abs_path "$SRC_DIR")"
OUT_ABS="$(abs_path "$OUT_DIR")"

[ -d "$SRC_ABS" ] || { log_error "SRC_DIR does not exist: $SRC_ABS"; exit 1; }

# ---------------------------------------------------------------------------
# Temp files + cleanup
# ---------------------------------------------------------------------------
MADGE_JSON="$(mktemp -t madge-json.XXXXXX)"
MADGE_CYCLES="$(mktemp -t madge-cycles.XXXXXX)"
cleanup() {
  rm -f "$MADGE_JSON" "$MADGE_CYCLES"
}
trap cleanup EXIT INT TERM

# ---------------------------------------------------------------------------
# 1. Dependency graph
# ---------------------------------------------------------------------------
log_info "scanning $SRC_DIR (madge --json)"
if ! npx --no-install madge --json --extensions ts,tsx --ts-config tsconfig.json "$SRC_ABS" > "$MADGE_JSON"; then
  log_error "madge --json failed"
  exit 1
fi

FILE_COUNT="$(node -e 'const g=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));console.log(Object.keys(g).length)' "$MADGE_JSON")"

# ---------------------------------------------------------------------------
# 2. Circular dependencies (skippable)
# ---------------------------------------------------------------------------
CYCLE_COUNT=0
: > "$MADGE_CYCLES"
if [ "$RUN_CYCLES" -eq 1 ]; then
  log_info "checking for circular dependencies"
  # madge exits 1 when cycles exist, so a non-zero status here is NOT fatal —
  # only a crash (or output that is not parseable) is. Capture the output
  # regardless and let the transform do the parsing.
  if npx --no-install madge --circular --extensions ts,tsx --ts-config tsconfig.json "$SRC_ABS" > "$MADGE_CYCLES" 2>&1; then
    log_ok "no circular dependencies found"
  else
    # `grep -c` exits 1 on "no match", hence the `|| true` guard.
    CYCLE_COUNT="$(grep -cE '^[[:space:]]*[0-9]+\)' "$MADGE_CYCLES" || true)"
    CYCLE_COUNT="${CYCLE_COUNT:-0}"
    if [ "$CYCLE_COUNT" -gt 0 ]; then
      log_warn "$CYCLE_COUNT circular dependency chain(s) detected (see graph.json -> cycles)"
    else
      log_warn "madge --circular reported a failure without listing cycles"
    fi
  fi
else
  log_info "skipping circular dependency check (--no-cycles)"
fi

# ---------------------------------------------------------------------------
# 3. Transform
# ---------------------------------------------------------------------------
TRANSFORM="$SCRIPT_DIR/code-graph-transform.js"
OUT_FILE="$OUT_ABS/graph.json"

log_info "writing $OUT_DIR/graph.json"
node "$TRANSFORM" \
  --src "$SRC_ABS" \
  --root "$ROOT_DIR" \
  --out "$OUT_FILE" \
  --cycles "$MADGE_CYCLES" \
  < "$MADGE_JSON"

# ---------------------------------------------------------------------------
# 4. Summary
# ---------------------------------------------------------------------------
node -e '
const g = require(process.argv[1]);
const s = g.stats;
const pad = (v, n) => String(v).padStart(n);
const tally = (record) => Object.entries(record).map(([k, v]) => k + "=" + v).join(" ");
console.log("  files        " + pad(s.totalFiles, 5));
console.log("  edges        " + pad(s.totalEdges, 5));
console.log("  categories   " + pad(Object.keys(s.categories).length, 5) + "  " + Object.keys(s.categories).join(", "));
console.log("  types        " + pad(tally(s.types), 5));
console.log("  boundaries   " + pad(tally(s.boundaries), 5));
console.log("  cross-feat   " + pad(s.crossFeatureEdges, 5));
console.log("  lib->feature " + pad(s.violationEdges, 5));
console.log("  srv->client  " + pad(s.boundaryViolations, 5));
console.log("  cycles       " + pad(s.cycles, 5));
' "$OUT_FILE"

log_ok "done ($FILE_COUNT files scanned)"
# Cycles are a report, not a build failure: only madge/transform errors exit non-zero.
exit 0
