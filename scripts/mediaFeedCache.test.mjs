import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readdir, unlink, rmdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { cachedMediaFeed } from '../src/lib/mediaFeedCache.mjs';

test('media caches share loads, preserve snapshots, expire and back off across requests', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'meiloorun-media-'));
  const originalNow = Date.now;
  let now = originalNow();
  Date.now = () => now;
  let calls = 0;
  const load = async () => { calls++; return { updatedAt: new Date(now).toISOString(), entries: ['track'] }; };
  const cache = (key, loader = load) => cachedMediaFeed(key, 60000, loader, directory);
  try {
    const [first, second] = await Promise.all([cache('account-a'), cache('account-a')]);
    assert.deepEqual(first, second);
    assert.equal(calls, 1);
    assert.deepEqual(await cache('account-a'), first);
    assert.equal(calls, 1);
    await cache('account-b');
    assert.equal(calls, 2, 'Accounts use separate caches');
    now += 60001;
    const refreshed = await cache('account-a');
    assert.notEqual(refreshed.updatedAt, first.updatedAt);
    assert.equal(calls, 3);
    now += 60001;
    let failures = 0;
    const fail = async () => {
      failures++;
      throw Object.assign(new Error('Rate limited'), { retryDelay: 600000 });
    };
    assert.deepEqual(await cache('account-a', fail), refreshed);
    now += 300001;
    assert.deepEqual(await cache('account-a', fail), refreshed);
    assert.equal(failures, 1, 'Retry-After beyond the default backoff is respected');
    now += 300000;
    assert.deepEqual(await cache('account-a', fail), refreshed);
    assert.equal(failures, 2, 'Expired backoff permits another attempt');
    await assert.rejects(cache('cold-account', fail));
    await assert.rejects(cache('cold-account', fail));
    assert.equal(failures, 3, 'Failures without a saved feed also back off');
    const diagnosticFailure = async () => { throw Object.assign(new Error('Tracker request failed'), {
      code: 'http', httpStatus: 403, responseType: 'json', upstreamMessages: ['AniList rejection explanation'],
      cfRay: 'abcdef1234567890-LHR',
    }); };
    await assert.rejects(cache('diagnostic-account', diagnosticFailure));
    await assert.rejects(cache('diagnostic-account', () => { throw new Error('Should not request again'); }), error => {
      assert.equal(error.code, 'cache-backoff');
      assert.deepEqual(error.upstreamMessages, ['AniList rejection explanation']);
      assert.equal(error.cfRay, 'abcdef1234567890-LHR');
      assert.equal(error.httpStatus, 403);
      return true;
    });
  } finally {
    Date.now = originalNow;
    for (const file of await readdir(directory)) await unlink(join(directory, file));
    await rmdir(directory);
  }
});
