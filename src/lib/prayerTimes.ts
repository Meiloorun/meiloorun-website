import { parse } from 'node-html-parser';
import { readCache, writeCache } from './cacheStorage.mjs';
import { calendarDateKey } from './dateKeys.ts';

export const prayerTimesSource = 'https://khuddam.org.uk/salat/';
const prayerNames = ['Fajr', 'Zuhr', 'Asr', 'Maghrib', 'Isha'] as const;
type PrayerName = typeof prayerNames[number];
interface PrayerSchedule {
  effectiveFrom: string; sourceNote: string; times: { name: PrayerName; time: string }[];
}
export type PrayerTimesResult = { state: 'ready'; schedule: PrayerSchedule; checkedAt: string } | { state: 'unavailable' };
type PrayerCache = { version: 1; day: string; schedule?: PrayerSchedule; checkedAt?: string; retryAfter?: number };
const cacheKey = 'life/prayer-times/masjid-mubarak-v1';
const pending = new Map<string, Promise<PrayerTimesResult>>();

/** Extract only the named mosque's row; never use geolocation or footer timings. */
export function parseMubarakSchedule(html: string): PrayerSchedule {
  const root = parse(html);
  const heading = root.querySelectorAll('h3').find(node => node.textContent.trim() === 'Masjid Mubarak');
  const row = heading?.closest('.row');
  if (!row || row.querySelectorAll('h3').length !== 1) throw new Error('Mosque section unavailable');
  const sourceNote = row.querySelector('h6')?.textContent.replace(/\s+/g, ' ').trim() || '';
  const date = sourceNote.match(/Times from (\d{1,2})(?:st|nd|rd|th)? ([A-Za-z]+) (\d{4})\b/i);
  const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  const month = date ? months.indexOf(date[2].toLowerCase()) : -1;
  if (!date || month < 0) throw new Error('Schedule date unavailable');
  const value = new Date(Date.UTC(Number(date[3]), month, Number(date[1])));
  if (value.getUTCMonth() !== month || value.getUTCDate() !== Number(date[1])) throw new Error('Invalid schedule date');
  const entries = row.querySelectorAll('ul.timing--shedule li');
  if (entries.length !== 5) throw new Error('Incomplete prayer schedule');
  const times = prayerNames.map(name => {
    const item = entries.find(entry => entry.querySelector('.time--name')?.textContent.trim() === name);
    const match = item?.textContent.replace(/\s+/g, ' ').trim().match(/^(\d{1,2})\s*:\s*(\d{2})\s*(Fajr|Zuhr|Asr|Maghrib|Isha)$/);
    if (!match || Number(match[1]) > 23 || Number(match[2]) > 59 || match[3] !== name) throw new Error('Invalid prayer time');
    return { name, time: `${match[1].padStart(2, '0')}:${match[2]}` };
  });
  return { effectiveFrom: value.toISOString().slice(0, 10), sourceNote, times };
}

/** A successful fetch is reusable only on the same Europe/London calendar date. */
export async function loadPrayerTimes(now = new Date()): Promise<PrayerTimesResult> {
  const day = calendarDateKey(now, 'Europe/London');
  if (pending.has(day)) return pending.get(day)!;
  const task = (async (): Promise<PrayerTimesResult> => {
    try {
      const cached = await readCache(cacheKey) as PrayerCache | undefined;
      if (cached?.version === 1 && cached.day === day) {
        if (cached.schedule && cached.checkedAt) return { state: 'ready', schedule: cached.schedule, checkedAt: cached.checkedAt };
        if (cached.retryAfter && cached.retryAfter > now.getTime()) return { state: 'unavailable' };
      }
      try {
        const response = await fetch(prayerTimesSource, { cache: 'no-store', signal: AbortSignal.timeout(15000), headers: { Accept: 'text/html' } });
        if (!response.ok || !response.body) throw new Error('Prayer source unavailable');
        const reader = response.body.getReader();
        const chunks: Uint8Array[] = [];
        let size = 0;
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > 2 * 1024 * 1024) { await reader.cancel(); throw new Error('Prayer page exceeds size limit'); }
            chunks.push(value);
          }
        } finally { reader.releaseLock(); }
        const schedule = parseMubarakSchedule(Buffer.concat(chunks).toString('utf8'));
        if (schedule.effectiveFrom > day) throw new Error('Published schedule is not effective yet');
        const checkedAt = now.toISOString();
        await writeCache(cacheKey, { version: 1, day, schedule, checkedAt });
        return { state: 'ready', schedule, checkedAt };
      } catch {
        // A new day never falls back to yesterday's result. Retry failures after five minutes.
        await writeCache(cacheKey, { version: 1, day, retryAfter: now.getTime() + 5 * 60000 });
        throw new Error('Prayer times refresh unavailable');
      }
    } catch {
      console.warn('Masjid Mubarak prayer times unavailable; keeping the source link.');
      return { state: 'unavailable' };
    }
  })();
  pending.set(day, task);
  return task.finally(() => pending.delete(day));
}
