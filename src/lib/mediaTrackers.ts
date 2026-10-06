import type { MediaEntry, TrackerFeed } from '../components/ui/TrackerPanel';
import { syncSimkl } from './simkl.mjs';
import { cachedMediaFeed } from './mediaFeedCache.mjs';
import { setting, sharedTracker } from './trackerRuntime.mjs';

// Refresh intervals in milliseconds. Changing them here affects all media pages.
const refreshIntervals = { anilist: 15 * 60000, simkl: 5 * 60000, lastFmTracks: 5 * 60000, lastFmArtists: 60 * 60000 };

export async function loadSimkl() {
  const shared = await sharedTracker<Awaited<ReturnType<typeof syncSimkl>>>('simkl');
  if (shared) return shared.value;
  const options = {
    clientId: setting('SIMKL_CLIENT_ID'),
    accessToken: setting('SIMKL_ACCESS_TOKEN'),
    refreshToken: setting('SIMKL_REFRESH_TOKEN'),
    clientSecret: setting('SIMKL_CLIENT_SECRET'),
  };
  if (!options.clientId || (!options.accessToken && !options.refreshToken)) return syncSimkl(options);
  const load = () => cachedMediaFeed(`simkl-v1:${options.clientId}:${options.refreshToken || options.accessToken}`, refreshIntervals.simkl, async () => {
    const feed = await syncSimkl(options);
    if (feed.shows.state !== 'ready' || feed.movies.state !== 'ready') throw new Error('Simkl refresh failed');
    return feed;
  }).catch(() => ({ shows: empty('unavailable'), movies: empty('unavailable') }));
  return load();
}

// Imported only by Astro route frontmatter. API keys never enter a React island.
const empty = (state: TrackerFeed['state']): TrackerFeed => ({ state, current: [], recent: [] });

async function request(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(8000) });
  if (!response.ok) {
    const error = new Error('Tracker request failed') as Error & { retryDelay?: number };
    const retryAfter = response.headers.get('Retry-After');
    if (retryAfter) error.retryDelay = /^\d+$/.test(retryAfter) ? Number(retryAfter) * 1000 : Math.max(0, Date.parse(retryAfter) - Date.now());
    throw error;
  }
  return response.json();
}

interface AniListEntry {
  progress: number; status: string; updatedAt: number;
  media: { title: { userPreferred: string }; siteUrl: string; coverImage: { medium: string }; format: string };
}

export async function loadAniList(type: 'MANGA' | 'ANIME'): Promise<TrackerFeed> {
  const shared = await sharedTracker<TrackerFeed>('anilist', [type]);
  if (shared) return shared.value;
  const username = setting('ANILIST_USERNAME');
  if (!username) return empty('unconfigured');
  try {
    return await cachedMediaFeed<TrackerFeed>(`anilist-v1:${username}:${type}`, refreshIntervals.anilist, async () => {
    const result = await request('https://graphql.anilist.co', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        query: `query ($name: String!, $type: MediaType!) {
          current: Page(perPage: 6) {
            mediaList(userName: $name, type: $type, status_in: [CURRENT, REPEATING], sort: UPDATED_TIME_DESC) {
              progress status updatedAt media { title { userPreferred } siteUrl coverImage { medium } format }
            }
          }
          recent: Page(perPage: 6) {
            mediaList(userName: $name, type: $type, status_in: [CURRENT, COMPLETED, REPEATING, PAUSED, DROPPED], sort: UPDATED_TIME_DESC) {
              progress status updatedAt media { title { userPreferred } siteUrl coverImage { medium } format }
            }
          }
        }`,
        variables: { name: username, type },
      }),
    }) as { errors?: unknown[]; data?: { current: { mediaList: AniListEntry[] }; recent: { mediaList: AniListEntry[] } } };
    if (result.errors?.length || !result.data) throw new Error('Invalid tracker response');
    const entry = (item: AniListEntry): MediaEntry => ({
      title: item.media.title.userPreferred, href: item.media.siteUrl, image: item.media.coverImage.medium,
      detail: `${item.status.toLowerCase().replaceAll('_', ' ')} / ${type === 'MANGA' ? 'chapter' : 'episode'} ${item.progress}`,
      date: new Date(item.updatedAt * 1000).toISOString(),
    });
    return { state: 'ready', current: result.data.current.mediaList.map(entry),
      recent: result.data.recent.mediaList.map(entry), updatedAt: new Date().toISOString() };
    });
  } catch {
    // Don't log upstream URLs or responses: they may contain account details or API keys.
    console.warn(`AniList ${type} feed unavailable; keeping the profile link.`);
    return empty('unavailable');
  }
}

interface LastFmTrack {
  name: string; url: string; artist: { '#text': string };
  image?: { size: string; '#text': string }[];
  '@attr'?: { nowplaying?: string }; date?: { uts: string };
}

interface LastFmArtist {
  name: string; url: string; playcount: string;
}

export async function loadLastFm(): Promise<TrackerFeed> {
  const shared = await sharedTracker<TrackerFeed>('lastfm');
  if (shared) return shared.value;
  const username = setting('LASTFM_USERNAME');
  const apiKey = setting('LASTFM_API_KEY');
  if (!username || !apiKey) return empty('unconfigured');
  const url = (method: string, period?: string) => {
    const endpoint = new URL('https://ws.audioscrobbler.com/2.0/');
    endpoint.search = new URLSearchParams({ method, user: username, api_key: apiKey, format: 'json', limit: '6', ...(period ? { period } : {}) }).toString();
    return endpoint.href;
  };
  // Independent results: a failed artist chart should not hide the listening log.
  const cachedRequest = (method: string, field: 'recenttracks' | 'topartists', maxAge: number, period?: string) =>
    cachedMediaFeed(`lastfm-v1:${username}:${apiKey}:${method}:${period ?? ''}`, maxAge, async () => {
      const data = await request(url(method, period));
      if (data.error || !Array.isArray(data[field]?.[field === 'recenttracks' ? 'track' : 'artist'])) throw new Error('Invalid Last.fm response');
      return { data, updatedAt: new Date().toISOString() };
    });
  const [tracksResult, artistsResult] = await Promise.allSettled([
    cachedRequest('user.getrecenttracks', 'recenttracks', refreshIntervals.lastFmTracks),
    cachedRequest('user.gettopartists', 'topartists', refreshIntervals.lastFmArtists, '7day'),
  ]);
  let topArtists: MediaEntry[] = [];
  let topArtistsState: TrackerFeed['state'] = 'unavailable';
  if (artistsResult.status === 'fulfilled') {
    const result = artistsResult.value.data as { error?: number; topartists?: { artist: LastFmArtist[] } };
    if (!result.error && Array.isArray(result.topartists?.artist)) {
      topArtists = result.topartists.artist.slice(0, 6).map(artist => ({
        title: artist.name, href: artist.url,
        detail: `${Number(artist.playcount).toLocaleString('en-GB')} ${Number(artist.playcount) === 1 ? 'play' : 'plays'} in the last 7 days`,
      }));
      topArtistsState = 'ready';
    }
  }
  if (topArtistsState === 'unavailable') console.warn('Last.fm top artists unavailable; keeping the profile link.');
  try {
    if (tracksResult.status === 'rejected') throw new Error('Listening log unavailable');
    const result = tracksResult.value.data as { error?: number; recenttracks?: { track: LastFmTrack[] } };
    if (result.error || !Array.isArray(result.recenttracks?.track)) throw new Error('Invalid tracker response');
    const entry = (track: LastFmTrack): MediaEntry => ({
      title: track.name, href: track.url, detail: track.artist['#text'],
      image: track.image?.find(image => image.size === 'large')?.['#text'] || undefined,
      date: track.date ? new Date(Number(track.date.uts) * 1000).toISOString() : undefined,
    });
    const scrobbles = result.recenttracks.track.filter(track => track['@attr']?.nowplaying !== 'true');
    return { state: 'ready',
      current: result.recenttracks.track.filter(track => track['@attr']?.nowplaying === 'true').map(entry),
      recent: scrobbles.slice(0, 6).map(entry),
      topArtists, topArtistsState,
      updatedAt: tracksResult.value.updatedAt,
    };
  } catch {
    console.warn('Last.fm feed unavailable; keeping the profile link.');
    return { ...empty('unavailable'), topArtists, topArtistsState, updatedAt: new Date().toISOString() };
  }
}

export function aniListProfile(list: 'mangalist' | 'animelist') {
  const username = setting('ANILIST_USERNAME');
  return username ? `https://anilist.co/user/${encodeURIComponent(username)}/${list}` : 'https://anilist.co/';
}
