import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { readMainGameId, saveMainGameId } from '../src/lib/siteSettings.ts';
import { siteSettings } from '../src/db/schema.ts';
import { GET, PUT } from '../src/pages/api/admin/main-game.ts';
import { withTrackerRuntime } from '../src/lib/trackerRuntime.mjs';

test('main game selection persists, replaces a single row, clears, and survives migrations', async () => {
  const client = new PGlite();
  const db = drizzle(client);
  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    assert.equal(await readMainGameId(db), null);
    await saveMainGameId(db, 1);
    assert.equal(await readMainGameId(drizzle(client)), 1);
    await saveMainGameId(db, 2);
    await migrate(db, { migrationsFolder: './drizzle' });
    assert.equal(await readMainGameId(db), 2);
    assert.equal((await db.select().from(siteSettings)).length, 1);
    await saveMainGameId(db, null);
    assert.equal(await readMainGameId(db), null);
    await assert.rejects(saveMainGameId(db, -1));
    await assert.rejects(db.insert(siteSettings).values({ id: 'other', mainGameId: 1 }));
    await assert.rejects(db.update(siteSettings).set({ mainGameId: 0 }));
  } finally { await client.close(); }
});

test('main game endpoint requires admin and same origin, rejects invalid IDs before accessing the database', async () => {
  const context = (mainGameId, authenticated = true, origin = 'https://example.test') => ({
    request: new Request('https://example.test/api/admin/main-game', {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify({ mainGameId }),
    }), locals: { adminSession: authenticated ? { id: 'synthetic-session' } : null },
  });
  const run = task => withTrackerRuntime({ env: {} }, task);
  assert.equal((await GET({ locals: { adminSession: null } })).status, 401);
  assert.equal((await run(() => PUT(context(1, false)))).status, 401);
  assert.equal((await run(() => PUT(context(1, true, 'https://foreign.test')))).status, 403);
  for (const id of [undefined, '1', 0, -1, 1.5, 2147483648, true, {}, '1; delete']) {
    assert.equal((await run(() => PUT(context(id)))).status, 400);
  }
  assert.equal((await run(() => PUT(context(1)))).status, 503, 'Valid settings reach the unconfigured database');
  assert.equal((await run(() => PUT(context(null)))).status, 503, 'Clearing also reaches the database');
});
