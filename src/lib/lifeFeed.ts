import ical, { type VEvent } from 'node-ical';
import { setting, trackerRuntime } from './trackerRuntime.mjs';
import { trackerRequest } from './trackerRequest.mjs';
import { calendarDateKey } from './dateKeys.ts';
import type { LifeData, LifeDay, LifeEvent, LifeSourceState, LifeTask } from './lifeTypes.ts';

export const lifeTimeZone = 'Europe/London';
const clock = new Intl.DateTimeFormat('en-GB', { timeZone: lifeTimeZone, hour: '2-digit', minute: '2-digit' });
export const lifeDateKey = (date: Date) => calendarDateKey(date, lifeTimeZone);
const text = (value: unknown): string => typeof value === 'string' ? value :
  value && typeof value === 'object' && 'val' in value && typeof value.val === 'string' ? value.val : '';

export function lifeDays(now: Date): LifeDay[] {
  const today = lifeDateKey(now);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(`${today}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + index);
    return { date: lifeDateKey(date), label: new Intl.DateTimeFormat('en-GB', {
      timeZone: lifeTimeZone, weekday: 'long', day: 'numeric', month: 'short',
    }).format(date), events: [], tasks: [] };
  });
}

/** London midnight precedes its DST transitions, which happen later in the day. */
export function lifeDayStart(key: string): Date {
  const midnight = new Date(`${key}T00:00:00Z`);
  const offset = new Intl.DateTimeFormat('en-GB', { timeZone: lifeTimeZone, timeZoneName: 'longOffset' })
    .formatToParts(midnight).find(part => part.type === 'timeZoneName')?.value;
  const match = offset?.match(/^GMT([+-])(\d{2}):(\d{2})$/);
  const minutes = match ? (Number(match[2]) * 60 + Number(match[3])) * (match[1] === '+' ? 1 : -1) : 0;
  return new Date(midnight.getTime() - minutes * 60000);
}

interface TickTask { id?: string; title?: string; status?: number; dueDate?: string; startDate?: string; timeZone?: string; isAllDay?: boolean; priority?: number; repeatFlag?: string }
export function normalizeLifeTask(task: TickTask, list: string, projectId: string): LifeTask | undefined {
  if (typeof task?.id !== 'string' || typeof task.title !== 'string' || !task.id || !task.title || task.status === 2) return undefined;
  const value = task.dueDate || task.startDate;
  const date = value ? new Date(value) : undefined;
  const validDate = date && Number.isFinite(date.getTime()) ? date : undefined;
  let day = validDate ? lifeDateKey(validDate) : undefined;
  if (validDate && task.isAllDay) {
    // A timestamp at local midnight can have yesterday's date in its UTC form.
    // Resolve it in the task's own timezone; a date-only value needs no conversion.
    if (/^\d{4}-\d{2}-\d{2}$/.test(value!)) day = value;
    else {
      try {
        day = calendarDateKey(validDate, task.timeZone || lifeTimeZone);
      } catch { /* Missing/invalid provider timezone falls back to the London date above. */ }
    }
  }
  return { id: `${projectId}:${task.id}`, title: task.title, list,
    href: `https://ticktick.com/webapp/#p/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(task.id)}`,
    day,
    time: validDate && !task.isAllDay ? clock.format(validDate) : undefined,
    priority: task.priority || 0, recurring: !!task.repeatFlag };
}

async function loadLifeTasks(): Promise<{ state: LifeSourceState; tasks: LifeTask[] }> {
  const key = setting('TICKTICK_API_KEY')?.trim().replace(/^Bearer\s+/i, '');
  if (!key) return { state: 'unconfigured', tasks: [] };
  const get = (path: string) => trackerRequest(`https://api.ticktick.com/open/v1/${path}`, {
    cache: 'no-store', headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
  }, { includeErrorMessages: false, timeout: 15000 });
  try {
    const projects: unknown = await get('project');
    if (!Array.isArray(projects)) throw new Error('Invalid lists response');
    const tasks: LifeTask[] = [];
    let failed = 0;
    // Small batches keep a large account from issuing all project requests at once.
    for (let offset = 0; offset < projects.length; offset += 3) {
      const results = await Promise.allSettled(projects.slice(offset, offset + 3).map(async project => {
        if (typeof project.id !== 'string' || !project.id) throw new Error('Invalid project');
        const data = await get(`project/${encodeURIComponent(project.id)}/data`);
        if (!Array.isArray(data.tasks)) throw new Error('Invalid tasks response');
        return data.tasks.flatMap((task: TickTask) => {
          const entry = normalizeLifeTask(task, text(project.name) || 'TickTick', project.id);
          return entry ? [entry] : [];
        });
      }));
      for (const result of results) {
        if (result.status === 'fulfilled') tasks.push(...result.value); else failed++;
      }
    }
    return { state: failed ? failed === projects.length ? 'unavailable' : 'partial' : 'ready', tasks };
  } catch {
    // Task titles, tokens, private URLs and raw provider errors never enter logs.
    console.warn('Life task feed unavailable; check TickTick configuration and connectivity.');
    return { state: 'unavailable', tasks: [] };
  }
}

export async function calendarLifeDays(source: string, days: LifeDay[]): Promise<LifeDay[]> {
  if (!source.includes('BEGIN:VCALENDAR')) throw new Error('Invalid calendar feed');
  // The parser's warnings can contain raw feed values. Keep this strictly synchronous
  // so warning suppression cannot extend into another request's asynchronous work.
  const previousWarn = console.warn;
  let parsed;
  try { console.warn = () => {}; parsed = ical.sync.parseICS(source); }
  finally { console.warn = previousWarn; }
  const from = lifeDayStart(days[0].date);
  const last = new Date(`${days.at(-1)!.date}T12:00:00Z`);
  last.setUTCDate(last.getUTCDate() + 1);
  const until = lifeDayStart(lifeDateKey(last));
  const result = days.map(day => ({ ...day, events: [] as LifeEvent[] }));
  for (const component of Object.values(parsed)) {
    if (component?.type !== 'VEVENT') continue;
    const event = component as VEvent;
    if (event.type !== 'VEVENT' || event.status === 'CANCELLED' || !(event.start instanceof Date) || !Number.isFinite(event.start.getTime())) continue;
    for (const instance of ical.expandRecurringEvent(event, { from, to: new Date(until.getTime() - 1), expandOngoing: true })) {
      if (instance.event.status === 'CANCELLED') continue;
      const start = instance.start, end = instance.end;
      if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) continue;
      const entry: LifeEvent = { id: `${event.uid}:${start.toISOString()}`, title: text(instance.summary) || 'Untitled event',
        start: start.toISOString(), end: end.toISOString(), allDay: instance.isFullDay };
      for (const [index, day] of result.entries()) {
        const dayStart = lifeDayStart(day.date);
        const dayEnd = index + 1 < result.length ? lifeDayStart(result[index + 1].date) : until;
        // Date-only values are floating calendar dates; their end date is exclusive.
        const overlaps = entry.allDay
          ? day.date >= start.toISOString().slice(0, 10) && day.date < end.toISOString().slice(0, 10)
          : start < dayEnd && (end > dayStart || (end.getTime() === start.getTime() && start >= dayStart));
        if (overlaps) day.events.push(entry);
      }
    }
  }
  for (const day of result) day.events.sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.start.localeCompare(b.start));
  return result;
}

/** Discover all numbered settings, including gaps; keep the original setting compatible. */
export function lifeCalendarFeeds(env: Record<string, unknown>): { key: string; url: string }[] {
  const keys = Object.keys(env).filter(key => /^LIFE_CALENDAR_ICS_URL(?:_\d+)?$/.test(key))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  const seen = new Set<string>();
  return keys.flatMap(key => {
    const url = typeof env[key] === 'string' ? env[key].trim() : '';
    if (!url || seen.has(url)) return [];
    seen.add(url);
    return [{ key, url }];
  });
}

async function loadLifeCalendar(feed: string, days: LifeDay[]): Promise<{ state: LifeSourceState; days: LifeDay[] }> {
  try {
    const url = new URL(feed);
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Invalid calendar URL');
    const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(20000), headers: { Accept: 'text/calendar' } });
    if (!response.ok || !response.body) throw new Error('Calendar request failed');
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > 10 * 1024 * 1024) { await reader.cancel(); throw new Error('Calendar exceeds size limit'); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    return { state: 'ready', days: await calendarLifeDays(Buffer.concat(chunks).toString('utf8'), days) };
  } catch {
    console.warn('Life calendar feed unavailable; check subscription configuration and connectivity.');
    return { state: 'unavailable', days };
  }
}

async function loadLifeCalendars(days: LifeDay[]): Promise<{ state: LifeSourceState; days: LifeDay[] }> {
  const feeds = lifeCalendarFeeds(trackerRuntime()?.env || {});
  if (!feeds.length) return { state: 'unconfigured', days };
  const merged = days.map(day => ({ ...day, events: [] as LifeEvent[] }));
  let loaded = 0;
  for (let offset = 0; offset < feeds.length; offset += 3) {
    const batch = feeds.slice(offset, offset + 3);
    const results = await Promise.allSettled(batch.map(feed => loadLifeCalendar(feed.url, days)));
    for (const [index, result] of results.entries()) {
      if (result.status !== 'fulfilled' || result.value.state !== 'ready') continue;
      loaded++;
      for (const [dayIndex, day] of result.value.days.entries()) {
        merged[dayIndex].events.push(...day.events.map(event => ({ ...event, id: `${batch[index].key}:${event.id}` })));
      }
    }
  }
  for (const day of merged) day.events.sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.start.localeCompare(b.start));
  return { state: loaded === feeds.length ? 'ready' : loaded ? 'partial' : 'unavailable', days: merged };
}

/** Live, read-only data. No database writes, feed cache or completed-request memoization. */
export async function loadLifeData(now = new Date()): Promise<LifeData> {
  const days = lifeDays(now);
  const [tasks, calendar] = await Promise.all([loadLifeTasks(), loadLifeCalendars(days)]);
  const sorted = tasks.tasks.sort((a, b) => (a.day || '9999').localeCompare(b.day || '9999') ||
    (a.time || '').localeCompare(b.time || '') || b.priority - a.priority || a.title.localeCompare(b.title));
  for (const day of calendar.days) day.tasks = sorted.filter(task => task.day === day.date);
  return { checkedAt: new Date().toISOString(), timeZone: lifeTimeZone, days: calendar.days,
    overdue: sorted.filter(task => task.day && task.day < days[0].date), undated: sorted.filter(task => !task.day),
    tasksState: tasks.state, calendarState: calendar.state };
}
