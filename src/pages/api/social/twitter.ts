import type { APIRoute } from 'astro';
import { loadTwitterFeed } from '../../../lib/twitterFeed';

export const prerender = false;
export const GET: APIRoute = async () => {
  const feed = await loadTwitterFeed();
  return Response.json(feed, {
    status: feed.state === 'unavailable' ? 503 : 200,
    headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
};
