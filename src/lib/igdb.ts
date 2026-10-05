import type { GameDetails, GameResult } from '../components/ui/GameShowcase';
import { cachedGameMetadata } from './gameMetadataCache.mjs';

interface IgdbGame {
  id: number; name: string; url: string; slug?: string; summary?: string; first_release_date?: number;
  cover?: { image_id: string }; genres?: { name: string }[]; platforms?: { name: string }[];
  involved_companies?: { developer?: boolean; company?: { name: string } }[];
}

async function request(url: string, init: RequestInit): Promise<unknown> {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error('IGDB request failed');
  return response.json();
}

/** Build/server only. The page receives game details, never Twitch app credentials. */
let tokenRequest: Promise<string> | undefined;

function appToken(): Promise<string> {
  return tokenRequest ??= request('https://id.twitch.tv/oauth2/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: import.meta.env.IGDB_CLIENT_ID, client_secret: import.meta.env.IGDB_CLIENT_SECRET, grant_type: 'client_credentials' }),
  }).then(result => {
    const token = (result as { access_token?: string }).access_token;
    if (!token) throw new Error('IGDB authentication failed');
    return token;
  }).catch(error => { tokenRequest = undefined; throw error; });
}

export interface LibraryGameArtwork { cover?: string; url: string; slug?: string }

/** Fetch canonical slugs for the entire collection in sequential, rate-limited batches. */
export async function loadLibraryArtwork(gameIds: number[]): Promise<Record<number, LibraryGameArtwork>> {
  const ids = [...new Set(gameIds)].filter(id => Number.isSafeInteger(id) && id > 0).sort((a, b) => a - b);
  if (!ids.length || !import.meta.env.IGDB_CLIENT_ID || !import.meta.env.IGDB_CLIENT_SECRET) return {};
  const artwork: Record<number, LibraryGameArtwork> = {};
  try {
    return await cachedGameMetadata(`library-artwork-v1:${ids.join(',')}`, 7 * 86400000, async () => {
    const token = await appToken();
    for (let offset = 0; offset < ids.length; offset += 100) {
      if (offset > 0) await new Promise(resolve => setTimeout(resolve, 300));
      const batch = ids.slice(offset, offset + 100);
      const result = await request('https://api.igdb.com/v4/games', {
        method: 'POST', headers: { 'Client-ID': import.meta.env.IGDB_CLIENT_ID, Authorization: `Bearer ${token}`, 'Content-Type': 'text/plain' },
        body: `fields id,url,slug,cover.image_id; where id = (${batch.join(',')}); limit 100;`,
      });
      if (!Array.isArray(result)) throw new Error('Invalid IGDB response');
      Object.assign(artwork, Object.fromEntries((result as IgdbGame[]).filter(game => game.url).map(game => [game.id, {
        url: game.url, slug: game.slug, cover: game.cover?.image_id ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${encodeURIComponent(game.cover.image_id)}.jpg` : undefined,
      }])));
    }
      return artwork;
    });
  } catch { console.warn('Some library metadata unavailable; keeping CSV details and completed batches.'); }
  return artwork;
}

export async function loadMainGame(): Promise<GameResult> {
  const id = import.meta.env.IGDB_GAME_ID?.trim();
  const clientId = import.meta.env.IGDB_CLIENT_ID;
  const clientSecret = import.meta.env.IGDB_CLIENT_SECRET;
  if (!id || !clientId || !clientSecret) return { state: 'unconfigured' };
  // Validate before interpolating into IGDB's query language.
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) return { state: 'not-found' };
  try {
    return await cachedGameMetadata<GameResult>(`main-game-v1:${id}`, 86400000, async () => {
    const token = await appToken();
    const result = await request('https://api.igdb.com/v4/games', {
      method: 'POST', headers: { 'Client-ID': clientId, Authorization: `Bearer ${token}`, 'Content-Type': 'text/plain', Accept: 'application/json' },
      body: `fields id,name,url,slug,summary,cover.image_id,first_release_date,genres.name,platforms.name,involved_companies.developer,involved_companies.company.name; where id = ${id}; limit 1;`,
    });
    if (!Array.isArray(result)) throw new Error('Invalid IGDB response');
    if (!result.length) return { state: 'not-found' };
    const item = result[0] as IgdbGame;
    if (!item.name || !item.url) throw new Error('Incomplete IGDB response');
    const game: GameDetails = {
      id: item.id, title: item.name, url: item.url, slug: item.slug, summary: item.summary,
      cover: item.cover?.image_id ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${encodeURIComponent(item.cover.image_id)}.jpg` : undefined,
      released: item.first_release_date ? new Date(item.first_release_date * 1000).toISOString().slice(0, 10) : undefined,
      developers: [...new Set(item.involved_companies?.filter(company => company.developer).flatMap(company => company.company?.name ? [company.company.name] : []) ?? [])],
      genres: item.genres?.map(genre => genre.name) ?? [],
      platforms: item.platforms?.map(platform => platform.name) ?? [],
    };
    return { state: 'ready', game };
    });
  } catch {
    console.warn('Main game details unavailable; retaining the IGDB link.');
    return { state: 'unavailable' };
  }
}
