import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, unlink, rmdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { withNodeTrackerRuntime } from '../src/lib/nodeTrackerRuntime.mjs';
import { sharedTracker, setting } from '../src/lib/trackerRuntime.mjs';
import { readCache, writeCache } from '../src/lib/cacheStorage.mjs';

test('Node requests isolate runtime settings, bypass Cloudflare, and reuse persistent files', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'meiloorun-node-'));
  try {
    await Promise.all(['first', 'second'].map(NAME => withNodeTrackerRuntime({ NAME, TRACKER_DATA_DIR: directory }, async () => {
      await Promise.resolve();
      assert.equal(setting('NAME'), NAME);
      assert.equal(await sharedTracker('anilist', ['MANGA']), undefined);
    })));
    assert.equal(setting('NAME'), undefined);
    await withNodeTrackerRuntime({ TRACKER_DATA_DIR: directory }, () => writeCache('state.json', { snapshot: 'saved' }));
    assert.deepEqual(JSON.parse(await readFile(join(directory, 'state.json'), 'utf8')), { snapshot: 'saved' });
    assert.deepEqual(await withNodeTrackerRuntime({ TRACKER_DATA_DIR: directory }, () => readCache('state.json')), { snapshot: 'saved' });
  } finally { await unlink(join(directory, 'state.json')).catch(() => {}); await rmdir(directory); }
});
