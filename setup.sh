#!/usr/bin/env bash
# One-command setup for a fresh clone.
#
#   ./setup.sh             Postgres in Docker, app on your machine (npm run start:dev)
#   ./setup.sh --docker    app and Postgres both in Docker
#   ./setup.sh --no-docker use the Postgres in .env (you run it yourself)
#
# Safe to run again: an existing .env and existing JWT keys are kept.
set -euo pipefail
cd "$(dirname "$0")"

mode=local
case "${1:-}" in
  "") ;;
  --docker) mode=docker ;;
  --no-docker) mode=none ;;
  -h | --help) sed -n '2,8p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
  *) echo "Unknown option: $1 (see ./setup.sh --help)" >&2; exit 1 ;;
esac

step() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
fail() { printf '\n\033[31mError:\033[0m %s\n' "$*" >&2; exit 1; }

step "Checking tools"
command -v node >/dev/null || fail "Node.js is not installed. Install Node 24 LTS (or 22.13+)."
command -v npm >/dev/null || fail "npm is not installed."
# Same range as "engines" in package.json: require(esm) needs ^22.13.0 || >=24.11.0.
node -e '
  const [major, minor] = process.versions.node.split(".").map(Number);
  const ok = (major === 22 && minor >= 13) || major > 24 || (major === 24 && minor >= 11);
  if (!ok) { console.error("Node " + process.versions.node + " is too old: use 24.11+ or 22.13+."); process.exit(1); }
' || fail "Unsupported Node.js version."
if [ "$mode" != none ]; then
  command -v docker >/dev/null || fail "Docker is not installed. Install it, or run ./setup.sh --no-docker with your own Postgres."
  docker compose version >/dev/null 2>&1 || fail "Docker Compose v2 is not available (docker compose ...)."
  docker info >/dev/null 2>&1 || fail "Docker is installed but not running. Start Docker and try again."
fi
echo "Node $(node -v), npm $(npm -v)${mode:+, mode: $mode}"

step "Preparing .env"
if [ -f .env ]; then
  echo ".env exists; kept as is."
else
  cp .env.example .env
  echo "Created .env from .env.example."
fi
node scripts/generate-keys.mjs

step "Installing dependencies"
npm ci

case "$mode" in
  docker)
    step "Building and starting the app and Postgres"
    # The app container applies migrations on start (DB_RUN_MIGRATIONS=true in docker-compose.yml).
    docker compose up -d --build --wait
    ;;
  local)
    step "Starting Postgres"
    docker compose up -d --wait database
    step "Applying migrations"
    npm run migration:run
    ;;
  none)
    step "Applying migrations to the Postgres in .env"
    npm run migration:run || fail "Migrations failed. Check the POSTGRES_* values in .env and that Postgres is running."
    ;;
esac

step "Done"
port="$(grep -E '^PORT=' .env | cut -d= -f2 | tr -d '"' || true)"
port="${port:-3000}"
if [ "$mode" = docker ]; then
  echo "API:     http://localhost:${port}"
  echo "Health:  http://localhost:${port}/health/ready"
  echo "Logs:    docker compose logs -f app_server"
else
  echo "Start the API:  npm run start:dev"
  echo "Then open:      http://localhost:${port}/api (Swagger)"
fi
