import { DataSourceOptions } from 'typeorm';
import { dataSourceOptions } from './database';

interface iConfig {
  env: string;
  port: number;
  allowedOrigins: string[];
  database: DataSourceOptions;
  keys: {
    privateKey: string;
    publicKey: string;
  };
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export default (): Partial<iConfig> => ({
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT ?? '3000', 10) || 3000,
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',').map((o) => o.trim()),
  keys: {
    privateKey: requireEnv('PRIVATE_KEY').replace(/\\n/gm, '\n'),
    publicKey: requireEnv('PUBLIC_KEY').replace(/\\n/gm, '\n'),
  },
  database: dataSourceOptions,
});
