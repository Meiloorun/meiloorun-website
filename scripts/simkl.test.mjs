import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readdir, readFile, unlink, rmdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { syncSimkl, formatSimkl } from '../src/lib/simkl.mjs';

const row = (id, status = 'watching') => ({
  status, last_watched_at: '2026-10-01T00:00:00Z', next_to_watch: 'S01E02',
  show: { title: `Show ${id}`, ids: { simkl: id, slug: `show-${id}` } },
});
const activities = stamp => ({ all: stamp, tv_shows: { watching: stamp }, movies: {}, anime: {} });

test('film feed includes anime movies and sorts by watched dates, not list edits', () => {
  const anime = { ...row(3, 'completed'), anime_type: 'movie', user_rating: 9, last_watched_at: '2026-10-02T00:00:00Z' };
  const movie = { ...row(2, 'completed'), user_rating: 7, added_to_watchlist_at: '2026-10-05T00:00:00Z' };
  movie.movie = movie.show;
  delete movie.show;
  const feeds = formatSimkl({ shows: [row(1)], movies: [movie], anime: [anime, { ...row(4), anime_type: 'tv' }] }, '2026-10-05T00:00:00Z');
  assert.equal(feeds.shows.current[0].title, 'Show 1');
  assert.deepEqual(feeds.movies.recent.map(entry => entry.title), ['Show 3', 'Show 2']);
  assert.equal(feeds.movies.recent[0].href, 'https://simkl.com/anime/3/show-3');
  assert.equal(feeds.movies.current.length, 0);
  assert.match(feeds.movies.recent[0].detail, /My score: 9\/10/);
  assert.match(feeds.movies.recent[1].detail, /My score: 7\/10/);
  assert.equal(feeds.shows.current[0].detail.includes('My score'), false);
  for (const user_rating of [null, undefined, 0, 11]) {
    const unrated = formatSimkl({ shows: [], movies: [{ ...movie, user_rating }], anime: [] }, '').movies.recent[0];
    assert.equal(unrated.detail?.includes('My score') ?? false, false);
  }
});

test('sync handles unchanged activity, deltas, deletions, token expiry and failed checkpoints', async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), 'meiloorun-simkl-'));
  const originalFetch = globalThis.fetch;
  const queue = [];
  globalThis.fetch = async (url, init) => {
    const expected = queue.shift();
    assert.ok(expected, 'Unexpected extra API request');
    const parsed = new URL(url);
    assert.equal(parsed.pathname, expected.path);
    assert.equal(parsed.searchParams.get('date_from'), expected.since ?? null);
    if (expected.extended) assert.equal(parsed.searchParams.get('extended'), expected.extended);
    if (expected.token) assert.equal(init.headers.Authorization, `Bearer ${expected.token}`);
    return new Response(JSON.stringify(expected.body), { status: expected.status ?? 200 });
  };
  const options = { clientId: 'test-client', accessToken: 'old-token', refreshToken: 'test-refresh', cacheDir };
  try {
    const a = '2026-10-01T00:00:00Z';
    const b = '2026-10-02T00:00:00Z';
    const ratingTime = '2026-10-01T12:00:00Z';
    queue.push(
      { path: '/sync/activities', body: activities(a) },
      { path: '/sync/all-items/shows', body: { shows: [row(1), row(2)] } },
      { path: '/sync/all-items/movies', body: {} },
      { path: '/sync/all-items/anime', body: { anime: [{ ...row(3, 'completed'), anime_type: 'movie', user_rating: 8 }] } },
    );
    assert.equal((await syncSimkl(options)).shows.current.length, 2);
    queue.push({ path: '/sync/activities', body: activities(a) });
    assert.equal((await syncSimkl(options)).shows.state, 'ready');
    // A score-only edit changes no watchlist buckets; removal must clear the score.
    queue.push(
      { path: '/sync/activities', body: { ...activities(a), all: ratingTime, anime: { rated_at: ratingTime } } },
      { path: '/sync/ratings/anime', since: a, body: { anime: [{ ...row(3, 'completed'), user_rating: null }] } },
    );
    assert.equal((await syncSimkl(options)).movies.recent[0].detail.includes('My score'), false);
    queue.push(
      { path: '/sync/activities', body: { ...activities(b), tv_shows: { watching: b, removed_from_list: b } } },
      { path: '/sync/all-items/shows', since: ratingTime, body: { shows: [row(2, 'completed')] } },
      { path: '/sync/all-items/shows', extended: 'simkl_ids_only', body: { shows: [{ show: { ids: { simkl: 2 } } }] } },
      { path: '/sync/ratings/anime', since: ratingTime, body: {} },
    );
    const changed = await syncSimkl(options);
    assert.equal(changed.shows.current.length, 0);
    assert.equal(changed.shows.recent.length, 1);
    queue.push(
      { path: '/sync/activities', status: 401, body: {} },
      { path: '/oauth2/token', body: { access_token: 'new-token', expires_in: 604800, refresh_token: 'test-refresh' } },
      { path: '/sync/activities', token: 'new-token', body: { ...activities(b), tv_shows: { watching: b, removed_from_list: b } } },
    );
    assert.equal((await syncSimkl(options)).shows.state, 'ready');
    const libraryPath = join(cacheDir, (await readdir(cacheDir)).find(name => name.endsWith('-library.json')));
    const checkpoint = await readFile(libraryPath, 'utf8');
    queue.push(
      { path: '/sync/activities', body: activities('2026-10-03T00:00:00Z') },
      { path: '/sync/all-items/shows', since: b, status: 503, body: {} },
    );
    assert.equal((await syncSimkl(options)).shows.state, 'unavailable');
    assert.equal(await readFile(libraryPath, 'utf8'), checkpoint);
    assert.equal(queue.length, 0);
    assert.equal((await syncSimkl({})).shows.state, 'unconfigured');
  } finally {
    globalThis.fetch = originalFetch;
    for (const file of await readdir(cacheDir)) await unlink(join(cacheDir, file));
    await rmdir(cacheDir);
  }
});
