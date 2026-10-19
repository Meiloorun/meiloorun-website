import type { APIRoute } from 'astro';
import { loadNowPlaying } from '../../../lib/lastFm.ts';

export const prerender = false;
export const GET: APIRoute = async () => {
  const feed = await loadNowPlaying();
  return Response.json(feed, { status: feed.state === 'unavailable' ? 503 : 200,
    headers: { 'Cache-Control': 'no-store, max-age=0', 'CDN-Cache-Control': 'no-store',
      ...(feed.retryAfter ? { 'Retry-After': String(feed.retryAfter) } : {}) },
  });
};
