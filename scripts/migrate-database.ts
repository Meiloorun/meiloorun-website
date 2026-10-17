import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { databaseConnection, closeDatabases } from '../src/db/client.ts';
import { databaseUrl } from './database-env.mjs';
import { withMigrationRetries } from './migration-retry.mjs';

try {
  const url = databaseUrl();
  if (!url) throw new Error('DATABASE_URL is required');
  await withMigrationRetries(
    () => migrate(databaseConnection(url).db, { migrationsFolder: './drizzle' }),
    { reset: closeDatabases },
  );
  console.log('Database migrations applied.');
} catch {
  // Never print driver errors: connection details and query parameters may be private.
  console.error('Database migration failed. Check DATABASE_URL, connectivity and migration permissions.');
  process.exitCode = 1;
} finally { await closeDatabases(); }
