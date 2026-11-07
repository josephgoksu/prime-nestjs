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

  it('rejects an out-of-range port and an unknown NODE_ENV', () => {
    expect(() => validateEnv({ ...valid, PORT: '70000' })).toThrow(/PORT/);
    expect(() => validateEnv({ ...valid, NODE_ENV: 'prod' })).toThrow(/NODE_ENV/);
  });
});
