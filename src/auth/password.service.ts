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

  async verify(password: string, stored: string): Promise<boolean> {
    if (stored.startsWith('$2')) {
      // Hashes created before the switch to scrypt.
      return bcryptCompare(password, stored);
    }

    const parts = stored.split('$');
    if (parts.length !== 6 || parts[0] !== PREFIX) {
      return false;
    }
    const [, n, r, p, saltB64, keyB64] = parts;
    const expected = Buffer.from(keyB64, 'base64');
    const actual = await scryptAsync(password, Buffer.from(saltB64, 'base64'), expected.length, scryptOptions(Number(n), Number(r), Number(p)));
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }

  /** True when the hash uses bcrypt or weaker scrypt settings than the current ones. */
  needsRehash(stored: string): boolean {
    const parts = stored.split('$');
    if (parts.length !== 6 || parts[0] !== PREFIX) {
      return true;
    }
    return Number(parts[1]) < N || Number(parts[2]) < R || Number(parts[3]) < P;
  }
}
