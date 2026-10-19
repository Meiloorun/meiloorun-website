import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { trackerCache } from './schema.ts';

const cacheKey = (key: string) => key.replaceAll('\\', '/');
function databaseFailure() {
  // Driver errors can include SQL parameters containing private token records.
  return Object.assign(new Error('Tracker database operation failed'), { code: 'database' });
}

export function createDatabaseCache(db: NodePgDatabase) {
  return {
    async get<T = unknown>(key: string): Promise<T | undefined> {
      try {
        const [record] = await db.select({ value: trackerCache.value }).from(trackerCache)
          .where(eq(trackerCache.key, cacheKey(key))).limit(1);
        return record?.value as T | undefined;
      } catch { throw databaseFailure(); }
    },
    async put(key: string, value: unknown): Promise<void> {
      try {
        await db.insert(trackerCache).values({ key: cacheKey(key), value })
          .onConflictDoUpdate({ target: trackerCache.key, set: { value, updatedAt: new Date() } });
      } catch { throw databaseFailure(); }
    },
    async check(): Promise<void> {
      try { await db.select({ key: trackerCache.key }).from(trackerCache).limit(1); }
      catch { throw databaseFailure(); }
    },
  };
}
