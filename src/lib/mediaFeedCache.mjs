import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { readCache, writeCache } from './cacheStorage.mjs';
import { trackerDiagnostic } from './trackerRequest.mjs';

const pending = new Map();

/** Cache successful feeds and back off after failures. No request URLs or credentials are saved. */
export function cachedMediaFeed(key, maxAge, load, cacheDir = '.cache/media') {
  const path = join(cacheDir, `${createHash('sha256').update(key).digest('hex')}.json`);
  if (pending.has(path)) return pending.get(path);
  const task = (async () => {
    let cached;
    try {
      cached = await readCache(path);
      if (cached?.version !== 1) cached = undefined;
    } catch { /* A missing or invalid cache can be rebuilt. */ }
    const hasValue = cached && 'value' in cached;
    if (hasValue && Date.now() - cached.savedAt < maxAge) return cached.value;
    if (cached?.retryAfter > Date.now()) {
      if (hasValue) return cached.value;
      throw Object.assign(new Error('Tracker refresh is backing off'), { ...cached.failure, code: 'cache-backoff' });
    }
    const save = value => writeCache(path, value);
    try {
      const value = await load();
      await save({ version: 1, savedAt: Date.now(), value });
      return value;
    } catch (error) {
      // Preserve original snapshot dates; failures never count as successful refreshes.
      const retryDelay = Math.max(300000, Number(error.retryDelay) || 0);
      await save({ ...(hasValue ? cached : { version: 1 }), retryAfter: Date.now() + retryDelay, failure: trackerDiagnostic(error) });
      if (hasValue) {
        console.warn('Tracker refresh unavailable; using its previous cached snapshot.');
        return cached.value;
      }
      throw error;
    }
  })();
  pending.set(path, task);
  return task.finally(() => pending.delete(path));
}
