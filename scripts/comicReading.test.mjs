import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { eq } from 'drizzle-orm';
import { comicIssues } from '../src/db/schema.ts';
import { markComicRead, readingPage, readingSummary } from '../src/lib/comicReading.ts';
import { marvelSource } from '../src/lib/comicReadingTypes.ts';
import { withTrackerRuntime } from '../src/lib/trackerRuntime.mjs';
import { PUT } from '../src/pages/api/comics/reading.ts';

const issue = (id, position = 1, chapter = 'part-1') => ({
  id, title: `Example #${position}`, year: '2000', chapter, chapterTitle: chapter,
  chapterOrder: chapter === 'part-1' ? 0 : 1, position, sourceUrl: marvelSource, readerUrl: null,
});

test('comic migrations, read/unread changes, filters and pagination persist personal progress', async () => {
  const client = new PGlite();
  const db = drizzle(client);
  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    const seeded = await readingSummary(db);
    assert.equal(seeded.total, 19997, 'The data migration populates the full public catalogue');
    const [firstIssue] = await db.select({ id: comicIssues.id }).from(comicIssues).limit(1);
    await markComicRead(db, firstIssue.id, true);
    await migrate(db, { migrationsFolder: './drizzle' });
    const migratedAgain = await readingSummary(db);
    assert.equal(migratedAgain.total, 19997, 'Repeated deployments do not duplicate issues');
    assert.equal(migratedAgain.read, 1, 'Repeated deployments preserve reading progress');
    await db.delete(comicIssues); // The following assertions use a small, isolated test catalogue.
    await db.insert(comicIssues).values([issue('a'), issue('b', 2), issue('c', 3, 'part-2'), { ...issue('archived'), active: false }]);
    assert.deepEqual(await markComicRead(db, 'a', true), { id: 'a', isRead: true });
    const [read] = await db.select().from(comicIssues).where(eq(comicIssues.id, 'a'));
    assert.ok(read.readAt instanceof Date);
    const summary = await readingSummary(db);
    assert.equal(summary.total, 3);
    assert.equal(summary.read, 1);
    assert.equal(summary.chapters[0].read, 1);
    const unread = await readingPage(db, new URLSearchParams('status=unread&chapter=part-1'));
    assert.deepEqual(unread.issues.map(row => row.id), ['b']);
    assert.equal((await readingPage(db, new URLSearchParams('q=Example%20%232'))).total, 1);
    assert.equal((await readingPage(db, new URLSearchParams('q=%25'))).total, 0);
    assert.equal(await markComicRead(db, 'archived', true), undefined);
    assert.equal(await markComicRead(db, 'missing', true), undefined);
    await markComicRead(db, 'a', false);
    const [reset] = await db.select().from(comicIssues).where(eq(comicIssues.id, 'a'));
    assert.equal(reset.readAt, null);
    assert.equal((await readingSummary(db)).read, 0);
    await db.insert(comicIssues).values(Array.from({ length: 80 }, (_, i) => issue(`page-${i}`, i + 4)));
    const last = await readingPage(db, new URLSearchParams('page=999999999'));
    assert.equal(last.page, 2);
    assert.equal(last.issues.length, 8);
  } finally { await client.close(); }
});

test('public editing validates JSON without requiring a token', async () => {
  const request = (body, contentType = 'application/json') => ({ request: new Request('https://example.test/api/comics/reading', {
    method: 'PUT', headers: { 'Content-Type': contentType }, body: JSON.stringify(body),
  }) });
  const run = task => withTrackerRuntime({ env: {} }, task);
  assert.equal((await run(() => PUT(request({ id: 'a', isRead: true }, 'text/plain')))).status, 415);
  assert.equal((await run(() => PUT(request({ id: 'a', isRead: 'yes' })))).status, 400);
  assert.equal((await run(() => PUT(request({ id: '', isRead: true })))).status, 400);
  const response = await run(() => PUT(request({ id: 'a', isRead: true })));
  assert.equal(response.status, 503, 'A valid anonymous request reaches the database layer, which has no URL in this test');
  assert.deepEqual(await response.json(), { error: 'Could not save reading progress. Please retry.' });
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});
