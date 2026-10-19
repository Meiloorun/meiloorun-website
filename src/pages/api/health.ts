import type { APIRoute } from 'astro';
import { trackerRuntime } from '../../lib/trackerRuntime.mjs';

export const prerender = false;
export const GET: APIRoute = async () => {
  try {
    await trackerRuntime()?.storage?.check?.();
    return Response.json({ status: 'ok' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ status: 'unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
};
