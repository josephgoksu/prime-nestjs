import { DataSourceOptions } from 'typeorm';
import { dataSourceOptions } from './database';

export interface AppConfig {
  env: string;
  port: number;
  allowedOrigins: string[];
  trustProxy: boolean | number | string;
  database: DataSourceOptions;
  keys: {
    privateKey: string;
    publicKey: string;
  };
  jwt: {
    expiresIn: string;
  };
  throttle: {
    ttlMs: number;
    limit: number;
    authLimit: number;
  };
}

const int = (value: string | undefined, fallback: number) => parseInt(value ?? '', 10) || fallback;

/** Express `trust proxy`: "true"/"false", a hop count, or a list of subnets. */
function trustProxy(value: string | undefined): boolean | number | string {
  if (value === undefined || value === '' || value === 'false') return false;
  if (value === 'true') return true;
  return /^\d+$/.test(value) ? Number(value) : value;
}

// Required variables are checked by validateEnv() before this runs.
export default (): AppConfig => ({
  env: process.env.NODE_ENV || 'development',
  port: int(process.env.PORT, 3000),
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',').map((o) => o.trim()),
  trustProxy: trustProxy(process.env.TRUST_PROXY),
  keys: {
    privateKey: (process.env.PRIVATE_KEY ?? '').replace(/\\n/gm, '\n'),
    publicKey: (process.env.PUBLIC_KEY ?? '').replace(/\\n/gm, '\n'),
  },
  jwt: {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  },
  throttle: {
    ttlMs: int(process.env.THROTTLE_TTL_MS, 60_000),
    limit: int(process.env.THROTTLE_LIMIT, 100),
    authLimit: int(process.env.THROTTLE_AUTH_LIMIT, 10),
  },
  database: dataSourceOptions,
});
