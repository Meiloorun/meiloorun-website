import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { adminAuthState, adminSessions } from '../src/db/schema.ts';
import { adminConfig, authenticator, findAdminSession, listAdminSessions, loginAdmin, recoveryHash, revokeAdminSessions } from '../src/lib/adminAuth.ts';
import { adminBody, adminCookieName, adminToken, adminWriteError, sameOriginError, sessionCookie } from '../src/lib/adminRequest.ts';

// Public RFC 6238 test secret; never a real credential.
const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
const recovery = '1111-2222-3333-4444-5555-6666-7777-8888';
const config = adminConfig({ ADMIN_TOTP_SECRET: secret, ADMIN_RECOVERY_HASHES: recoveryHash(recovery) });
const now = new Date(59000);

test('TOTP configuration uses the standard RFC vector and rejects invalid settings', () => {
  assert.equal(adminConfig({}), undefined);
  assert.throws(() => adminConfig({ ADMIN_TOTP_SECRET: 'short' }));
  assert.throws(() => adminConfig({ ADMIN_TOTP_SECRET: secret, ADMIN_RECOVERY_HASHES: 'invalid' }));
  assert.equal(authenticator(secret).generate({ timestamp: now.getTime() }), '287082');
  assert.notEqual(config.credentialKey, secret);
});

test('admin sessions persist hashes, prevent replay, expire, revoke and consume recovery codes once', async () => {
  const client = new PGlite();
  const db = drizzle(client);
  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    const first = await loginAdmin(db, config, '287082', 'Laptop', now);
    assert.equal(first.ok, true);
    assert.equal(first.token.length, 43);
    assert.equal((await findAdminSession(db, config, first.token, now)).label, 'Laptop');
    const stored = await db.select().from(adminSessions);
    assert.notEqual(stored[0].tokenHash, first.token);
    assert.ok(!JSON.stringify(stored).includes(secret));
    assert.ok(!JSON.stringify(stored).includes(first.token));
    assert.equal((await loginAdmin(db, config, '287082', 'Replayed', now)).status, 401);
    const second = await loginAdmin(db, config, recovery, 'Phone', now);
    assert.equal(second.ok, true);
    assert.equal((await loginAdmin(db, config, recovery, 'Recovery replay', now)).status, 401);
    assert.equal((await listAdminSessions(db, config, first.session.id, now)).length, 2);
    assert.equal((await listAdminSessions(db, config, first.session.id, now)).filter(value => value.current).length, 1);
    assert.equal(await findAdminSession(db, config, 'invalid', now), null);
    assert.equal(await findAdminSession(db, config, first.token, new Date(now.getTime() + 7 * 86400000)), null);
    const rotated = adminConfig({ ADMIN_TOTP_SECRET: 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP' });
    assert.equal(await findAdminSession(db, rotated, first.token, now), null);
    await revokeAdminSessions(db, config, first.session.id);
    assert.equal(await findAdminSession(db, config, first.token, now), null);
    assert.ok(await findAdminSession(db, config, second.token, now));
    await revokeAdminSessions(db, config);
    assert.equal(await findAdminSession(db, config, second.token, now), null);
  } finally { await client.close(); }
});

test('database throttling survives request instances and blocks correct codes until cooldown ends', async () => {
  const client = new PGlite();
  const db = drizzle(client);
  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    for (let attempt = 0; attempt < 4; attempt++) assert.equal((await loginAdmin(db, config, 'bad-code', '', now)).status, 401);
    const blocked = await loginAdmin(drizzle(client), config, 'bad-code', '', now);
    assert.equal(blocked.status, 429);
    assert.equal(blocked.retryAfter, 300);
    assert.equal((await loginAdmin(drizzle(client), config, '287082', '', now)).status, 429);
    assert.equal((await db.select().from(adminSessions)).length, 0);
    const later = new Date(now.getTime() + 301000);
    const valid = authenticator(secret).generate({ timestamp: later.getTime() });
    assert.equal((await loginAdmin(db, config, valid, '', later)).ok, true);
    const [state] = await db.select().from(adminAuthState);
    assert.equal(state.failures, 0);
    assert.equal(state.blockedUntil, null);
  } finally { await client.close(); }
});

test('cookies are host-only, HTTP-only and secure, and mutation checks reject foreign or missing origins', async () => {
  const request = new Request('https://example.test/api/admin/session', { method: 'POST', headers: { Origin: 'https://example.test' } });
  const cookie = sessionCookie(request, 'synthetic-token');
  for (const flag of ['__Host-admin_session=', 'Path=/', 'HttpOnly', 'SameSite=Strict', 'Secure', 'Max-Age=604800']) assert.ok(cookie.includes(flag));
  assert.ok(!cookie.includes('Domain='));
  assert.ok(sessionCookie(request, '', true).includes('Max-Age=0'));
  assert.equal(adminCookieName(new URL('http://localhost:4321')), 'admin_session_dev');
  assert.equal(adminToken(new Request(request.url, { headers: { Cookie: 'other=ignored; __Host-admin_session=abc' } })), 'abc');
  assert.equal(sameOriginError(request), undefined);
  assert.equal(adminWriteError(request, null).status, 401);
  assert.equal(adminWriteError(request, { id: 'test' }), undefined);
  for (const origin of ['https://foreign.test', 'null', '']) {
    const foreign = new Request(request.url, { headers: { Origin: origin } });
    assert.equal(adminWriteError(foreign, { id: 'test' }).status, 403);
  }
  const body = new Request(request.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: '123456' }) });
  assert.deepEqual(await adminBody(body), { code: '123456' });
  await assert.rejects(adminBody(new Request(request.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: 'x'.repeat(2049) })));
});
