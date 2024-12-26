import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT, 10),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  entities: ['dist/**/*.entity{.ts,.js}'],
  migrations: ['dist/migrations/*{.ts,.js}'],
  synchronize: process.env.NODE_ENV === 'development',
  ssl: process.env.POSTGRES_SSL === 'true',
};

// Create and export a new DataSource instance
const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
