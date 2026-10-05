import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readdir, unlink, rmdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { cachedGameMetadata } from '../src/lib/gameMetadataCache.mjs';

test('game metadata persists, invalidates, shares requests and recovers from failures', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'meiloorun-igdb-'));
  let calls = 0;
  const load = async () => { calls++; return { cover: 'cover.jpg' }; };
  const cache = (key, age, loader = load) => cachedGameMetadata(key, age, loader, directory);
  try {
    const first = await Promise.all([cache('ids:1,2', 60000), cache('ids:1,2', 60000)]);
    assert.deepEqual(first[0], first[1]);
    assert.equal(calls, 1);
    await cache('ids:1,2', 60000);
    assert.equal(calls, 1, 'Disk cache survives completion of the original request');
    await cache('ids:1,2,3', 60000);
    assert.equal(calls, 2, 'Changed game IDs invalidate the cache');
    await cache('ids:1,2', -1);
    assert.equal(calls, 3, 'Expired metadata is refreshed');
    const fail = async () => { throw new Error('Unavailable'); };
    assert.deepEqual(await cache('ids:1,2', -1, fail), { cover: 'cover.jpg' });
    await assert.rejects(cache('new-key', 60000, fail));
    await cache('new-key', 60000);
    assert.equal(calls, 4, 'Failed requests do not poison later attempts');
  } finally {
    for (const file of await readdir(directory)) await unlink(join(directory, file));
    await rmdir(directory);
  }
});
