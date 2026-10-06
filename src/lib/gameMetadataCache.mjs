import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { readCache, writeCache } from './cacheStorage.mjs';
import { trackerDiagnostic } from './trackerRequest.mjs';

const pending = new Map();

/** Private build/server cache. Concurrent requests share work; failed loads are never saved. */
export function cachedGameMetadata(key, maxAge, load, cacheDir = '.cache/igdb') {
  const path = join(cacheDir, `${createHash('sha256').update(key).digest('hex')}.json`);
  if (pending.has(path)) return pending.get(path);
  const task = (async () => {
    let cached;
    try {
      cached = await readCache(path);
      if (cached?.version !== 1 || !Number.isFinite(cached.savedAt) || !('value' in cached)) cached = undefined;
    } catch { /* Missing or malformed caches are rebuilt. */ }
    if (cached && Date.now() - cached.savedAt < maxAge) return cached.value;
    try {
      const value = await load();
      await writeCache(path, { version: 1, savedAt: Date.now(), value });
      return value;
    } catch (error) {
      if (cached) {
        console.warn('IGDB refresh unavailable; using previously cached game metadata.', trackerDiagnostic(error));
        return cached.value;
      }
      throw error;
    }
  })();
  pending.set(path, task);
  return task.finally(() => pending.delete(path));
}
