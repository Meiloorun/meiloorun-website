import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { createDatabaseCache } from './cache.ts';

const connections = new Map<string, ReturnType<typeof openConnection>>();
function openConnection(url: string) {
  const pool = new pg.Pool({ connectionString: url, max: 3,
    connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000, statement_timeout: 10000,
    query_timeout: 15000, allowExitOnIdle: true,
  });
  pool.on('error', () => console.warn('An idle PostgreSQL connection was lost; the pool will reconnect.'));
  const db = drizzle(pool);
  return { pool, db, storage: createDatabaseCache(db) };
}

/** Lazy singleton per connection URL; no database connection is made at build time. */
export function databaseConnection(url: string) {
  if (!connections.has(url)) connections.set(url, openConnection(url));
  return connections.get(url)!;
}

export async function closeDatabases() {
  await Promise.all([...connections.values()].map(({ pool }) => pool.end()));
  connections.clear();
}
