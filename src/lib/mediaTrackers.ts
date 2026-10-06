import type { MediaEntry, TrackerFeed } from '../components/ui/TrackerPanel';
import { syncSimkl } from './simkl.mjs';
import { cachedMediaFeed } from './mediaFeedCache.mjs';
import { setting, sharedTracker } from './trackerRuntime.mjs';
import { trackerRequest as request, trackerDiagnostic, trackerErrorMessages } from './trackerRequest.mjs';

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
    if (feed.shows.state !== 'ready' || feed.movies.state !== 'ready') throw Object.assign(new Error('Simkl refresh failed'), feed.failure);
    return feed;
  }).catch(error => {
    console.warn('Simkl feed unavailable; keeping profile links.', trackerDiagnostic(error));
    return { shows: empty('unavailable'), movies: empty('unavailable') };
  });
  return load();
}

// Imported only by Astro route frontmatter. API keys never enter a React island.
const empty = (state: TrackerFeed['state']): TrackerFeed => ({ state, current: [], recent: [] });

interface AniListEntry {
  progress: number; status: string; updatedAt: number;
  media: { title: { userPreferred: string }; siteUrl: string; coverImage: { medium: string }; format: string };
}

export async function loadAniList(type: 'MANGA' | 'ANIME'): Promise<TrackerFeed> {
  const shared = await sharedTracker<TrackerFeed>('anilist', [type]);
  if (shared) return shared.value;
  const username = setting('ANILIST_USERNAME')?.trim();
  if (!username) {
    console.warn(`AniList ${type} is not configured: ANILIST_USERNAME is missing from Worker runtime settings.`);
    return empty('unconfigured');
  }
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
    }, { includeErrorMessages: true }) as { errors?: unknown[]; data?: { current: { mediaList: AniListEntry[] }; recent: { mediaList: AniListEntry[] } } };
    if (result.errors?.length) {
      const status = (result.errors[0] as { status?: number })?.status;
      throw Object.assign(new Error('AniList GraphQL request failed'), {
        code: 'graphql', httpStatus: status, upstreamMessages: trackerErrorMessages(result.errors),
      });
    }
    if (!Array.isArray(result.data?.current?.mediaList) || !Array.isArray(result.data?.recent?.mediaList)) {
      throw Object.assign(new Error('Invalid tracker response'), { code: 'invalid-data' });
    }
    const entry = (item: AniListEntry): MediaEntry => ({
      title: item.media.title.userPreferred, href: item.media.siteUrl, image: item.media.coverImage.medium,
      detail: `${item.status.toLowerCase().replaceAll('_', ' ')} / ${type === 'MANGA' ? 'chapter' : 'episode'} ${item.progress}`,
      date: new Date(item.updatedAt * 1000).toISOString(),
    });
    return { state: 'ready', current: result.data.current.mediaList.map(entry),
      recent: result.data.recent.mediaList.map(entry), updatedAt: new Date().toISOString() };
    });
  } catch (error) {
    // Only selected public AniList error messages and diagnostics reach Worker logs.
    console.warn(`AniList ${type} feed unavailable; keeping the profile link.`, trackerDiagnostic(error));
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
      const data = await request(url(method, period), undefined, { includeErrorMessages: true });
      if (data.error) throw Object.assign(new Error('Last.fm API request failed'), {
        code: 'api', upstreamMessages: trackerErrorMessages(data, [apiKey]),
      });
      if (!Array.isArray(data[field]?.[field === 'recenttracks' ? 'track' : 'artist'])) throw Object.assign(new Error('Invalid Last.fm response'), { code: 'invalid-data' });
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
  if (topArtistsState === 'unavailable') console.warn('Last.fm top artists unavailable; keeping the profile link.',
    trackerDiagnostic(artistsResult.status === 'rejected' ? artistsResult.reason : { code: 'invalid-data' }));
  try {
    if (tracksResult.status === 'rejected') throw tracksResult.reason;
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
  } catch (error) {
    console.warn('Last.fm feed unavailable; keeping the profile link.', trackerDiagnostic(error));
    return { ...empty('unavailable'), topArtists, topArtistsState, updatedAt: new Date().toISOString() };
  }
}

export function aniListProfile(list: 'mangalist' | 'animelist') {
  const username = setting('ANILIST_USERNAME');
  return username ? `https://anilist.co/user/${encodeURIComponent(username)}/${list}` : 'https://anilist.co/';
}
