import { Injectable } from '@nestjs/common';
import { compare as bcryptCompare } from 'bcryptjs';
import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

/**
 * Password hashing with Node's built-in scrypt.
 *
 * scrypt runs on the libuv thread pool, so hashing never blocks the event
 * loop. The previous implementation used bcryptjs' synchronous functions,
 * which stalled every request while a login or registration was hashing.
 *
 * Parameters follow the OWASP Password Storage Cheat Sheet
 * (N=2^14, r=8, p=5, about 16 MiB per hash). They are stored inside each
 * hash, so they can be raised later without breaking existing users:
 * `needsRehash()` reports hashes made with older settings.
 *
 * Format: scrypt$<N>$<r>$<p>$<salt base64>$<key base64>
 */
const PREFIX = 'scrypt';
const N = 2 ** 14;
const R = 8;
const P = 5;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

function scryptAsync(password: string, salt: Buffer, keyLength: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, options, (err, key) => (err ? reject(err) : resolve(key)));
  });
}

function scryptOptions(n: number, r: number, p: number): ScryptOptions {
  // maxmem must exceed 128 * N * r bytes, or Node rejects the call.
  return { N: n, r, p, maxmem: 256 * n * r };
}

@Injectable()
export class PasswordService {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(SALT_LENGTH);
    const key = await scryptAsync(password, salt, KEY_LENGTH, scryptOptions(N, R, P));
    return [PREFIX, N, R, P, salt.toString('base64'), key.toString('base64')].join('$');
  }

  /** A malformed stored hash is a failed check, never a match and never a thrown error. */
  async verify(password: string, stored: string): Promise<boolean> {
    try {
      if (stored.startsWith('$2')) {
        // Hashes created before the switch to scrypt.
        return await bcryptCompare(password, stored);
      }

      const parsed = parseScryptHash(stored);
      if (!parsed) {
        return false;
      }
      const actual = await scryptAsync(password, parsed.salt, parsed.key.length, scryptOptions(parsed.n, parsed.r, parsed.p));
      return timingSafeEqual(actual, parsed.key);
    } catch {
      // Invalid parameters, e.g. an N that is not a power of two.
      return false;
    }
  }

  /** True when the hash uses bcrypt or weaker scrypt settings than the current ones. */
  needsRehash(stored: string): boolean {
    const parsed = parseScryptHash(stored);
    return !parsed || parsed.n < N || parsed.r < R || parsed.p < P;
  }
}

interface ScryptHash {
  n: number;
  r: number;
  p: number;
  salt: Buffer;
  key: Buffer;
}

/**
 * Strict base64 decode. Buffer.from() silently drops invalid characters, so a
 * corrupt or empty segment would decode to an empty key, and an empty key
 * compares equal to scrypt's empty output for every password.
 */
function decodeBase64(value: string): Buffer | null {
  const decoded = Buffer.from(value, 'base64');
  return decoded.length > 0 && decoded.toString('base64') === value ? decoded : null;
}

function parseScryptHash(stored: string): ScryptHash | null {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== PREFIX) {
    return null;
  }
  const [n, r, p] = parts.slice(1, 4).map(Number);
  const salt = decodeBase64(parts[4]);
  const key = decodeBase64(parts[5]);
  if (![n, r, p].every((v) => Number.isSafeInteger(v) && v > 0) || !salt || !key) {
    return null;
  }
  return { n, r, p, salt, key };
}
