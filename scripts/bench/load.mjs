#!/usr/bin/env node
// Load generator for scripts/bench/run.sh. Prints autocannon's JSON result.
//   node scripts/bench/load.mjs <url> <connections> <seconds> [token|-] [method] [body]
// Each connection sends its own X-Forwarded-For, so with TRUST_PROXY=1 the rate limiter keeps
// per-client state as small as it would be with separate real clients.
import autocannon from 'autocannon';

const [url, connections, seconds, token, method = 'GET', body] = process.argv.slice(2);
if (!url || !connections || !seconds) {
  console.error('usage: load.mjs <url> <connections> <seconds> [token|-] [method] [body]');
  process.exit(1);
}
const headers = { 'content-type': 'application/json' };
if (token && token !== '-') headers.authorization = `Bearer ${token}`;
let client = 0;
const result = await autocannon({
  url,
  connections: Number(connections),
  duration: Number(seconds),
  method,
  body,
  headers,
  setupClient: (c) => {
    client++;
    c.setHeaders({ ...headers, 'x-forwarded-for': `10.0.${client >> 8}.${client & 255}` });
  },
});
process.stdout.write(JSON.stringify(result));
