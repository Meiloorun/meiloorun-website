import type { APIRoute } from 'astro';
import { markComicRead, readingDatabase, readingPage } from '../../../lib/comicReading.ts';

export const prerender = false;
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export const GET: APIRoute = async ({ url }) => {
  try { return json(await readingPage(readingDatabase(), url.searchParams)); }
  catch { return json({ error: 'Reading progress is unavailable. Check the database migration.' }, 503); }
};

export const PUT: APIRoute = async ({ request }) => {
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) return json({ error: 'JSON is required.' }, 415);
  let body;
  try {
    const text = await request.text();
    if (text.length > 2048) return json({ error: 'Request too large.' }, 413);
    body = JSON.parse(text);
  } catch { return json({ error: 'Invalid request.' }, 400); }
  if (!body || typeof body.id !== 'string' || !body.id || body.id.length > 300 || typeof body.isRead !== 'boolean') {
    return json({ error: 'An issue ID and read status are required.' }, 400);
  }
  try {
    const issue = await markComicRead(readingDatabase(), body.id, body.isRead);
    return issue ? json(issue) : json({ error: 'Issue not found.' }, 404);
  } catch { return json({ error: 'Could not save reading progress. Please retry.' }, 503); }
};
