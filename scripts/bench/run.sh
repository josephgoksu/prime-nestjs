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
# bench-results/<label> is deleted first, so the label must not point anywhere else.
case $LABEL in */* | .*) echo "The label must be a plain name, such as my-run." >&2; exit 1 ;; esac
[ -f dist/main.js ] || { echo "Run npm run build first." >&2; exit 1; }
B=http://localhost:$PORT
# A server already on the port would answer the probes below and be benchmarked instead.
if curl -s -o /dev/null "$B/"; then echo "Port $PORT is in use. Pass a free one: run.sh $LABEL <port>" >&2; exit 1; fi
OUT=bench-results/$LABEL
rm -rf "$OUT" && mkdir -p "$OUT"

# OTEL_SDK_DISABLED: an OTLP endpoint in .env would otherwise add tracing to every number.
export NODE_ENV=production PORT LOG_LEVEL=info DB_RUN_MIGRATIONS=true TRUST_PROXY=1 OTEL_SDK_DISABLED=true
export THROTTLE_LIMIT=1000000000 THROTTLE_AUTH_LIMIT=1000000000 THROTTLE_TTL_MS=1000
load() { node scripts/bench/load.mjs "$@"; }

# Startup to first response, timed in Node (`date +%s%N` is GNU only) and probed on
# /health-check, which every version of the app has (v1 has no /health/live).
start=$(node -p 'Date.now()')
node dist/main > "$OUT/app.log" 2>&1 &
APP=$!
trap 'kill $APP 2>/dev/null || true' EXIT
startup_ms=$(node -e '
  const [url, start, pid] = process.argv.slice(1).map((v, i) => (i ? Number(v) : v));
  const alive = () => { try { process.kill(pid, 0); return true; } catch { return false; } };
  (async () => {
    for (;;) {
      try {
        if ((await fetch(url)).ok) {
          require("fs").writeSync(1, `${Date.now() - start}\n`);
          process.exit(0);
        }
      } catch {}
      if (!alive() || Date.now() - start > 120_000) process.exit(1);
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
  })();
' "$B/health-check" "$start" "$APP") || { echo "The app exited or did not answer within 2 minutes:" >&2; tail -5 "$OUT/app.log" >&2; exit 1; }
echo "startup_ms $startup_ms" > "$OUT/meta.txt"

creds='{"email":"bench@example.com","password":"password123"}'
curl -s -XPOST "$B/auth/register" -H 'content-type: application/json' -d '{"email":"bench@example.com","name":"Bench","password":"password123"}' > /dev/null
# Stop here when the login fails, instead of benchmarking 401 responses on /tasks.
TOKEN=$(curl -s -XPOST "$B/auth/login" -H 'content-type: application/json' -d "$creds" | node -e '
  const body = require("fs").readFileSync(0, "utf8");
  let token;
  try { token = JSON.parse(body).access_token; } catch {}
  if (!token) { console.error(`Login failed: ${body}`); process.exit(1); }
  console.log(token);
')
# Five tasks for GET /tasks, counting those left by an earlier run on the same database,
# so every run reads the same payload.
tasks=$(curl -s "$B/tasks" -H "authorization: Bearer $TOKEN" | node -pe 'JSON.parse(require("fs").readFileSync(0)).length')
for ((i = tasks + 1; i <= 5; i++)); do
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
  node -e 'const r = require(process.argv[1]); console.log(process.argv[2].padEnd(13), "req/s", Math.round(r.requests.average), " p50", r.latency.p50, "ms  p99", r.latency.p99, "ms  non-2xx", r.non2xx, " errors", r.errors, " timeouts", r.timeouts)' "$PWD/$OUT/$f.json" "$f"
done
cat "$OUT/meta.txt"
