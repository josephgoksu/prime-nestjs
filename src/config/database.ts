import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'node:path';
import { Task } from '../tasks/entities/task.entity';
import { User } from '../users/entities/user.entity';

// Load environment variables from .env file. dotenv >= 17 prints an
// "injected env" line on every call unless told to be quiet.
dotenv.config({ quiet: true });

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10) || 5432,
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  // Entities are listed as classes, not globs, so the app, the TypeORM CLI
  // (ts-node) and the test runner all share the same class identity.
  entities: [User, Task],
  // Resolved relative to this file: src/migrations under ts-node, dist/migrations at runtime.
  migrations: [join(__dirname, '..', 'migrations', '*.{ts,js}')],
  synchronize: false,
  ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED !== 'false' } : false,
  extra: {
    max: parseInt(process.env.POSTGRES_POOL_SIZE ?? '10', 10) || 10,
    connectionTimeoutMillis: 5000,
  },
};

// Create and export a new DataSource instance
const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
