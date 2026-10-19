import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseMubarakSchedule, loadPrayerTimes, prayerTimesSource } from '../src/lib/prayerTimes.ts';
import { withTrackerRuntime } from '../src/lib/trackerRuntime.mjs';

const names = ['Fajr', 'Zuhr', 'Asr', 'Maghrib', 'Isha'];
const items = times => names.map((name, index) => `<li>${times[index].replace(':', '<span>:</span>')} <span class="time--name">${name}</span></li>`).join('');
const fixture = `<ul class="timing--shedule">${items(['01:00', '02:00', '03:00', '04:00', '05:00'])}</ul>
<div class="row"><h3>Masjid Mubarak</h3><h6>Times from 18th October 2026.</h6>
<ul class="timing--shedule">${items(['06:30', '14:00', '16:30', '18:15', '20:30'])}</ul></div>
<div class="row"><h3>Masjid Fazl</h3><h6>Times from 18th October 2026.</h6>
<ul class="timing--shedule">${items(['06:31', '13:30', '16:31', '18:16', '20:31'])}</ul></div>`;

test('prayer scraper selects only Masjid Mubarak and validates every prayer and effective date', () => {
  const result = parseMubarakSchedule(fixture);
  assert.equal(result.effectiveFrom, '2026-10-18');
  assert.deepEqual(result.times.map(prayer => prayer.name), names);
  assert.equal(result.times.find(prayer => prayer.name === 'Zuhr').time, '14:00');
  assert.throws(() => parseMubarakSchedule(fixture.replace('Masjid Mubarak', 'Other mosque')));
  assert.throws(() => parseMubarakSchedule(fixture.replace('14<span>:</span>00', '24<span>:</span>99')));
  assert.throws(() => parseMubarakSchedule(fixture.replaceAll('<span class="time--name">Fajr</span>', 'unknown')));
  assert.throws(() => parseMubarakSchedule(fixture.replaceAll('18th October', '32nd October')));
});

test('daily prayer cache respects London DST dates, shares overlapping fetches and never serves yesterday after a failure', async () => {
  const originalFetch = globalThis.fetch;
  const values = new Map();
  let calls = 0, fail = false;
  const run = date => withTrackerRuntime({ env: {}, storage: {
    get: async key => structuredClone(values.get(key)), put: async (key, value) => values.set(key, structuredClone(value)),
  } }, () => loadPrayerTimes(new Date(date)));
  globalThis.fetch = async (url, init) => {
    assert.equal(url, prayerTimesSource);
    assert.equal(init.cache, 'no-store');
    calls++;
    return new Response(fail ? 'Unavailable' : fixture, { status: fail ? 503 : 200 });
  };
  try {
    const [first, shared] = await Promise.all([run('2026-10-24T23:30:00Z'), run('2026-10-24T23:30:00Z')]);
    assert.equal(first.state, 'ready');
    assert.deepEqual(first, shared);
    assert.equal(calls, 1);
    assert.equal((await run('2026-10-25T23:30:00Z')).state, 'ready', 'The 25-hour London day still uses one snapshot');
    assert.equal(calls, 1);
    fail = true;
    const failed = await run('2026-10-26T00:00:00Z');
    assert.deepEqual(failed, { state: 'unavailable' }, 'Yesterday is never labelled as today');
    assert.equal(calls, 2);
    await run('2026-10-26T00:02:00Z');
    assert.equal(calls, 2, 'Failures back off for five minutes');
    fail = false;
    assert.equal((await run('2026-10-26T00:05:01Z')).state, 'ready');
    assert.equal(calls, 3);
    assert.equal(values.size, 1, 'Daily refresh overwrites a single database record');
  } finally { globalThis.fetch = originalFetch; }
});

test('future schedules and missing database storage return unavailable', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(fixture.replaceAll('18th October 2026', '1st January 2027'));
  try {
    const result = await withTrackerRuntime({ env: {}, storage: { get: async () => undefined, put: async () => {} } }, () => loadPrayerTimes(new Date('2026-10-19T12:00:00Z')));
    assert.deepEqual(result, { state: 'unavailable' });
    assert.deepEqual(await withTrackerRuntime({ env: {} }, () => loadPrayerTimes(new Date('2026-10-20T12:00:00Z'))), { state: 'unavailable' });
  } finally { globalThis.fetch = originalFetch; }
});
