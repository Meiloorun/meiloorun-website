import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { databaseConnection } from '../db/client.ts';
import { siteSettings } from '../db/schema.ts';
import { setting } from './trackerRuntime.mjs';

export function siteSettingsDatabase() {
  const url = setting('DATABASE_URL');
  if (!url) throw new Error('Site settings database is not configured');
  return databaseConnection(url).db;
}

export function validMainGameId(id: unknown): id is number | null {
  return id === null || (typeof id === 'number' && Number.isInteger(id) && id > 0 && id <= 2147483647);
}

export async function readMainGameId(db: NodePgDatabase): Promise<number | null> {
  const [row] = await db.select({ mainGameId: siteSettings.mainGameId }).from(siteSettings).where(eq(siteSettings.id, 'main'));
  return row?.mainGameId ?? null;
}

export async function saveMainGameId(db: NodePgDatabase, mainGameId: number | null) {
  if (!validMainGameId(mainGameId)) throw new Error('Invalid IGDB game ID');
  await db.insert(siteSettings).values({ id: 'main', mainGameId }).onConflictDoUpdate({
    target: siteSettings.id, set: { mainGameId, updatedAt: new Date() },
  });
}
