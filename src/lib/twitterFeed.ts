import { readCache, writeCache } from './cacheStorage.mjs';
import { trackerDiagnostic, trackerRequest } from './trackerRequest.mjs';
import { twitterUsername } from './twitterTypes.ts';
import type { TwitterFeed, TwitterPost } from './twitterTypes.ts';

const cacheKey = `social/fxtwitter/${twitterUsername.toLowerCase()}/v1`;
const freshFor = 15 * 60000;
const retryAfterFailure = 5 * 60000;
type Snapshot = { version: 1; posts: TwitterPost[]; checkedAt?: string; retryAt?: number };
let pending: Promise<TwitterFeed> | undefined;

function mediaUrl(value: unknown, video = false): string | undefined {
  if (typeof value !== 'string') return;
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && !url.username && !url.password && url.hostname === (video ? 'video.twimg.com' : 'pbs.twimg.com')) return url.href;
  } catch { /* Ignore untrusted media URLs. */ }
}
function postIdentity(value: any): { id: string; username: string; url: string } | undefined {
  if (typeof value?.id !== 'string' || !/^\d+$/.test(value.id) || typeof value?.author?.screen_name !== 'string' || !/^[A-Za-z0-9_]{1,15}$/.test(value.author.screen_name)) return;
  return { id: value.id, username: value.author.screen_name, url: `https://x.com/${value.author.screen_name}/status/${value.id}` };
}

/** Store only the public fields the component uses, never upstream HTML. */
export function normalizeTwitterPosts(payload: any): TwitterPost[] {
  if (payload?.code !== 200 || !Array.isArray(payload.results)) throw Object.assign(new Error('Invalid FxTwitter response'), { code: 'invalid-data' });
  const seen = new Set<string>();
  const posts: TwitterPost[] = [];
  for (const item of payload.results) {
    const identity = postIdentity(item);
    if (!identity || seen.has(identity.id) || typeof item.text !== 'string' || !Number.isFinite(Date.parse(item.created_at))) continue;
    seen.add(identity.id);
    const photos = (Array.isArray(item.media?.photos) ? item.media.photos : []).slice(0, 4).flatMap((photo: any) => {
      const url = mediaUrl(photo?.url);
      return url ? [{ url, alt: typeof photo.altText === 'string' ? photo.altText : '' }] : [];
    });
    const rawVideo = item.media?.videos?.[0];
    const video = mediaUrl(rawVideo?.url, true);
    const quote = postIdentity(item.quote);
    posts.push({
      id: identity.id, url: identity.url, text: item.text, createdAt: new Date(item.created_at).toISOString(),
      author: { username: identity.username, name: typeof item.author.name === 'string' ? item.author.name : identity.username, avatar: mediaUrl(item.author.avatar_url) },
      repostedBy: typeof item.reposted_by?.screen_name === 'string' ? item.reposted_by.screen_name : undefined,
      photos, video: video ? { url: video, poster: mediaUrl(rawVideo.thumbnail_url) } : undefined,
      quote: quote && typeof item.quote.text === 'string' ? { text: item.quote.text, username: quote.username, url: quote.url } : undefined,
    });
    if (posts.length === 12) break;
  }
  // An upstream schema change must not replace a good snapshot with an empty one.
  if (payload.results.length && !posts.length) throw Object.assign(new Error('No valid FxTwitter posts'), { code: 'invalid-data' });
  return posts;
}

/** PostgreSQL persists snapshots; this promise only combines overlapping requests. */
export async function loadTwitterFeed(now = Date.now()): Promise<TwitterFeed> {
  if (pending) return pending;
  const task = (async (): Promise<TwitterFeed> => {
    let cached: Snapshot | undefined;
    const result = (state: TwitterFeed['state']): TwitterFeed => ({ state, username: twitterUsername, posts: cached?.posts || [], checkedAt: cached?.checkedAt });
    try {
      cached = await readCache(cacheKey) as Snapshot | undefined;
      if (cached?.version !== 1) cached = undefined;
      if (cached?.checkedAt && now - Date.parse(cached.checkedAt) < freshFor) return result('ready');
      if (cached?.retryAt && now < cached.retryAt) return result(cached.checkedAt ? 'stale' : 'unavailable');
      try {
        const payload = await trackerRequest(`https://api.fxtwitter.com/2/profile/${twitterUsername}/statuses?count=12`,
          { cache: 'no-store', headers: { Accept: 'application/json' } }, { timeout: 15000, includeErrorMessages: true });
        const posts = normalizeTwitterPosts(payload);
        cached = { version: 1, posts, checkedAt: new Date(now).toISOString() };
        await writeCache(cacheKey, cached);
        return result('ready');
      } catch (error) {
        console.warn('FxTwitter timeline refresh unavailable.', trackerDiagnostic(error));
        const delay = (error as { retryDelay?: number })?.retryDelay;
        const backoff = Number.isFinite(delay) ? Math.min(24 * 60 * 60000, Math.max(retryAfterFailure, delay!)) : retryAfterFailure;
        cached = { version: 1, posts: cached?.posts || [], checkedAt: cached?.checkedAt, retryAt: now + backoff };
        try { await writeCache(cacheKey, cached); }
        catch { console.warn('FxTwitter cache could not be saved.'); }
        return result(cached.checkedAt ? 'stale' : 'unavailable');
      }
    } catch (error) {
      console.warn('FxTwitter cache unavailable.', trackerDiagnostic(error));
      return result('unavailable');
    }
  })();
  pending = task;
  try { return await task; }
  finally { pending = undefined; }
}
