import assert from 'node:assert/strict';
import { test } from 'node:test';
import { lifeCalendarFeeds, lifeDays, lifeDayStart, normalizeLifeTask, calendarLifeDays, loadLifeData } from '../src/lib/lifeFeed.ts';
import { withTrackerRuntime } from '../src/lib/trackerRuntime.mjs';

const now = new Date('2026-10-19T10:00:00Z');

test('calendar settings discover names and legacy numbers and ignore blanks, duplicates and unrelated settings', () => {
  assert.deepEqual(lifeCalendarFeeds({
    LIFE_CALENDAR_ICS_URL_10: ' https://calendar.test/ten ',
    LIFE_CALENDAR_ICS_URL_2: 'https://calendar.test/one',
    LIFE_CALENDAR_ICS_URL_1: 'https://calendar.test/one',
    LIFE_CALENDAR_ICS_URL_5: '   ', LIFE_CALENDAR_ICS_URL_WORK: 'https://calendar.test/work',
    LIFE_CALENDAR_ICS_URL_Personal_Events: ' https://calendar.test/personal ',
    LIFE_CALENDAR_ICS_URL_: 'https://calendar.test/no-name',
    LIFE_CALENDAR_ICS_URL_WRONG_TYPE: 123,
    OTHER_CALENDAR_ICS_URL_WORK: 'https://calendar.test/ignored',
    LIFE_CALENDAR_ICS_URL: 'https://calendar.test/original', TICKTICK_API_KEY: 'synthetic-key',
  }), [
    { key: 'LIFE_CALENDAR_ICS_URL', url: 'https://calendar.test/original' },
    { key: 'LIFE_CALENDAR_ICS_URL_1', url: 'https://calendar.test/one' },
    { key: 'LIFE_CALENDAR_ICS_URL_10', url: 'https://calendar.test/ten' },
    { key: 'LIFE_CALENDAR_ICS_URL_Personal_Events', url: 'https://calendar.test/personal' },
    { key: 'LIFE_CALENDAR_ICS_URL_WORK', url: 'https://calendar.test/work' },
  ]);
});
const calendar = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:daily
SUMMARY:Daily example
DTSTART;TZID=Europe/London:20261019T090000
DTEND;TZID=Europe/London:20261019T100000
RRULE:FREQ=DAILY;COUNT=7
EXDATE;TZID=Europe/London:20261020T090000
END:VEVENT
BEGIN:VEVENT
UID:daily
RECURRENCE-ID;TZID=Europe/London:20261021T090000
SUMMARY:Moved example
DTSTART;TZID=Europe/London:20261021T110000
DTEND;TZID=Europe/London:20261021T120000
END:VEVENT
BEGIN:VEVENT
UID:all-day
SUMMARY:Two days
DTSTART;VALUE=DATE:20261024
DTEND;VALUE=DATE:20261026
END:VEVENT
BEGIN:VEVENT
UID:cancelled
SUMMARY:Cancelled
DTSTART:20261019T150000Z
DTEND:20261019T160000Z
STATUS:CANCELLED
END:VEVENT
END:VCALENDAR`;

test('life calendar respects London DST, recurrence exceptions, overrides and exclusive all-day ends', async () => {
  const days = lifeDays(now);
  assert.equal(days.length, 7);
  assert.equal(days[0].date, '2026-10-19');
  assert.equal(days[6].date, '2026-10-25');
  assert.equal(lifeDayStart('2026-10-26') - lifeDayStart('2026-10-25'), 25 * 3600000);
  const result = await calendarLifeDays(calendar, days);
  assert.equal(result[0].events.length, 1);
  assert.equal(result[1].events.length, 0);
  assert.equal(result[2].events[0].title, 'Moved example');
  assert.equal(result[2].events[0].start, '2026-10-21T10:00:00.000Z');
  assert.equal(result[5].events.filter(event => event.allDay).length, 1);
  assert.equal(result[6].events.filter(event => event.allDay).length, 1);
  assert.equal(result[6].events.find(event => !event.allDay).start, '2026-10-25T09:00:00.000Z');
  assert.equal(days[0].events.length, 0, 'Input day templates remain unchanged');
});

test('tasks distinguish dated, undated and completed entries without fabricating repeats', () => {
  const task = { id: 'task', title: 'Example', status: 0, dueDate: '2026-10-19T23:30:00+0000' };
  assert.equal(normalizeLifeTask(task, 'List', 'project').href, 'https://ticktick.com/webapp/#p/project/tasks/task');
  assert.equal(normalizeLifeTask({ ...task, id: 'task/?#' }, 'List', 'project/one').href, 'https://ticktick.com/webapp/#p/project%2Fone/tasks/task%2F%3F%23');
  assert.equal(normalizeLifeTask(task, 'List', 'project').day, '2026-10-20');
  assert.equal(normalizeLifeTask({ ...task, isAllDay: true }, 'List', 'project').day, '2026-10-20');
  assert.equal(normalizeLifeTask({ ...task, dueDate: undefined }, 'List', 'project').day, undefined);
  assert.equal(normalizeLifeTask({ ...task, status: 2 }, 'List', 'project'), undefined);
  assert.equal(normalizeLifeTask({ ...task, repeatFlag: 'RRULE:FREQ=DAILY' }, 'List', 'project').recurring, true);
});

test('all-day task dates use the task timezone across UTC midnight and daylight-saving changes', () => {
  const task = { id: 'task', title: 'Example', isAllDay: true, timeZone: 'Europe/London' };
  const normalize = fields => normalizeLifeTask({ ...task, ...fields }, 'List', 'project');
  assert.equal(normalize({ dueDate: '2026-10-18T23:00:00+0000' }).day, '2026-10-19');
  assert.equal(normalize({ dueDate: '2026-10-24T23:00:00+0000' }).day, '2026-10-25');
  assert.equal(normalize({ dueDate: '2026-10-26T00:00:00+0000' }).day, '2026-10-26');
  assert.equal(normalize({ dueDate: '2026-03-29T23:00:00+0000' }).day, '2026-03-30');
  assert.equal(normalize({ dueDate: '2026-10-18T23:00:00+0000', timeZone: undefined }).day, '2026-10-19');
  assert.equal(normalize({ dueDate: '2026-10-18T23:00:00+0000', timeZone: 'Invalid/Zone' }).day, '2026-10-19');
  assert.equal(normalize({ dueDate: '2026-10-19T04:00:00+0000', timeZone: 'America/New_York' }).day, '2026-10-19');
  assert.equal(normalize({ dueDate: '2026-10-19', timeZone: 'America/New_York' }).day, '2026-10-19');
  assert.equal(normalize({ startDate: '2026-10-18T23:00:00+0000' }).day, '2026-10-19');
  assert.equal(normalize({ dueDate: '2026-10-18T23:00:00+0000' }).time, undefined);
});

test('life loads cache tasks while calendars stay live and sources fail independently', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0, failCalendar = false;
  const env = { TICKTICK_API_KEY: 'synthetic-key', LIFE_CALENDAR_ICS_URL: 'https://calendar.test/private.ics' };
  const cache = new Map();
  const run = () => withTrackerRuntime({ env, storage: {
    get: async key => structuredClone(cache.get(key)), put: async (key, value) => cache.set(key, structuredClone(value)),
  } }, () => loadLifeData(now));
  globalThis.fetch = async (input, init) => {
    calls++;
    assert.equal(init.cache, 'no-store');
    const url = new URL(input);
    if (url.hostname === 'calendar.test') return new Response(failCalendar ? 'unavailable' : calendar, { status: failCalendar ? 503 : 200 });
    assert.equal(init.headers.Authorization, 'Bearer synthetic-key');
    if (url.pathname.endsWith('/project')) return Response.json([{ id: 'p', name: 'Example list' }]);
    return Response.json({ tasks: [
      { id: 'today', title: 'Today task', isAllDay: true, dueDate: '2026-10-19T00:00:00+0000' },
      { id: 'old', title: 'Overdue task', isAllDay: true, dueDate: '2026-10-18T00:00:00+0000' },
      { id: 'undated', title: 'Undated task' },
      { id: 'done', title: 'Done task', status: 2 },
    ] });
  };
  try {
    const first = await run();
    assert.equal(first.calendarState, 'ready');
    assert.equal(first.tasksState, 'ready');
    assert.equal(first.days[0].tasks.length, 1);
    assert.equal(first.overdue.length, 1);
    assert.equal(first.undated.length, 1);
    assert.equal(calls, 3);
    await run();
    assert.equal(calls, 4, 'Only the calendar is fetched again while tasks are fresh');
    failCalendar = true;
    const failed = await run();
    assert.equal(failed.calendarState, 'unavailable');
    assert.equal(failed.tasksState, 'ready');
    assert.ok(!JSON.stringify(first).includes('synthetic-key'));
    assert.ok(!JSON.stringify(first).includes('private.ics'));
    const unconfigured = await withTrackerRuntime({ env: {} }, () => loadLifeData(now));
    assert.equal(unconfigured.tasksState, 'unconfigured');
    assert.equal(unconfigured.calendarState, 'unconfigured');
  } finally { globalThis.fetch = originalFetch; }
});

test('task cache expires after one minute, manual refresh overwrites it, and failed refreshes retain saved tasks', async () => {
  const originalFetch = globalThis.fetch;
  const cache = new Map();
  let calls = 0, title = 'Original task', fail = false;
  const run = (elapsed = 0, refreshTasks = false, credential = 'cache-test-key') => withTrackerRuntime({
    env: { TICKTICK_API_KEY: credential }, storage: {
      get: async key => structuredClone(cache.get(key)), put: async (key, value) => cache.set(key, structuredClone(value)),
    },
  }, () => loadLifeData(new Date(now.getTime() + elapsed), { refreshTasks }));
  globalThis.fetch = async input => {
    calls++;
    if (fail) return new Response('', { status: 503 });
    return new URL(input).pathname.endsWith('/project') ? Response.json([{ id: 'p', name: 'List' }])
      : Response.json({ tasks: [{ id: 'task', title }] });
  };
  try {
    const [first, concurrent] = await Promise.all([run(), run()]);
    assert.deepEqual(first.undated, concurrent.undated);
    assert.equal(calls, 2, 'Overlapping page requests share a single task pull');
    title = 'Updated task';
    assert.equal((await run(1000)).undated[0].title, 'Original task');
    assert.equal(calls, 2);
    assert.equal((await run(2000, true)).undated[0].title, 'Updated task');
    assert.equal(calls, 4, 'Manual refresh bypasses fresh cached data');
    assert.equal((await run(3000)).undated[0].title, 'Updated task', 'Manual result was persisted');
    assert.equal(calls, 4);
    title = 'Expired-cache replacement';
    assert.equal((await run(62000)).undated[0].title, title);
    assert.equal(calls, 6);
    fail = true;
    const stale = await run(63000, true);
    assert.equal(stale.tasksState, 'stale');
    assert.equal(stale.undated[0].title, title);
    assert.equal((await run(64000)).tasksState, 'stale');
    assert.equal(calls, 7, 'Failed refreshes back off on ordinary page loads');
    fail = false;
    title = 'Recovered';
    assert.equal((await run(65000, true)).undated[0].title, title, 'Manual refresh bypasses failure backoff too');
    assert.equal(cache.size, 1);
    assert.ok(!JSON.stringify([...cache]).includes('cache-test-key'), 'No API key is stored in the cache');
    await run(66000, false, 'different-credential');
    assert.equal(calls, 11, 'Changing credentials never reuses another account snapshot');
  } finally { globalThis.fetch = originalFetch; }
});

test('named calendars merge with unique event IDs, remain uncached, and survive individual feed failures', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  let fail = 'one';
  const env = {
    LIFE_CALENDAR_ICS_URL_A_PERSONAL: 'https://calendar.test/first',
    LIFE_CALENDAR_ICS_URL_B_WORK: 'https://calendar.test/third',
    LIFE_CALENDAR_ICS_URL_C_OTHER: 'https://calendar.test/failing',
    LIFE_CALENDAR_ICS_URL_D_DUPLICATE: 'https://calendar.test/first',
  };
  globalThis.fetch = async (input, init) => {
    const url = new URL(input);
    assert.equal(init.cache, 'no-store');
    calls.push(url.pathname);
    if (fail === 'all' || (fail === 'one' && url.pathname === '/failing')) return new Response('', { status: 503 });
    const source = url.pathname === '/third' ? calendar.replace('Daily example', 'Other calendar').replaceAll('T090000', 'T080000') : calendar;
    return new Response(source);
  };
  const run = () => withTrackerRuntime({ env }, () => loadLifeData(now));
  try {
    const partial = await run();
    assert.equal(partial.calendarState, 'partial');
    assert.equal(partial.days[0].events.length, 2);
    assert.equal(new Set(partial.days[0].events.map(event => event.id)).size, 2, 'Same UID in different calendars does not collide');
    assert.equal(partial.days[0].events[0].title, 'Other calendar', 'Merged events are sorted by start time');
    assert.deepEqual(calls, ['/first', '/third', '/failing']);
    fail = 'none';
    const complete = await run();
    assert.equal(complete.calendarState, 'ready');
    assert.equal(complete.days[0].events.length, 3);
    assert.equal(calls.length, 6, 'Each page request fetches every distinct URL again');
    fail = 'all';
    const unavailable = await run();
    assert.equal(unavailable.calendarState, 'unavailable');
    assert.equal(unavailable.days[0].events.length, 0);
    assert.ok(!JSON.stringify(complete).includes('https://calendar.test'));
  } finally { globalThis.fetch = originalFetch; }
});
