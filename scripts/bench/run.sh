#!/usr/bin/env bash
# Benchmarks a production build against a local Postgres.
#
#   npm run build
#   scripts/bench/run.sh <label> [port]
#
# Needs: Postgres reachable with the POSTGRES_* values in your shell or .env (use an empty
# database: the script registers a user and runs migrations), PRIVATE_KEY/PUBLIC_KEY, and
# the dev dependencies (autocannon). Results go to bench-results/<label>/.
#
# Rate limits stay on with a high limit and a 1 s window, and each connection is its own
# client IP, so the limiter does the same work per request as it would for real clients.
set -euo pipefail
cd "$(dirname "$0")/../.."
LABEL=${1:?usage: run.sh <label> [port]}
PORT=${2:-3999}
OUT=bench-results/$LABEL
rm -rf "$OUT" && mkdir -p "$OUT"
[ -f dist/main.js ] || { echo "Run npm run build first." >&2; exit 1; }

export NODE_ENV=production PORT LOG_LEVEL=info DB_RUN_MIGRATIONS=true TRUST_PROXY=1
export THROTTLE_LIMIT=1000000000 THROTTLE_AUTH_LIMIT=1000000000 THROTTLE_TTL_MS=1000
load() { node scripts/bench/load.mjs "$@"; }
B=http://localhost:$PORT

start=$(date +%s%N)
node dist/main > "$OUT/app.log" 2>&1 &
APP=$!
trap 'kill $APP 2>/dev/null || true' EXIT
until curl -sf "$B/health/live" > /dev/null; do
  kill -0 $APP 2>/dev/null || { echo "The app exited:" >&2; tail -5 "$OUT/app.log" >&2; exit 1; }
  sleep 0.02
done
echo "startup_ms $(( ($(date +%s%N) - start) / 1000000 ))" > "$OUT/meta.txt"

creds='{"email":"bench@example.com","password":"password123"}'
curl -s -XPOST "$B/auth/register" -H 'content-type: application/json' -d '{"email":"bench@example.com","name":"Bench","password":"password123"}' > /dev/null
TOKEN=$(curl -s -XPOST "$B/auth/login" -H 'content-type: application/json' -d "$creds" | node -pe 'JSON.parse(require("fs").readFileSync(0)).access_token')
for i in 1 2 3 4 5; do
  curl -s -XPOST "$B/tasks" -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' -d "{\"title\":\"task $i\"}" > /dev/null
done
echo "rss_idle_kb $(ps -o rss= -p $APP)" >> "$OUT/meta.txt"

load "$B/health-check" 50 5 > /dev/null # warm-up
load "$B/health-check" 50 15 > "$OUT/health.json"
load "$B/tasks" 50 15 "$TOKEN" > "$OUT/tasks.json"
load "$B/auth/login" 20 15 - POST "$creds" > "$OUT/login.json"
# Event-loop check: health-check latency while logins hash passwords.
load "$B/auth/login" 10 15 - POST "$creds" > "$OUT/mixed-login.json" &
LOGINS=$!
sleep 1
load "$B/health-check" 10 12 > "$OUT/mixed-health.json"
wait $LOGINS
echo "rss_after_kb $(ps -o rss= -p $APP)" >> "$OUT/meta.txt"

for f in health tasks login mixed-health mixed-login; do
  node -e 'const r = require(process.argv[1]); console.log(process.argv[2].padEnd(13), "req/s", Math.round(r.requests.average), " p50", r.latency.p50, "ms  p99", r.latency.p99, "ms  non-2xx", r.non2xx)' "$PWD/$OUT/$f.json" "$f"
done
cat "$OUT/meta.txt"
