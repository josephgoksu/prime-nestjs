import { plainToInstance, Transform } from 'class-transformer';
import { IsBooleanString, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min, validateSync } from 'class-validator';
import { createPrivateKey, createPublicKey } from 'node:crypto';

const toInt = ({ value }: { value: unknown }) => (value === undefined || value === '' ? undefined : Number(value));

/**
 * Environment variables the app reads. Validated once at startup so a bad
 * deployment fails immediately with a clear message, not on the first request.
 */
export class EnvironmentVariables {
  @IsOptional()
  @IsIn(['development', 'production', 'test'])
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

  @IsString()
  POSTGRES_PASSWORD: string;

  @IsString()
  @IsNotEmpty()
  POSTGRES_DB: string;

  @IsOptional()
  @IsBooleanString()
  POSTGRES_SSL?: string;

  @IsOptional()
  @IsBooleanString()
  DB_RUN_MIGRATIONS?: string;

  @IsString()
  @IsNotEmpty()
  PRIVATE_KEY: string;

  @IsString()
  @IsNotEmpty()
  PUBLIC_KEY: string;

  @IsOptional()
  @IsString()
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

export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const env = plainToInstance(EnvironmentVariables, config);
  const errors = validateSync(env, { skipMissingProperties: false, forbidUnknownValues: false });
  const messages = errors.flatMap((e) => Object.values(e.constraints ?? {}));

  for (const [name, parse] of [
    ['PRIVATE_KEY', createPrivateKey],
    ['PUBLIC_KEY', createPublicKey],
  ] as const) {
    const pem = config[name];
    if (typeof pem === 'string' && pem) {
      try {
        parse(pem.replace(/\\n/g, '\n'));
      } catch {
        messages.push(`${name} is not a valid PEM key`);
      }
    }
  }

  if (messages.length > 0) {
    throw new Error(`Invalid environment configuration:\n  - ${messages.join('\n  - ')}`);
  }
  return config;
}
