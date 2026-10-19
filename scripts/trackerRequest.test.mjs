import assert from 'node:assert/strict';
import { test } from 'node:test';
import { trackerRequest, trackerDiagnostic, trackerErrorMessages } from '../src/lib/trackerRequest.mjs';

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

test('service-specific error formats retain explanations and redact echoed request credentials', async () => {
  const originalFetch = globalThis.fetch;
  const secret = 'private/test+credential';
  const encoded = encodeURIComponent(secret);
  try {
    for (const body of [
      { message: `Invalid API key ${secret}` },
      { error: 'invalid_grant', error_description: `Refresh token ${encoded} expired` },
      [{ title: 'Authentication Failure', cause: `Invalid bearer ${secret}` }],
    ]) {
      globalThis.fetch = async () => Response.json(body, { status: 401 });
      await assert.rejects(trackerRequest(`https://tracker.invalid/?api_key=${encoded}`, {
        headers: { Authorization: `Bearer ${secret}` },
      }, { includeErrorMessages: true }), error => {
        const diagnostic = trackerDiagnostic(error);
        assert.equal(diagnostic.httpStatus, 401);
        assert.ok(diagnostic.upstreamMessages.length);
        assert.ok(diagnostic.upstreamMessages.some(message => message.includes('[redacted]')));
        assert.ok(!JSON.stringify(diagnostic).includes(secret));
        assert.ok(!JSON.stringify(diagnostic).includes(encoded));
        return true;
      });
    }
    globalThis.fetch = async () => Response.json({ message: `Invalid client secret ${secret}` }, { status: 400 });
    await assert.rejects(trackerRequest('https://id.twitch.tv/oauth2/token', {
      method: 'POST', body: new URLSearchParams({ client_secret: secret }),
    }, { includeErrorMessages: true }), error => trackerDiagnostic(error).upstreamMessages[0] === 'Invalid client secret [redacted]');
    assert.deepEqual(trackerErrorMessages({ error: 10, message: `Invalid API key ${secret}` }, [secret]), ['Invalid API key [redacted]']);
  } finally { globalThis.fetch = originalFetch; }
});

test('opted-in public API errors retain messages and a Cloudflare Ray ID without retaining response data', async () => {
  const originalFetch = globalThis.fetch;
  const message = 'The AniList API has been temporarily disabled due to severe stability issues.';
  try {
    globalThis.fetch = async () => Response.json({ errors: [{ message, status: 403 }], data: 'not-for-logs' }, {
      status: 403, headers: { 'cf-ray': 'abcdef1234567890-LHR' },
    });
    await assert.rejects(trackerRequest('https://graphql.anilist.co', {}, { includeErrorMessages: true }), error => {
      assert.deepEqual(trackerDiagnostic(error), { code: 'http', httpStatus: 403, responseType: 'json',
        upstreamMessages: [message], cfRay: 'abcdef1234567890-LHR' });
      assert.ok(!JSON.stringify(error).includes('not-for-logs'));
      return true;
    });
    await assert.rejects(trackerRequest('https://tracker.invalid'), error => !('upstreamMessages' in error));
    globalThis.fetch = async () => new Response('{invalid', { status: 403, headers: { 'Content-Type': 'application/json' } });
    await assert.rejects(trackerRequest('https://graphql.anilist.co', {}, { includeErrorMessages: true }), error => error.httpStatus === 403);
    assert.deepEqual(trackerErrorMessages([{ message: 'first\nmessage' }, { message: 123 }, { message: ' ' }]), ['first message']);
    const messages = trackerErrorMessages(Array.from({ length: 5 }, () => ({ message: 'x'.repeat(2000) })));
    assert.equal(messages.length, 3);
    assert.equal(messages[0].length, 1000);
  } finally { globalThis.fetch = originalFetch; }
});
