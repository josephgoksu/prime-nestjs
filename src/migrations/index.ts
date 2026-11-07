import type { MigrationInterface } from 'typeorm';
import { InitialSchema1794049279506 } from './1794049279506-InitialSchema';

/**
 * Every migration, in order. Register each new file here after
 * `npm run migration:generate -- src/migrations/Name`.
 *
 * Migrations are listed as classes instead of a glob for the same reason as
 * entities: the app, the TypeORM CLI and the test runner then load exactly the
 * same modules. migrations.spec.ts fails if a file is missing from this list.
 */
export const migrations: (new () => MigrationInterface)[] = [InitialSchema1794049279506];
