import { generateKeyPairSync } from 'node:crypto';
import { validateEnv } from './env.validation';

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

const valid = {
  POSTGRES_HOST: 'localhost',
  POSTGRES_USER: 'postgres',
  POSTGRES_PASSWORD: 'secret',
  POSTGRES_DB: 'app',
  PRIVATE_KEY: privateKey,
  PUBLIC_KEY: publicKey,
};

describe('validateEnv', () => {
  it('accepts a complete configuration', () => {
    expect(validateEnv({ ...valid, PORT: '3000', NODE_ENV: 'production' })).toMatchObject(valid);
  });

  it('accepts keys with escaped newlines, as written in .env files', () => {
    expect(() => validateEnv({ ...valid, PRIVATE_KEY: privateKey.replace(/\n/g, '\\n'), PUBLIC_KEY: publicKey.replace(/\n/g, '\\n') })).not.toThrow();
  });

  it('lists every missing required variable', () => {
    expect(() => validateEnv({})).toThrow(/POSTGRES_HOST[\s\S]*POSTGRES_DB[\s\S]*PRIVATE_KEY/);
  });

  it('rejects keys that are not PEM', () => {
    expect(() => validateEnv({ ...valid, PRIVATE_KEY: 'stub' })).toThrow('PRIVATE_KEY is not a valid PEM key');
  });

  it('rejects an out-of-range port', () => {
    expect(() => validateEnv({ ...valid, PORT: '70000' })).toThrow(/PORT/);
  });

  it('rejects numbers that parseInt would read differently', () => {
    expect(() => validateEnv({ ...valid, THROTTLE_TTL_MS: '6e4' })).toThrow(/THROTTLE_TTL_MS/);
    expect(() => validateEnv({ ...valid, PORT: '0x10' })).toThrow(/PORT/);
    expect(() => validateEnv({ ...valid, THROTTLE_TTL_MS: '60000', THROTTLE_LIMIT: '100' })).not.toThrow();
  });

  it('accepts only "true" or "false" for flags the database config reads', () => {
    expect(() => validateEnv({ ...valid, POSTGRES_SSL: '1' })).toThrow(/POSTGRES_SSL/);
    expect(() => validateEnv({ ...valid, DB_RUN_MIGRATIONS: '1' })).toThrow(/DB_RUN_MIGRATIONS/);
    expect(() => validateEnv({ ...valid, POSTGRES_SSL: 'true', DB_RUN_MIGRATIONS: 'false' })).not.toThrow();
  });

  it('requires a unit on JWT_EXPIRES_IN', () => {
    expect(() => validateEnv({ ...valid, JWT_EXPIRES_IN: '3600' })).toThrow(/JWT_EXPIRES_IN/);
    expect(() => validateEnv({ ...valid, JWT_EXPIRES_IN: '1 hour later' })).toThrow(/JWT_EXPIRES_IN/);
    expect(() => validateEnv({ ...valid, JWT_EXPIRES_IN: '15m' })).not.toThrow();
    expect(() => validateEnv({ ...valid, JWT_EXPIRES_IN: '2 days' })).not.toThrow();
  });

  it('rejects keys RS256 cannot use', () => {
    const other = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    expect(() => validateEnv({ ...valid, PUBLIC_KEY: other.publicKey })).toThrow('PUBLIC_KEY does not match PRIVATE_KEY');

    // RSA keys under 2048 bits hit the same check. They are not generated here
    // because code scanning flags any weak key, even in a test.
    const ec = generateKeyPairSync('ec', {
      namedCurve: 'P-256',
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    expect(() => validateEnv({ ...valid, PRIVATE_KEY: ec.privateKey, PUBLIC_KEY: ec.publicKey })).toThrow(/must be an RSA key/);
  });

  it('rejects an unknown LOG_LEVEL', () => {
    expect(() => validateEnv({ ...valid, LOG_LEVEL: 'verbose' })).toThrow(/LOG_LEVEL/);
    expect(() => validateEnv({ ...valid, LOG_LEVEL: 'warn' })).not.toThrow();
  });
});
