// Server only: never import this module into a React component.
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { readCache as readJson, writeCache as saveJson } from './cacheStorage.mjs';

const agent = 'meiloorun-website/0.8.0';
const types = ['shows', 'movies', 'anime'];
const buckets = ['watching', 'plantowatch', 'hold', 'completed', 'dropped', 'removed_from_list'];
const blank = state => ({ state, current: [], recent: [] });
const object = value => value && typeof value === 'object' && !Array.isArray(value);

export async function oauthRequest(clientId, endpoint, fields) {
  const url = new URL(`https://api.simkl.com/oauth2/${endpoint}`);
  url.search = new URLSearchParams({ client_id: clientId, 'app-name': 'meiloorun-website', 'app-version': '0.8.0' });
  const response = await fetch(url, {
    method: 'POST', signal: AbortSignal.timeout(15000),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': agent },
    body: new URLSearchParams({ client_id: clientId, ...fields }),
  });
  const result = await response.json();
  if (!object(result)) throw new Error('Invalid Simkl authentication response');
  // Return OAuth error codes for the device polling loop, never upstream messages.
  return { ok: response.ok, ...result };
}

function rows(payload, type) {
  if (!object(payload) || payload.error || (payload[type] !== undefined && !Array.isArray(payload[type]))) {
    throw new Error('Invalid Simkl library response');
  }
  const result = payload[type] ?? [];
  if (result.some(row => !object(row) || !object(row.movie ?? row.show) || !Number.isFinite(Number((row.movie ?? row.show)?.ids?.simkl)))) {
    throw new Error('Invalid Simkl library entry');
  }
  return result;
}

const id = row => String((row.movie ?? row.show).ids.simkl);
const date = value => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : undefined;
const time = value => Date.parse(date(value) ?? '') || 0;

export function formatSimkl(library, updatedAt) {
  const convert = (row, category) => {
    const media = row.movie ?? row.show;
    const details = [media.year, category === 'anime' ? 'anime movie' : undefined];
    if (category !== 'tv' && Number.isInteger(row.user_rating) && row.user_rating >= 1 && row.user_rating <= 10) {
      details.push(`My score: ${row.user_rating}/10`);
    }
    if (category === 'tv') {
      if (row.last_watched) details.push(`Last watched ${row.last_watched}`);
      if (row.next_to_watch) details.push(`Next ${row.next_to_watch}`);
    }
    return {
      title: media.title,
      href: `https://simkl.com/${category}/${encodeURIComponent(media.ids.simkl)}${media.ids.slug ? `/${encodeURIComponent(media.ids.slug)}` : ''}`,
      image: media.poster ? `https://simkl.in/posters/${media.poster}_c.webp` : undefined,
      detail: details.filter(Boolean).join(' / ') || undefined,
      date: date(row.last_watched_at),
    };
  };
  const recent = items => items.filter(item => date(item.row.last_watched_at))
    .sort((a, b) => time(b.row.last_watched_at) - time(a.row.last_watched_at))
    .slice(0, 6).map(item => convert(item.row, item.category));
  const current = items => items.sort((a, b) => time(b.row.last_watched_at ?? b.row.added_to_watchlist_at) - time(a.row.last_watched_at ?? a.row.added_to_watchlist_at))
    .slice(0, 6).map(item => convert(item.row, item.category));
  const tv = library.shows.map(row => ({ row, category: 'tv' }));
  const films = [
    ...library.movies.map(row => ({ row, category: 'movies' })),
    ...library.anime.filter(row => row.anime_type === 'movie').map(row => ({ row, category: 'anime' })),
  ];
  return {
    shows: { state: 'ready', updatedAt, current: current(tv.filter(({ row }) => row.status === 'watching')), recent: recent(tv) },
    movies: { state: 'ready', updatedAt, current: current(films.filter(({ row }) => ['plantowatch', 'watching'].includes(row.status))), recent: recent(films) },
  };
}

export async function syncSimkl({ clientId, accessToken, refreshToken, clientSecret, cacheDir = '.cache/simkl' }) {
  if (!clientId || (!accessToken && !refreshToken)) return { shows: blank('unconfigured'), movies: blank('unconfigured') };
  try {
    // Isolate cache by app and account grant without storing the source credential in a filename.
    const key = createHash('sha256').update(`${clientId}:${refreshToken || accessToken}`).digest('hex');
    const authPath = join(cacheDir, `${key}-auth.json`);
    const dataPath = join(cacheDir, `${key}-library.json`);
    const cachedAuth = await readJson(authPath);
    let token = cachedAuth?.accessToken || accessToken;
    const refresh = async () => {
      if (!refreshToken) throw new Error('Reconnect Simkl');
      const auth = await oauthRequest(clientId, 'token', {
        grant_type: 'refresh_token', refresh_token: refreshToken,
        ...(clientSecret ? { client_secret: clientSecret } : {}),
      });
      if (!auth.ok || !auth.access_token || !Number.isFinite(auth.expires_in)) throw new Error('Reconnect Simkl');
      token = auth.access_token;
      await saveJson(authPath, { accessToken: token, expiresAt: Date.now() + auth.expires_in * 1000 });
    };
    if (!token || (cachedAuth?.expiresAt && cachedAuth.expiresAt < Date.now() + 86400000)) await refresh();
    const request = async (path, params = {}, retried = false) => {
      const url = new URL(`https://api.simkl.com${path}`);
      url.search = new URLSearchParams({ client_id: clientId, 'app-name': 'meiloorun-website', 'app-version': '0.8.0', ...params });
      const response = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { 'User-Agent': agent, Authorization: `Bearer ${token}` } });
      if (response.status === 401 && !retried && refreshToken) {
        await refresh();
        return request(path, params, true);
      }
      if (!response.ok) throw new Error('Simkl request failed');
      return response.json();
    };
    const cached = await readJson(dataPath);
    const activities = await request('/sync/activities');
    if (!object(activities) || !date(activities.all)) throw new Error('Invalid Simkl activities');
    const library = {};
    for (const type of types) {
      const activityType = type === 'shows' ? 'tv_shows' : type;
      const before = cached?.activities?.[activityType];
      const after = activities[activityType];
      const previous = cached?.library?.[type];
      const changed = !Array.isArray(previous) || !object(before) || !object(after) || buckets.some(bucket => before[bucket] !== after[bucket]);
      if (cached?.activities?.all === activities.all && Array.isArray(previous)) {
        library[type] = previous;
      } else if (changed) {
        const incremental = Array.isArray(previous) && date(cached?.activities?.all);
        const delta = rows(await request(`/sync/all-items/${type}`, incremental ? { date_from: cached.activities.all } : {}), type);
        const merged = new Map((incremental ? previous : []).map(row => [id(row), row]));
        for (const row of delta) merged.set(id(row), row);
        if (incremental && before?.removed_from_list !== after?.removed_from_list) {
          // Removed items are absent from deltas; reconcile against the compact ID list.
          const idsPayload = await request(`/sync/all-items/${type}`, { extended: 'simkl_ids_only' });
          if (!object(idsPayload) || (idsPayload[type] !== undefined && !Array.isArray(idsPayload[type]))) throw new Error('Invalid Simkl IDs');
          const active = new Set((idsPayload[type] ?? []).map(row => String(typeof row === 'number' ? row : row?.simkl_id ?? row?.ids?.simkl ?? (row?.movie ?? row?.show)?.ids?.simkl)));
          if (active.has('undefined')) throw new Error('Invalid Simkl IDs');
          for (const entryId of merged.keys()) if (!active.has(entryId)) merged.delete(entryId);
        }
        library[type] = [...merged.values()];
      } else library[type] = previous;
      if (type !== 'shows' && Array.isArray(previous)) {
        // Rating edits have their own delta and do not appear in watchlist deltas.
        // Existing caches predate rating sync, so reconcile their scores once.
        const baseline = !cached.ratingsSynced;
        if (baseline || before?.rated_at !== after?.rated_at) {
          const ratings = rows(await request(
            `/sync/ratings/${type}${baseline ? '/1,2,3,4,5,6,7,8,9,10' : ''}`,
            baseline ? {} : { date_from: cached.activities.all },
          ), type);
          const scores = new Map(ratings.map(row => [id(row), row]));
          library[type] = library[type].map(row => {
            const rating = scores.get(id(row));
            return rating ? { ...row, user_rating: rating.user_rating, user_rated_at: rating.user_rated_at }
              : baseline ? { ...row, user_rating: null, user_rated_at: null } : row;
          });
        }
      }
    }
    const updatedAt = new Date().toISOString();
    // Never advance the sync checkpoint after a partially failed sync.
    await saveJson(dataPath, { activities, library, updatedAt, ratingsSynced: true });
    return formatSimkl(library, updatedAt);
  } catch {
    console.warn('Simkl feed unavailable. Check credentials or run npm run connect:simkl; keeping profile links.');
    return { shows: blank('unavailable'), movies: blank('unavailable') };
  }
}
