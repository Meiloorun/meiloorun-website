import type { APIRoute } from 'astro';
import { adminBody, adminJson, adminWriteError } from '../../../lib/adminRequest.ts';
import { readMainGameId, saveMainGameId, siteSettingsDatabase, validMainGameId } from '../../../lib/siteSettings.ts';

export const prerender = false;

export const GET: APIRoute = async ({ locals }) => {
  if (!locals.adminSession) return adminJson({ error: 'Sign in as admin to view settings.' }, 401);
  try { return adminJson({ mainGameId: await readMainGameId(siteSettingsDatabase()) }); }
  catch { return adminJson({ error: 'Could not load the main game setting. Check database migrations.' }, 503); }
};

export const PUT: APIRoute = async ({ request, locals }) => {
  const denied = adminWriteError(request, locals.adminSession);
  if (denied) return denied;
  let body;
  try { body = await adminBody(request); }
  catch { return adminJson({ error: 'A JSON game setting is required.' }, 400); }
  if (!validMainGameId(body.mainGameId)) return adminJson({ error: 'Enter a positive IGDB game ID, or leave it blank to clear.' }, 400);
  try {
    await saveMainGameId(siteSettingsDatabase(), body.mainGameId);
    return adminJson({ mainGameId: body.mainGameId });
  } catch { return adminJson({ error: 'Could not save the main game setting. Please retry.' }, 503); }
};
