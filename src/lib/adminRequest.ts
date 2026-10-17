import { databaseConnection } from '../db/client.ts';
import { setting, trackerRuntime } from './trackerRuntime.mjs';
import { adminConfig, adminSessionSeconds } from './adminAuth.ts';
import type { AdminSession } from './adminTypes.ts';

export const currentAdminConfig = () => adminConfig(trackerRuntime()?.env || {});
export function adminDatabase() {
  const url = setting('DATABASE_URL');
  if (!url) throw new Error('Database is not configured');
  return databaseConnection(url).db;
}
export const adminJson = (body: unknown, status = 200, extraHeaders?: HeadersInit) => Response.json(body, {
  status, headers: { 'Cache-Control': 'private, no-store', ...extraHeaders },
});
export function sameOriginError(request: Request) {
  const url = new URL(request.url);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if ((!local && url.protocol !== 'https:') || request.headers.get('Origin') !== url.origin) {
    return adminJson({ error: 'This request must come from this website.' }, 403);
  }
}
export function adminWriteError(request: Request, session?: AdminSession | null) {
  return sameOriginError(request) || (!session ? adminJson({ error: 'Sign in as admin to make changes.' }, 401) : undefined);
}
export const adminCookieName = (url: URL) => url.protocol === 'https:' ? '__Host-admin_session' : 'admin_session_dev';
export function adminToken(request: Request) {
  const name = adminCookieName(new URL(request.url));
  return request.headers.get('Cookie')?.split(';').map(value => value.trim()).find(value => value.startsWith(`${name}=`))?.slice(name.length + 1);
}
export function sessionCookie(request: Request, token: string, clear = false) {
  const url = new URL(request.url);
  return `${adminCookieName(url)}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : adminSessionSeconds}${url.protocol === 'https:' ? '; Secure' : ''}`;
}

/** Limit request bodies before allocating/decoding the whole payload. */
export async function adminBody(request: Request): Promise<Record<string, unknown>> {
  if (request.headers.get('Content-Type')?.split(';')[0].trim() !== 'application/json') throw new Error('JSON required');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Missing request body');
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 2048) { await reader.cancel(); throw new Error('Request too large'); }
      chunks.push(value);
    }
    const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid request');
    return value;
  } finally { reader.releaseLock(); }
}
