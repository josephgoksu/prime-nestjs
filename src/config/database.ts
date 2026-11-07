// Load environment variables from .env file (the TypeORM CLI imports this file directly).
import './load-env';
import { DataSource, DataSourceOptions } from 'typeorm';
import { Task } from '../tasks/entities/task.entity';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { migrations } from '../migrations';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10) || 5432,
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  // Entities are listed as classes, not globs, so the app, the TypeORM CLI
  // (ts-node) and the test runner all share the same class identity.
  entities: [User, Task, RefreshToken],
  // Registered in src/migrations/index.ts, as classes for the same reason as entities.
  migrations,
  // gen_random_uuid() is built into PostgreSQL 13+, so no extension (and no superuser) is needed.
  // 'pgcrypto' only makes TypeORM generate gen_random_uuid() defaults; installExtensions: false
  // stops it running CREATE EXTENSION "pgcrypto" on every startup.
  uuidExtension: 'pgcrypto',
  installExtensions: false,
  synchronize: false,
  // Apply pending migrations on startup when DB_RUN_MIGRATIONS=true (the Docker Compose default).
  migrationsRun: process.env.DB_RUN_MIGRATIONS === 'true',
  ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED !== 'false' } : false,
  extra: {
    max: parseInt(process.env.POSTGRES_POOL_SIZE ?? '10', 10) || 10,
    connectionTimeoutMillis: 5000,
  },
};

// Create and export a new DataSource instance
const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
