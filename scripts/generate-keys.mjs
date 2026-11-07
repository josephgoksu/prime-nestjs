#!/usr/bin/env node
// Generates the RS256 key pair that signs access tokens and writes it to .env.
//
//   node scripts/generate-keys.mjs            fill PRIVATE_KEY/PUBLIC_KEY in .env if they are unset or placeholders
//   node scripts/generate-keys.mjs --force    replace keys that are already set
//   node scripts/generate-keys.mjs --print    print the two lines instead of writing .env
//   node scripts/generate-keys.mjs --env path use another env file
//
// Without --force, a key that is set is never replaced: when only PRIVATE_KEY is set, PUBLIC_KEY is
// derived from it, and when only PUBLIC_KEY is set, the script stops and asks for --force.
//
// Uses node:crypto, so it works the same on macOS, Linux and Windows without openssl.
import { createPrivateKey, createPublicKey, generateKeyPairSync } from 'node:crypto';
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

let force = false;
let print = false;
let envPath = '.env';
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--force') force = true;
  else if (arg === '--print') print = true;
  else if (arg === '--env') {
    envPath = args[++i];
    if (!envPath || envPath.startsWith('--')) fail('--env needs a file path');
  } else fail(`Unknown option: ${arg}. Use --force, --print or --env <path>.`);
}

const newPair = () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return { PRIVATE_KEY: privateKey, PUBLIC_KEY: publicKey };
};
// .env values are single lines: newlines are stored as \n and expanded again in src/config/index.ts.
const oneLine = (pem) => pem.trim().replace(/\n/g, '\\n') + '\\n';
const line = (name, pem) => `${name}="${oneLine(pem)}"`;

if (print) {
  const pair = newPair();
  console.log(`${line('PRIVATE_KEY', pair.PRIVATE_KEY)}\n${line('PUBLIC_KEY', pair.PUBLIC_KEY)}`);
  process.exit(0);
}

if (!existsSync(envPath)) fail(`${envPath} not found. Copy .env.example to ${envPath} first.`);

let env = readFileSync(envPath, 'utf8');

// A NAME=value assignment as dotenv reads it: an optional `export`, and a quoted value that may span
// several lines (a PEM pasted as is). A quoted value only spans lines when its closing quote ends a
// line; anything else is matched as a single line.
const assignment = (name) => new RegExp(`^(?:export[ \\t]+)?${name}[ \\t]*=(?:"[^"]*"|'[^']*'|.*)$`, 'gm');
// dotenv uses the last assignment of a name, so read that one.
const current = (name) => {
  const last = [...env.matchAll(assignment(name))].at(-1);
  if (!last) return null;
  const raw = last[0].slice(last[0].indexOf('=') + 1).trim();
  const quoted = raw.match(/^(["'])([\s\S]*?)\1/);
  return quoted ? quoted[2] : raw.split('#')[0].trim();
};
const isUnset = (value) => value === null || /^["']*$/.test(value) || value.includes('<your-');

const privateSet = !isUnset(current('PRIVATE_KEY'));
const publicSet = !isUnset(current('PUBLIC_KEY'));
let updates;
let done;
if (force || (!privateSet && !publicSet)) {
  updates = newPair();
  done = `Wrote a new RS256 key pair to ${envPath}.`;
} else if (privateSet && publicSet) {
  console.log(`JWT keys already set in ${envPath}; left unchanged. Pass --force to replace them.`);
  process.exit(0);
} else if (privateSet) {
  // Keep the private key that is there (tokens it signed stay valid) and fill in its public key.
  let privateKey;
  try {
    privateKey = createPrivateKey(current('PRIVATE_KEY').replace(/\\n/g, '\n'));
  } catch {
    fail(`PRIVATE_KEY in ${envPath} is set but is not a valid PEM key. Fix it, or pass --force to replace both keys.`);
  }
  updates = { PUBLIC_KEY: createPublicKey(privateKey).export({ type: 'spki', format: 'pem' }) };
  done = `Derived PUBLIC_KEY from the PRIVATE_KEY in ${envPath}.`;
} else {
  fail(`PUBLIC_KEY in ${envPath} is set but PRIVATE_KEY is not. Set the matching PRIVATE_KEY, or pass --force to replace both keys.`);
}

for (const [name, pem] of Object.entries(updates)) {
  const next = line(name, pem);
  // Every assignment is replaced, a multi-line value as a whole, so no old key material is left behind.
  // A function replacement, so `$` sequences in the key are not treated as patterns.
  env = assignment(name).test(env) ? env.replace(assignment(name), () => next) : `${env.trimEnd()}\n${next}\n`;
}
// The file is about to hold a private key: make it readable by the owner only before writing it
// (no effect on Windows).
try {
  chmodSync(envPath, 0o600);
} catch (error) {
  console.warn(`Could not restrict ${envPath} to its owner (${error.code}). Check its permissions.`);
}
writeFileSync(envPath, env);
console.log(done);
