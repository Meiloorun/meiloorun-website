import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';

const pending = new Map();

/** Private build/server cache. Concurrent requests share work; failed loads are never saved. */
export function cachedGameMetadata(key, maxAge, load, cacheDir = '.cache/igdb') {
  const path = join(cacheDir, `${createHash('sha256').update(key).digest('hex')}.json`);
  if (pending.has(path)) return pending.get(path);
  const task = (async () => {
    let cached;
    try {
      cached = JSON.parse(await readFile(path, 'utf8'));
      if (cached.version !== 1 || !Number.isFinite(cached.savedAt) || !('value' in cached)) cached = undefined;
    } catch { /* Missing or malformed caches are rebuilt. */ }
    if (cached && Date.now() - cached.savedAt < maxAge) return cached.value;
    try {
      const value = await load();
      await mkdir(cacheDir, { recursive: true });
      await writeFile(`${path}.tmp`, JSON.stringify({ version: 1, savedAt: Date.now(), value }));
      await rename(`${path}.tmp`, path);
      return value;
    } catch (error) {
      if (cached) {
        console.warn('IGDB refresh unavailable; using previously cached game metadata.');
        return cached.value;
      }
      throw error;
    }
  })();
  pending.set(path, task);
  return task.finally(() => pending.delete(path));
}
