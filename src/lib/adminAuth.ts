import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { and, desc, eq, gt, lt } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { TOTP } from 'otpauth';
import { adminAuthState, adminSessions } from '../db/schema.ts';
import type { AdminSession } from './adminTypes.ts';

export const adminSessionSeconds = 7 * 24 * 60 * 60;
const attemptWindow = 5 * 60 * 1000;
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export const recoveryHash = (code: string) => hash(code.toLowerCase().replaceAll('-', ''));
export type AdminConfig = { secret: string; credentialKey: string; recoveryHashes: string[] };

export function adminConfig(env: Record<string, string | undefined>): AdminConfig | undefined {
  const secret = env.ADMIN_TOTP_SECRET?.trim().toUpperCase();
  if (!secret) return undefined;
  if (!/^[A-Z2-7]{32,128}$/.test(secret)) throw new Error('Invalid admin authentication configuration');
  const recoveryHashes = (env.ADMIN_RECOVERY_HASHES || '').split(',').filter(Boolean);
  if (recoveryHashes.some(value => !/^[a-f0-9]{64}$/.test(value))) throw new Error('Invalid admin recovery configuration');
  return { secret, recoveryHashes, credentialKey: hash(`${secret}:${recoveryHashes.join(',')}`) };
}

export const authenticator = (secret: string) => new TOTP({ issuer: 'Meiloorun', label: 'Admin', secret, algorithm: 'SHA1', digits: 6, period: 30 });
const publicSession = (row: typeof adminSessions.$inferSelect): AdminSession => ({
  id: row.id, label: row.label, createdAt: row.createdAt.toISOString(), expiresAt: row.expiresAt.toISOString(),
});
type LoginResult = { ok: true; token: string; session: AdminSession } | { ok: false; status: 401 | 429; retryAfter?: number };

/** Row locking serializes all attempts and code consumption across processes. Never log inputs. */
export async function loginAdmin(db: NodePgDatabase, config: AdminConfig, code: string, label: string, now = new Date()): Promise<LoginResult> {
  return db.transaction(async tx => {
    await tx.insert(adminAuthState).values({ credentialKey: config.credentialKey, windowStartedAt: now }).onConflictDoNothing();
    const [state] = await tx.select().from(adminAuthState).where(eq(adminAuthState.credentialKey, config.credentialKey)).for('update');
    if (state.blockedUntil && state.blockedUntil > now) {
      return { ok: false, status: 429, retryAfter: Math.ceil((state.blockedUntil.getTime() - now.getTime()) / 1000) };
    }
    const resetWindow = now.getTime() - state.windowStartedAt.getTime() >= attemptWindow;
    const token = code.trim();
    const delta = /^\d{6}$/.test(token) ? authenticator(config.secret).validate({ token, timestamp: now.getTime(), window: 1 }) : null;
    const step = delta === null ? -1 : Math.floor(now.getTime() / 30000) + delta;
    const candidate = recoveryHash(token);
    const recovery = /^[a-f0-9-]{32,39}$/i.test(token) &&
      config.recoveryHashes.some(value => timingSafeEqual(Buffer.from(value, 'hex'), Buffer.from(candidate, 'hex'))) &&
      !state.usedRecoveryHashes.includes(candidate);
    if (!(step > state.lastTotpStep || recovery)) {
      const failures = (resetWindow ? 0 : state.failures) + 1;
      await tx.update(adminAuthState).set({ failures, windowStartedAt: resetWindow ? now : state.windowStartedAt,
        blockedUntil: failures >= 5 ? new Date(now.getTime() + attemptWindow) : null,
      }).where(eq(adminAuthState.credentialKey, config.credentialKey));
      return failures >= 5 ? { ok: false, status: 429, retryAfter: attemptWindow / 1000 } : { ok: false, status: 401 };
    }
    await tx.update(adminAuthState).set({
      lastTotpStep: recovery ? state.lastTotpStep : step,
      usedRecoveryHashes: recovery ? [...state.usedRecoveryHashes, candidate] : state.usedRecoveryHashes,
      failures: 0, blockedUntil: null, windowStartedAt: now,
    }).where(eq(adminAuthState.credentialKey, config.credentialKey));
    await tx.delete(adminSessions).where(lt(adminSessions.expiresAt, now));
    const sessionToken = randomBytes(32).toString('base64url');
    const [session] = await tx.insert(adminSessions).values({
      id: randomUUID(), tokenHash: hash(sessionToken), credentialKey: config.credentialKey,
      label: label.trim().slice(0, 80) || 'My browser', createdAt: now, expiresAt: new Date(now.getTime() + adminSessionSeconds * 1000),
    }).returning();
    return { ok: true, token: sessionToken, session: publicSession(session) };
  });
}

export async function findAdminSession(db: NodePgDatabase, config: AdminConfig, token: string | undefined, now = new Date()) {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const [session] = await db.select().from(adminSessions).where(and(
    eq(adminSessions.tokenHash, hash(token)), eq(adminSessions.credentialKey, config.credentialKey), gt(adminSessions.expiresAt, now),
  )).limit(1);
  return session ? publicSession(session) : null;
}

export async function listAdminSessions(db: NodePgDatabase, config: AdminConfig, current: string, now = new Date()) {
  const rows = await db.select().from(adminSessions).where(and(
    eq(adminSessions.credentialKey, config.credentialKey), gt(adminSessions.expiresAt, now),
  )).orderBy(desc(adminSessions.createdAt));
  return rows.map(row => ({ ...publicSession(row), current: row.id === current }));
}

export async function revokeAdminSessions(db: NodePgDatabase, config: AdminConfig, id?: string) {
  await db.delete(adminSessions).where(and(eq(adminSessions.credentialKey, config.credentialKey), id ? eq(adminSessions.id, id) : undefined));
}
