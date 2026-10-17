import type { MediaEntry, NowPlayingFeed } from '../components/ui/TrackerPanel';
import { setting } from './trackerRuntime.mjs';
import { trackerRequest, trackerDiagnostic, trackerErrorMessages } from './trackerRequest.mjs';

export interface LastFmTrack {
  name: string; url: string; artist: { '#text': string };
  image?: { size: string; '#text': string }[];
  '@attr'?: { nowplaying?: string }; date?: { uts: string };
}

export async function lastFmRequest(method: string, period?: string) {
  const endpoint = new URL('https://ws.audioscrobbler.com/2.0/');
  endpoint.search = new URLSearchParams({ method, user: setting('LASTFM_USERNAME')!, api_key: setting('LASTFM_API_KEY')!,
    format: 'json', limit: '6', ...(period ? { period } : {}) }).toString();
  const result = await trackerRequest(endpoint.href, { cache: 'no-store' }, { includeErrorMessages: true });
  if (result.error) throw Object.assign(new Error('Last.fm API request failed'), {
    code: 'api', upstreamMessages: trackerErrorMessages(result, [setting('LASTFM_API_KEY')]),
    ...(result.error === 29 ? { retryDelay: 60000 } : {}),
  });
  return result;
}

// Share only overlapping requests. No completed response or now-playing result is cached.
const pending = new Map<string, Promise<LastFmTrack[]>>();
export function recentLastFmTracks(): Promise<LastFmTrack[]> {
  const key = `${setting('LASTFM_USERNAME')}:${setting('LASTFM_API_KEY')}`;
  if (pending.has(key)) return pending.get(key)!;
  const task = lastFmRequest('user.getrecenttracks').then(result => {
    if (!Array.isArray(result.recenttracks?.track)) throw Object.assign(new Error('Invalid Last.fm response'), { code: 'invalid-data' });
    return result.recenttracks.track as LastFmTrack[];
  }).finally(() => pending.delete(key));
  pending.set(key, task);
  return task;
}

export const lastFmTrackEntry = (track: LastFmTrack): MediaEntry => ({
  title: track.name, href: track.url, detail: track.artist['#text'],
  image: track.image?.find(image => image.size === 'large')?.['#text'] || undefined,
  date: track.date ? new Date(Number(track.date.uts) * 1000).toISOString() : undefined,
});

export async function loadNowPlaying(): Promise<NowPlayingFeed> {
  const checkedAt = new Date().toISOString();
  if (!setting('LASTFM_USERNAME') || !setting('LASTFM_API_KEY')) return { state: 'unconfigured', current: [], checkedAt };
  try {
    const tracks = await recentLastFmTracks();
    return { state: 'ready', current: tracks.filter(track => track['@attr']?.nowplaying === 'true').map(lastFmTrackEntry), checkedAt };
  } catch (error) {
    console.warn('Last.fm now playing unavailable.', trackerDiagnostic(error));
    return { state: 'unavailable', current: [], checkedAt,
      retryAfter: Math.ceil(Math.max(60000, Number((error as { retryDelay?: number }).retryDelay) || 0) / 1000) };
  }
}
