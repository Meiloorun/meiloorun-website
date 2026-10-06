import assert from 'node:assert/strict';
import { test } from 'node:test';
import { withTrackerRuntime, setting, sharedTracker } from '../src/lib/trackerRuntime.mjs';
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

test('request contexts isolate credentials and dispatch only to the private shared object', async () => {
  const requests = [];
  const namespace = {
    idFromName: name => name,
    get: id => ({ fetch: async (url, options) => {
      requests.push({ id, url, payload: JSON.parse(options.body) });
      return Response.json({ state: 'ready' });
    } }),
  };
  await Promise.all(['first', 'second'].map(name => withTrackerRuntime({ env: { NAME: name, TRACKER_CACHE: namespace } }, async () => {
    await Promise.resolve();
    assert.equal(setting('NAME'), name);
    assert.deepEqual(await sharedTracker('simkl'), { value: { state: 'ready' } });
  })));
  assert.equal(setting('NAME'), undefined);
  assert.equal(requests.length, 2);
  assert.ok(requests.every(request => request.id === 'media-v1' && request.payload.kind === 'simkl'));
  assert.equal(await withTrackerRuntime({ env: {}, storage: storage(new Map()) }, () => sharedTracker('simkl')), undefined,
    'A loader inside the object executes directly rather than recursively dispatching');
  await assert.rejects(sharedTracker('simkl'), /not configured/);
});
