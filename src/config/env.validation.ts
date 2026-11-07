import { plainToInstance, Transform } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, Max, Min, validateSync } from 'class-validator';
import { createPrivateKey, createPublicKey, KeyObject } from 'node:crypto';

// Plain digits only: the config reads these with parseInt, which stops at the
// first non-digit ("6e4" -> 6), so anything else must fail validation here.
const toInt = ({ value }: { value: unknown }) => {
  if (value === undefined || value === '') return undefined;
  return typeof value === 'string' && /^\s*\d+\s*$/.test(value) ? Number(value) : NaN;
};

// database.ts only treats the exact string "true" as enabled.
const BOOLEAN_STRINGS = ['true', 'false'];

// A time span with a unit, as jsonwebtoken (vercel/ms) parses it. A bare number
// would be read as milliseconds, so "3600" would issue tokens valid for 3 seconds.
const TIMESPAN = /^\d*\.?\d+ *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)$/i;

/**
 * Environment variables the app reads. Validated once at startup so a bad
 * deployment fails immediately with a clear message, not on the first request.
 */
export class EnvironmentVariables {
  @IsOptional()
  // Any value is allowed (staging, preview...). Only `production` changes behavior: it turns Swagger off.
  @IsString()
  NODE_ENV?: string;

  @IsOptional()
  @Transform(toInt)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT?: number;

  @IsString()
  @IsNotEmpty()
  POSTGRES_HOST: string;

  @IsOptional()
  @Transform(toInt)
  @IsInt()
  @Min(1)
  @Max(65535)
  POSTGRES_PORT?: number;

  @IsString()
  @IsNotEmpty()
  POSTGRES_USER: string;

  // Optional: pg falls back to PGPASSWORD or .pgpass, and trust auth needs none.
  @IsOptional()
  @IsString()
  POSTGRES_PASSWORD?: string;

  @IsString()
  @IsNotEmpty()
  POSTGRES_DB: string;

  @IsOptional()
  @IsIn(BOOLEAN_STRINGS)
  POSTGRES_SSL?: string;

  @IsOptional()
  @IsIn(BOOLEAN_STRINGS)
  DB_RUN_MIGRATIONS?: string;

  @IsString()
  @IsNotEmpty()
  PRIVATE_KEY: string;

  @IsString()
  @IsNotEmpty()
  PUBLIC_KEY: string;

  @IsOptional()
  @IsIn(['', 'trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'])
  LOG_LEVEL?: string;

  @IsOptional()
  @Matches(TIMESPAN, { message: 'JWT_EXPIRES_IN must be a number with a unit, such as 15m, 1h or 7d' })
  JWT_EXPIRES_IN?: string;

  @IsOptional()
  @Transform(toInt)
  @IsInt()
  @Min(1)
  THROTTLE_LIMIT?: number;

  @IsOptional()
  @Transform(toInt)
  @IsInt()
  @Min(1)
  THROTTLE_AUTH_LIMIT?: number;

  @IsOptional()
  @Transform(toInt)
  @IsInt()
  @Min(1000)
  THROTTLE_TTL_MS?: number;
}

/** RS256 needs an RSA key pair, and jsonwebtoken refuses to sign with keys under 2048 bits. */
function checkKeys(config: Record<string, unknown>, messages: string[]): void {
  const load = (name: string, parse: (pem: string) => KeyObject): KeyObject | undefined => {
    const pem = config[name];
    if (typeof pem !== 'string' || !pem) return undefined;
    try {
      return parse(pem.replace(/\\n/g, '\n'));
    } catch {
      messages.push(`${name} is not a valid PEM key`);
      return undefined;
    }
  };
  const privateKey = load('PRIVATE_KEY', createPrivateKey);
  const publicKey = load('PUBLIC_KEY', createPublicKey);

  for (const [name, key] of [
    ['PRIVATE_KEY', privateKey],
    ['PUBLIC_KEY', publicKey],
  ] as const) {
    if (key && (key.asymmetricKeyType !== 'rsa' || (key.asymmetricKeyDetails?.modulusLength ?? 0) < 2048)) {
      messages.push(`${name} must be an RSA key of at least 2048 bits (RS256)`);
    }
  }

  if (privateKey && publicKey) {
    const derived = createPublicKey(privateKey).export({ type: 'spki', format: 'der' });
    if (!derived.equals(publicKey.export({ type: 'spki', format: 'der' }))) {
      messages.push('PUBLIC_KEY does not match PRIVATE_KEY');
    }
  }
}

export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const env = plainToInstance(EnvironmentVariables, config);
  const errors = validateSync(env, { skipMissingProperties: false, forbidUnknownValues: false });
  const messages = errors.flatMap((e) => Object.values(e.constraints ?? {}));

  checkKeys(config, messages);

  if (messages.length > 0) {
    throw new Error(`Invalid environment configuration:\n  - ${messages.join('\n  - ')}`);
  }
  return config;
}
