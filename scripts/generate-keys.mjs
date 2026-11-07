#!/usr/bin/env node
// Generates the RS256 key pair that signs access tokens and writes it to .env.
//
//   node scripts/generate-keys.mjs            fill PRIVATE_KEY/PUBLIC_KEY in .env if they are unset or placeholders
//   node scripts/generate-keys.mjs --force    replace keys that are already set
//   node scripts/generate-keys.mjs --print    print the two lines instead of writing .env
//   node scripts/generate-keys.mjs --env path use another env file
//
// Uses node:crypto, so it works the same on macOS, Linux and Windows without openssl.
import { generateKeyPairSync } from 'node:crypto';
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const envIndex = args.indexOf('--env');
const envPath = envIndex >= 0 ? args[envIndex + 1] : '.env';
if (!envPath) {
  console.error('--env needs a file path');
  process.exit(1);
}

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});
// .env values are single lines: newlines are stored as \n and expanded again in src/config/index.ts.
const oneLine = (pem) => pem.trim().replace(/\n/g, '\\n') + '\\n';
const lines = { PRIVATE_KEY: `PRIVATE_KEY="${oneLine(privateKey)}"`, PUBLIC_KEY: `PUBLIC_KEY="${oneLine(publicKey)}"` };

if (flag('--print')) {
  console.log(`${lines.PRIVATE_KEY}\n${lines.PUBLIC_KEY}`);
  process.exit(0);
}

if (!existsSync(envPath)) {
  console.error(`${envPath} not found. Copy .env.example to ${envPath} first.`);
  process.exit(1);
}

let env = readFileSync(envPath, 'utf8');
const current = (name) => env.match(new RegExp(`^${name}=(.*)$`, 'm'))?.[1] ?? null;
const isUnset = (value) => value === null || /^"?"?$/.test(value) || value.includes('<your-');

if (!flag('--force') && !isUnset(current('PRIVATE_KEY')) && !isUnset(current('PUBLIC_KEY'))) {
  console.log(`JWT keys already set in ${envPath}; left unchanged. Pass --force to replace them.`);
  process.exit(0);
}

for (const name of ['PRIVATE_KEY', 'PUBLIC_KEY']) {
  const pattern = new RegExp(`^${name}=.*$`, 'm');
  // A function replacement, so `$` sequences in the key are not treated as patterns.
  env = pattern.test(env) ? env.replace(pattern, () => lines[name]) : `${env.trimEnd()}\n${lines[name]}\n`;
}
writeFileSync(envPath, env);
// The file now holds a private key: make it readable by the owner only (no effect on Windows).
chmodSync(envPath, 0o600);
console.log(`Wrote a new RS256 key pair to ${envPath}.`);
