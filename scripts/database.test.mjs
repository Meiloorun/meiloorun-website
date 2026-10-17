import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { createDatabaseCache } from '../src/db/cache.ts';
import { trackerCache } from '../src/db/schema.ts';
import { withTrackerRuntime } from '../src/lib/trackerRuntime.mjs';
import { withNodeTrackerRuntime } from '../src/lib/nodeTrackerRuntime.mjs';
import { trackerRuntime } from '../src/lib/trackerRuntime.mjs';
import { closeDatabases } from '../src/db/client.ts';
import { cachedMediaFeed } from '../src/lib/mediaFeedCache.mjs';
import { cachedGameMetadata } from '../src/lib/gameMetadataCache.mjs';

test('generated migration and Drizzle storage support upserts and portable keys', async () => {
  const client = new PGlite();
  const db = drizzle(client);
  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    await migrate(db, { migrationsFolder: './drizzle' });
    const storage = createDatabaseCache(db);
    await storage.check();
    assert.equal(await storage.get('missing'), undefined);
    const token = { accessToken: 'synthetic-test-token', expiresAt: 123 };
    await storage.put('.cache\\simkl\\test-auth.json', token);
    assert.deepEqual(await storage.get('.cache/simkl/test-auth.json'), token);
    await storage.put('.cache/simkl/test-auth.json', { ...token, expiresAt: 456 });
    assert.equal((await db.select().from(trackerCache)).length, 1, 'An upsert updates the existing key');
    await storage.put('.cache/simkl/test-library.json', { library: { movies: [] } });
    // A new adapter instance reuses records stored by the previous instance.
    assert.deepEqual(await createDatabaseCache(db).get('.cache/simkl/test-library.json'), { library: { movies: [] } });
  } finally { await client.close(); }
});

test('database-backed feed caches retain snapshots, retry state and metadata across request contexts', async () => {
  const client = new PGlite();
  const db = drizzle(client);
  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    const run = task => withTrackerRuntime({ env: {}, storage: createDatabaseCache(db) }, task);
    let calls = 0;
    const load = async () => { calls++; return { state: 'ready', updatedAt: 'original', current: [], recent: [] }; };
    const first = await run(() => cachedMediaFeed('database-account', 60000, load));
    assert.deepEqual(await run(() => cachedMediaFeed('database-account', 60000, load)), first);
    assert.equal(calls, 1);
    assert.deepEqual(await run(() => cachedMediaFeed('database-account', -1, async () => { throw new Error('API down'); })), first);
    assert.deepEqual(await run(() => cachedMediaFeed('database-account', -1, load)), first);
    assert.equal(calls, 1, 'Database retry state backs off across requests');
    const reject = async () => { throw Object.assign(new Error('API forbidden'), { code: 'http', httpStatus: 403, upstreamMessages: ['Test rejection'] }); };
    await assert.rejects(run(() => cachedMediaFeed('database-cold', 60000, reject)));
    await assert.rejects(run(() => cachedMediaFeed('database-cold', 60000, load)), error =>
      error.code === 'cache-backoff' && error.httpStatus === 403 && error.upstreamMessages[0] === 'Test rejection');
    const artwork = await run(() => cachedGameMetadata('database-game', 60000, async () => ({ cover: 'test.jpg' })));
    assert.deepEqual(await run(() => cachedGameMetadata('database-game', 60000, reject)), artwork);
  } finally { await client.close(); }
});

test('database failures are sanitized and do not trigger API refreshes or silently switch to file storage', async () => {
  const client = new PGlite();
  const db = drizzle(client);
  const storage = createDatabaseCache(db); // Intentionally missing the migration.
  let called = false;
  const load = async () => { called = true; return {}; };
  try {
    await assert.rejects(storage.put('private', { accessToken: 'not-for-logs' }), error =>
      error.code === 'database' && !JSON.stringify(error).includes('not-for-logs') && !error.message.includes('insert'));
    for (const cache of [cachedMediaFeed, cachedGameMetadata]) await assert.rejects(
      withTrackerRuntime({ env: {}, storage }, () => cache('no-schema', 60000, load)), error => error.code === 'database');
    assert.equal(called, false);
    await assert.rejects(storage.check(), error => error.code === 'database');
    await withNodeTrackerRuntime({ DATABASE_URL: 'postgres://test:test@localhost:1/not-a-real-database' }, async () => {
      assert.ok(trackerRuntime().storage, 'DATABASE_URL selects the database adapter before any query');
    });
  } finally { await client.close(); await closeDatabases(); }
});
