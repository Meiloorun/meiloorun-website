import type { APIRoute } from 'astro';
import { listAdminSessions, loginAdmin, revokeAdminSessions } from '../../../lib/adminAuth';
import { adminBody, adminDatabase, adminJson, adminWriteError, currentAdminConfig, sameOriginError, sessionCookie } from '../../../lib/adminRequest';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  try {
    const config = currentAdminConfig();
    const session = locals.adminSession;
    return adminJson({ configured: !!config, authenticated: !!session,
      sessions: config && session ? await listAdminSessions(adminDatabase(), config, session.id) : [],
    });
  } catch { return adminJson({ error: 'Admin access is temporarily unavailable.' }, 503); }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const originError = sameOriginError(request);
  if (originError) return originError;
  let body;
  try { body = await adminBody(request); }
  catch { return adminJson({ error: 'Enter an authenticator or recovery code.' }, 400); }
  if (typeof body.code !== 'string' || body.code.length > 64 ||
    (body.label !== undefined && (typeof body.label !== 'string' || body.label.length > 80))) {
    return adminJson({ error: 'Enter a valid code and browser name.' }, 400);
  }
  try {
    const config = currentAdminConfig();
    if (!config) return adminJson({ error: 'Admin login has not been configured.' }, 503);
    const result = await loginAdmin(adminDatabase(), config, body.code, typeof body.label === 'string' ? body.label : 'My browser');
    if (!result.ok) return adminJson({ error: result.status === 429 ? 'Too many attempts. Wait five minutes before trying again.' : 'The code is invalid or has already been used. Try the next code.' }, result.status,
      result.retryAfter ? { 'Retry-After': String(result.retryAfter) } : undefined);
    // A fresh login rotates this browser's previous session without retaining its old token.
    if (locals.adminSession) await revokeAdminSessions(adminDatabase(), config, locals.adminSession.id);
    return adminJson({ authenticated: true }, 200, { 'Set-Cookie': sessionCookie(request, result.token) });
  } catch { return adminJson({ error: 'Could not sign in. Check server configuration and migrations.' }, 503); }
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  const denied = adminWriteError(request, locals.adminSession);
  if (denied) return denied;
  let body;
  try { body = await adminBody(request); }
  catch { return adminJson({ error: 'Invalid session request.' }, 400); }
  if ((body.all !== undefined && body.all !== true) || (body.id !== undefined && (typeof body.id !== 'string' || !body.id || body.id.length > 80))) {
    return adminJson({ error: 'Invalid session request.' }, 400);
  }
  try {
    const config = currentAdminConfig();
    if (!config) return adminJson({ error: 'Admin login is unavailable.' }, 503);
    const id = body.all === true ? undefined : typeof body.id === 'string' ? body.id : locals.adminSession!.id;
    await revokeAdminSessions(adminDatabase(), config, id);
    const signedOut = !id || id === locals.adminSession!.id;
    return adminJson({ signedOut }, 200, signedOut ? { 'Set-Cookie': sessionCookie(request, '', true) } : undefined);
  } catch { return adminJson({ error: 'Could not revoke the session. Please retry.' }, 503); }
};
