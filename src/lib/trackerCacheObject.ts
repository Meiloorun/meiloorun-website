import { withTrackerRuntime, type TrackerRuntime } from './trackerRuntime.mjs';
import { loadAniList, loadLastFm, loadSimkl } from './mediaTrackers';
import { loadMainGame, loadLibraryArtwork } from './igdb';

/** One private object owns the caches and Simkl token for this website. */
export class TrackerCache {
  private tail: Promise<unknown> = Promise.resolve();
  constructor(private ctx: { storage: NonNullable<TrackerRuntime['storage']> }, private env: TrackerRuntime['env']) {}

  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST' || new URL(request.url).pathname !== '/load') return new Response(null, { status: 404 });
    // Serialize whole refreshes, not just individual writes: simultaneous movies
    // and TV visits must never race an OAuth refresh or a library checkpoint.
    const task = this.tail.then(() => withTrackerRuntime({ env: this.env, storage: this.ctx.storage }, async () => {
      const { kind, args = [] } = await request.json() as { kind: string; args?: unknown[] };
      switch (kind) {
        case 'anilist':
          if (args[0] !== 'MANGA' && args[0] !== 'ANIME') break;
          return Response.json(await loadAniList(args[0]));
        case 'simkl': return Response.json(await loadSimkl());
        case 'lastfm': return Response.json(await loadLastFm());
        case 'main-game': return Response.json(await loadMainGame());
        case 'library-artwork':
          if (!Array.isArray(args[0]) || args[0].length > 10000 || args[0].some(id => !Number.isSafeInteger(id) || Number(id) < 1)) break;
          return Response.json(await loadLibraryArtwork(args[0] as number[]));
      }
      return new Response(null, { status: 400 });
    }));
    this.tail = task.catch(() => undefined);
    try { return await task; }
    catch { return new Response('Tracker unavailable', { status: 503 }); }
  }
}
