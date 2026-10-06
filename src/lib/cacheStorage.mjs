import { trackerRuntime } from './trackerRuntime.mjs';

// Node storage is retained for CLI tools/tests. Cloudflare always uses its
// durable storage, never the Worker's temporary filesystem.
export async function readCache(path) {
  const storage = trackerRuntime()?.storage;
  if (storage) return storage.get(path);
  const { readFile } = await import('node:fs/promises');
  try { return JSON.parse(await readFile(path, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT' || error instanceof SyntaxError) return undefined; throw error; }
}

export async function writeCache(path, value) {
  const storage = trackerRuntime()?.storage;
  if (storage) return storage.put(path, value);
  const { mkdir, writeFile, rename } = await import('node:fs/promises');
  const { dirname } = await import('node:path');
  await mkdir(dirname(path), { recursive: true });
  await writeFile(`${path}.tmp`, JSON.stringify(value), { mode: 0o600 });
  await rename(`${path}.tmp`, path);
}
