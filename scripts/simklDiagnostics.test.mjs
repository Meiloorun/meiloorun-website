import assert from 'node:assert/strict';
import { test } from 'node:test';
import { oauthRequest, syncSimkl } from '../src/lib/simkl.mjs';
import { withTrackerRuntime } from '../src/lib/trackerRuntime.mjs';

test('Simkl OAuth polling retains error codes and sync retains redacted authentication diagnostics', async () => {
  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;
  const warnings = [];
  try {
    console.warn = (...args) => warnings.push(args);
    globalThis.fetch = async () => Response.json({ error: 'authorization_pending', error_description: 'Awaiting approval' }, { status: 400 });
    const pending = await oauthRequest('test-client', 'token', { device_code: 'private-device' });
    assert.equal(pending.ok, false);
    assert.equal(pending.error, 'authorization_pending');
    assert.deepEqual(pending.failure.upstreamMessages, ['Awaiting approval', 'authorization_pending']);
    globalThis.fetch = async () => Response.json({ error: 'invalid_grant', error_description: 'Refresh token private-refresh expired' }, { status: 400 });
    const result = await withTrackerRuntime({ env: {}, storage: { get: async () => undefined, put: async () => {} } },
      () => syncSimkl({ clientId: 'test-client', refreshToken: 'private-refresh' }));
    assert.equal(result.shows.state, 'unavailable');
    assert.equal(result.failure.httpStatus, 400);
    assert.ok(result.failure.upstreamMessages.includes('Refresh token [redacted] expired'));
    assert.ok(!JSON.stringify(warnings).includes('private-refresh'));
  } finally { globalThis.fetch = originalFetch; console.warn = originalWarn; }
});
