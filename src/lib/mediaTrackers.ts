import type { MediaEntry, TrackerFeed } from '../components/ui/TrackerPanel';
import { lastFmRequest, recentLastFmTracks, lastFmTrackEntry } from './lastFm.ts';
import { syncSimkl } from './simkl.mjs';
import { cachedMediaFeed } from './mediaFeedCache.mjs';
import { setting } from './trackerRuntime.mjs';
import { trackerRequest as request, trackerDiagnostic, trackerErrorMessages } from './trackerRequest.mjs';

// Refresh intervals in milliseconds. Changing them here affects all media pages.
const refreshIntervals = { anilist: 60000, simkl: 5 * 60000, lastFmTracks: 60000, lastFmArtists: 60000 };

export async function loadSimkl() {
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
  const username = setting('ANILIST_USERNAME')?.trim();
  if (!username) {
    console.warn(`AniList ${type} is not configured: ANILIST_USERNAME is missing from server runtime settings.`);
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
    // Only selected public AniList error messages and diagnostics reach server logs.
    console.warn(`AniList ${type} feed unavailable; keeping the profile link.`, trackerDiagnostic(error));
    return empty('unavailable');
  }
}

interface LastFmArtist {
  name: string; url: string; playcount: string;
}

export async function loadLastFm(): Promise<TrackerFeed> {
  const username = setting('LASTFM_USERNAME');
  const apiKey = setting('LASTFM_API_KEY');
  if (!username || !apiKey) return empty('unconfigured');
  // Persist only completed scrobbles; live now-playing results never enter the cache.
  const cachedTracks = () => cachedMediaFeed(`lastfm-history-v2:${username}:${apiKey}`, refreshIntervals.lastFmTracks, async () => ({
    tracks: (await recentLastFmTracks()).filter(track => track['@attr']?.nowplaying !== 'true').map(lastFmTrackEntry),
    updatedAt: new Date().toISOString(),
  }));
  const cachedArtists = () => cachedMediaFeed(`lastfm-artists-v2:${username}:${apiKey}`, refreshIntervals.lastFmArtists, async () => {
    const result = await lastFmRequest('user.gettopartists', '7day');
    if (!Array.isArray(result.topartists?.artist)) throw Object.assign(new Error('Invalid Last.fm response'), { code: 'invalid-data' });
    return { data: result, updatedAt: new Date().toISOString() };
  });
  const [tracksResult, artistsResult] = await Promise.allSettled([
    cachedTracks(),
    cachedArtists(),
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
    return { state: 'ready', current: [], recent: tracksResult.value.tracks,
      topArtists, topArtistsState, updatedAt: tracksResult.value.updatedAt };
  } catch (error) {
    console.warn('Last.fm feed unavailable; keeping the profile link.', trackerDiagnostic(error));
    return { ...empty('unavailable'), topArtists, topArtistsState, updatedAt: new Date().toISOString() };
  }
}

export function aniListProfile(list: 'mangalist' | 'animelist') {
  const username = setting('ANILIST_USERNAME');
  return username ? `https://anilist.co/user/${encodeURIComponent(username)}/${list}` : 'https://anilist.co/';
}
