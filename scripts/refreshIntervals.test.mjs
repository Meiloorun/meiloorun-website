import assert from 'node:assert/strict';
import { test } from 'node:test';
import { withTrackerRuntime } from '../src/lib/trackerRuntime.mjs';
import { loadAniList, loadSimkl } from '../src/lib/mediaTrackers.ts';
import { loadMainGame, loadLibraryArtwork } from '../src/lib/igdb.ts';

test('trackers respect one-minute AniList, five-minute Simkl, and longer IGDB cache intervals', async () => {
  const originalFetch = globalThis.fetch, originalNow = Date.now;
  let now = originalNow();
  const startedAt = now;
  Date.now = () => now;
  const values = new Map(), calls = new Map();
  const env = { ANILIST_USERNAME: 'test', IGDB_GAME_ID: '1', IGDB_CLIENT_ID: 'client', IGDB_CLIENT_SECRET: 'secret',
    SIMKL_CLIENT_ID: 'client', SIMKL_ACCESS_TOKEN: 'token' };
  const run = task => withTrackerRuntime({ env, storage: {
    get: async key => structuredClone(values.get(key)), put: async (key, value) => { values.set(key, structuredClone(value)); },
  } }, task);
  globalThis.fetch = async input => {
    const url = new URL(input);
    const name = url.hostname + url.pathname;
    calls.set(name, (calls.get(name) || 0) + 1);
    if (url.hostname === 'graphql.anilist.co') return Response.json({ data: { current: { mediaList: [] }, recent: { mediaList: [] } } });
    if (url.hostname === 'id.twitch.tv') return Response.json({ access_token: 'token' });
    if (url.hostname === 'api.igdb.com') return Response.json([{ id: 1, name: 'Game', url: 'https://www.igdb.com/games/game' }]);
    if (url.pathname === '/sync/activities') return Response.json({ all: '2026-10-01T00:00:00Z', tv_shows: {}, movies: {}, anime: {} });
    return Response.json({ shows: [], movies: [], anime: [] });
  };
  const load = () => run(async () => {
    await loadAniList('MANGA'); await loadMainGame(); await loadLibraryArtwork([1]); await loadSimkl();
  });
  try {
    await load();
    const first = new Map(calls);
    now += 59000;
    await load();
    assert.deepEqual(calls, first);
    now += 1001;
    await load();
    assert.equal(calls.get('graphql.anilist.co/'), 2);
    assert.equal(calls.get('api.igdb.com/v4/games'), 2);
    assert.equal(calls.get('id.twitch.tv/oauth2/token'), 1);
    assert.equal(calls.get('api.simkl.com/sync/activities'), 1);
    now += 240000;
    await load();
    assert.equal(calls.get('api.simkl.com/sync/activities'), 2);

    // New artwork keys require a token lookup, revealing the token's own expiry.
    now = startedAt + 3600000 - 1;
    await run(() => loadLibraryArtwork([1, 2]));
    assert.equal(calls.get('id.twitch.tv/oauth2/token'), 1);
    now += 2;
    await run(() => loadLibraryArtwork([1, 2, 3]));
    assert.equal(calls.get('id.twitch.tv/oauth2/token'), 2);

    const beforeMainExpiry = calls.get('api.igdb.com/v4/games');
    now = startedAt + 86400000 - 1;
    await run(() => loadMainGame());
    assert.equal(calls.get('api.igdb.com/v4/games'), beforeMainExpiry);
    now += 2;
    await run(() => loadMainGame());
    assert.equal(calls.get('api.igdb.com/v4/games'), beforeMainExpiry + 1);

    const beforeArtworkExpiry = calls.get('api.igdb.com/v4/games');
    now = startedAt + 7 * 86400000 - 1;
    await run(() => loadLibraryArtwork([1]));
    assert.equal(calls.get('api.igdb.com/v4/games'), beforeArtworkExpiry);
    now += 2;
    await run(() => loadLibraryArtwork([1]));
    assert.equal(calls.get('api.igdb.com/v4/games'), beforeArtworkExpiry + 1);
  } finally { globalThis.fetch = originalFetch; Date.now = originalNow; }
});
