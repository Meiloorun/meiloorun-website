import assert from 'node:assert/strict';
import { test } from 'node:test';
import { trackerRequest, trackerDiagnostic } from '../src/lib/trackerRequest.mjs';

test('tracker errors distinguish HTTP, challenge, malformed JSON and network failures without exposing credentials', async () => {
  const originalFetch = globalThis.fetch;
  const endpoint = 'https://tracker.invalid/?api_key=private-test-value';
  try {
    globalThis.fetch = async () => new Response('private upstream response', { status: 403,
      headers: { 'cf-mitigated': 'challenge', 'Content-Type': 'text/html' } });
    await assert.rejects(trackerRequest(endpoint), error => {
      assert.deepEqual(trackerDiagnostic(error), { code: 'upstream-challenge', httpStatus: 403, responseType: 'other' });
      assert.ok(!JSON.stringify(error).includes('private'));
      return true;
    });
    globalThis.fetch = async () => new Response('{}', { status: 429, headers: { 'Retry-After': '600', 'Content-Type': 'application/json' } });
    await assert.rejects(trackerRequest(endpoint), error => error.httpStatus === 429 && error.retryDelay === 600000);
    globalThis.fetch = async () => new Response('<html>private response</html>');
    await assert.rejects(trackerRequest(endpoint), error => error.code === 'invalid-json');
    globalThis.fetch = async () => { throw Object.assign(new Error(endpoint), { name: 'TimeoutError' }); };
    await assert.rejects(trackerRequest(endpoint), error => error.code === 'timeout' && !error.message.includes('api_key'));
    assert.deepEqual(trackerDiagnostic({ code: endpoint, httpStatus: 'private', responseType: 'private' }), { code: 'unknown' });
  } finally { globalThis.fetch = originalFetch; }
});
