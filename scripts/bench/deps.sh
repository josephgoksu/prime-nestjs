#!/usr/bin/env bash
# Production dependency footprint of a Node project: installed packages, size, npm audit.
#
#   scripts/bench/deps.sh <path-to-project> [--legacy-peer-deps]
#
# Installs from package.json only (no lockfile, no install scripts) into a temporary
# directory, so projects that use npm, pnpm or yarn are measured the same way.
set -euo pipefail
SRC=$(cd "${1:?usage: deps.sh <project> [--legacy-peer-deps]}" && pwd)
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
node -e '
  const p = require(process.argv[1]);
  delete p.devDependencies; delete p.scripts; delete p.workspaces;
  if (p.pnpm && p.pnpm.overrides) p.overrides = { ...p.pnpm.overrides, ...(p.overrides || {}) };
  delete p.pnpm;
  require("fs").writeFileSync(process.argv[2] + "/package.json", JSON.stringify(p));
' "$SRC/package.json" "$WORK"
cd "$WORK"
npm install ${2:-} --omit=dev --ignore-scripts --no-audit --no-fund --loglevel=error > /dev/null
packages=$(npm ls --omit=dev --all --parseable 2>/dev/null | tail -n +2 | sort -u | wc -l)
size=$(du -sm node_modules | cut -f1)
audit=$(npm audit --omit=dev --json 2>/dev/null | node -pe 'const v = JSON.parse(require("fs").readFileSync(0)).metadata.vulnerabilities; `low ${v.low} moderate ${v.moderate} high ${v.high} critical ${v.critical}`')
echo "$(basename "$SRC"): packages $packages, size ${size} MB, vulnerabilities: $audit"
