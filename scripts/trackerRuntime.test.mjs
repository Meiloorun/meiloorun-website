import assert from 'node:assert/strict';
import { test } from 'node:test';
import { withTrackerRuntime, setting } from '../src/lib/trackerRuntime.mjs';
import { cachedMediaFeed } from '../src/lib/mediaFeedCache.mjs';
import { readCache, writeCache } from '../src/lib/cacheStorage.mjs';

const storage = values => ({
  get: async key => structuredClone(values.get(key)),
  put: async (key, value) => { values.set(key, structuredClone(value)); },
});

test('durable cache survives a new request/storage wrapper and retries retain the original snapshot', async () => {
  const values = new Map();
  let calls = 0;
  const load = async () => { calls++; return { updatedAt: 'original', entries: ['movie'] }; };
  const run = task => withTrackerRuntime({ env: {}, storage: storage(values) }, task);
  const first = await run(() => cachedMediaFeed('durable-feed', 60000, load));
  assert.deepEqual(await run(() => cachedMediaFeed('durable-feed', 60000, load)), first);
  assert.equal(calls, 1);
  let failures = 0;
  const fail = async () => { failures++; throw new Error('Upstream unavailable'); };
  assert.deepEqual(await run(() => cachedMediaFeed('durable-feed', -1, fail)), first);
  assert.deepEqual(await run(() => cachedMediaFeed('durable-feed', -1, fail)), first);
  assert.equal(failures, 1, 'Persisted backoff prevents another upstream request');
  await run(() => writeCache('private-auth', { accessToken: 'test-only-token' }));
  assert.deepEqual(await run(() => readCache('private-auth')), { accessToken: 'test-only-token' });
});

test('request contexts isolate runtime settings across concurrent requests', async () => {
  await Promise.all(['first', 'second'].map(name => withTrackerRuntime({ env: { NAME: name } }, async () => {
    await Promise.resolve();
    assert.equal(setting('NAME'), name);
  })));
  assert.equal(setting('NAME'), undefined);
});
