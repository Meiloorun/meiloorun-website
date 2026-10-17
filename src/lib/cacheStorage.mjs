import { trackerRuntime } from './trackerRuntime.mjs';

// On Railway, TRACKER_DATA_DIR points to a persistent volume; .cache/ lives
// below it. Without that setting, local development uses the repository cache.
async function filePath(path) {
  const root = trackerRuntime()?.cacheRoot;
  if (!root) return path;
  const { resolve } = await import('node:path');
  return resolve(root, path);
}
export async function readCache(path) {
  const storage = trackerRuntime()?.storage;
  if (storage) return storage.get(path);
  path = await filePath(path);
  const { readFile } = await import('node:fs/promises');
  try { return JSON.parse(await readFile(path, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT' || error instanceof SyntaxError) return undefined; throw error; }
}

export async function writeCache(path, value) {
  const storage = trackerRuntime()?.storage;
  if (storage) return storage.put(path, value);
  path = await filePath(path);
  const { mkdir, writeFile, rename } = await import('node:fs/promises');
  const { dirname } = await import('node:path');
  await mkdir(dirname(path), { recursive: true });
  await writeFile(`${path}.tmp`, JSON.stringify(value), { mode: 0o600 });
  await rename(`${path}.tmp`, path);
}
