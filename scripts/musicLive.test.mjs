import assert from 'node:assert/strict';
import { test } from 'node:test';
import { withTrackerRuntime } from '../src/lib/trackerRuntime.mjs';
import { loadLastFm } from '../src/lib/mediaTrackers.ts';
import { loadNowPlaying } from '../src/lib/lastFm.ts';
import { GET } from '../src/pages/api/music/now-playing.ts';

const track = (name, playing = false) => ({ name, url: 'https://www.last.fm/music/test/_/' + name,
  artist: { '#text': 'Artist' }, ...(playing ? { '@attr': { nowplaying: 'true' } } : { date: { uts: '1700000000' } }) });

test('now playing is fresh per request, excluded from stored history, and shares only overlapping calls', async () => {
  const originalFetch = globalThis.fetch;
  const originalNow = Date.now;
  let time = originalNow();
  Date.now = () => time;
  const values = new Map();
  const env = { LASTFM_USERNAME: 'listener', LASTFM_API_KEY: 'synthetic-key' };
  const storage = { get: async key => structuredClone(values.get(key)), put: async (key, value) => { values.set(key, structuredClone(value)); } };
  const run = task => withTrackerRuntime({ env, storage }, task);
  let playing = 'LiveA', recentCalls = 0, artistCalls = 0;
  globalThis.fetch = async url => {
    if (new URL(url).searchParams.get('method') === 'user.getrecenttracks') {
      recentCalls++;
      return Response.json({ recenttracks: { track: [...(playing ? [track(playing, true)] : []), track('History')] } });
    }
    artistCalls++;
    return Response.json({ topartists: { artist: [{ name: 'Artist', url: 'https://www.last.fm/music/Artist', playcount: '3' }] } });
  };
  try {
    const [history, live] = await run(() => Promise.all([loadLastFm(), loadNowPlaying()]));
    assert.equal(live.current[0].title, 'LiveA');
    assert.deepEqual(history.current, []);
    assert.equal(history.recent[0].title, 'History');
    assert.equal(recentCalls, 1, 'SSR history and live status share only the in-flight request');
    assert.ok(!JSON.stringify([...values.values()]).includes('LiveA'), 'Now-playing data is not written into PostgreSQL records');
    playing = 'LiveB';
    assert.equal((await run(loadNowPlaying)).current[0].title, 'LiveB');
    assert.equal(recentCalls, 2, 'A completed live request is never reused');
    await run(loadLastFm);
    assert.equal(recentCalls, 2, 'Listening history still uses its own cache');
    assert.equal(artistCalls, 1);
    time += 60001;
    await run(loadLastFm);
    assert.equal(recentCalls, 3);
    assert.equal(artistCalls, 2, 'Both cached Last.fm feeds expire after a minute');
    playing = '';
    const response = await run(() => GET());
    assert.match(response.headers.get('Cache-Control'), /no-store/);
    assert.match(response.headers.get('CDN-Cache-Control'), /no-store/);
    assert.deepEqual((await response.json()).current, [], 'Stopped playback clears the current track');
    globalThis.fetch = async () => Response.json({ message: 'Rate limit' }, { status: 429, headers: { 'Retry-After': '120' } });
    const failed = await run(() => GET());
    assert.equal(failed.status, 503);
    assert.equal(failed.headers.get('Retry-After'), '120');
    assert.deepEqual((await failed.json()).current, [], 'A failed request never reports an old song as currently playing');
  } finally { globalThis.fetch = originalFetch; Date.now = originalNow; }
});

test('live playback needs no cache access and does not expose the Last.fm key', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ recenttracks: { track: [track('Live', true)] } });
  try {
    const result = await withTrackerRuntime({ env: { LASTFM_USERNAME: 'listener', LASTFM_API_KEY: 'private-key' } }, loadNowPlaying);
    assert.equal(result.state, 'ready');
    assert.ok(!JSON.stringify(result).includes('private-key'));
    assert.equal((await withTrackerRuntime({ env: {} }, loadNowPlaying)).state, 'unconfigured');
  } finally { globalThis.fetch = originalFetch; }
});
