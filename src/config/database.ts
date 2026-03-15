import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT ?? '5432', 10) || 5432,
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  entities: ['dist/**/*.entity{.ts,.js}'],
  migrations: ['dist/migrations/*{.ts,.js}'],
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
