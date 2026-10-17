import assert from 'node:assert/strict';
import { test } from 'node:test';
import { withNodeTrackerRuntime } from '../src/lib/nodeTrackerRuntime.mjs';
import { trackerRuntime, setting } from '../src/lib/trackerRuntime.mjs';
import { readCache } from '../src/lib/cacheStorage.mjs';
import { closeDatabases } from '../src/db/client.ts';

test('Node requests require PostgreSQL and isolate runtime settings', async () => {
  await assert.rejects(withNodeTrackerRuntime({}, () => {}), /DATABASE_URL/);
  assert.throws(() => readCache('test'), error => error.code === 'database');
  try {
    await Promise.all(['first', 'second'].map(NAME => withNodeTrackerRuntime({ NAME,
      DATABASE_URL: 'postgres://test:test@127.0.0.1:1/test' }, async () => {
      await Promise.resolve();
      assert.equal(setting('NAME'), NAME);
      assert.equal(typeof trackerRuntime().storage.get, 'function');
    })));
    assert.equal(setting('NAME'), undefined);
  } finally { await closeDatabases(); }
});
